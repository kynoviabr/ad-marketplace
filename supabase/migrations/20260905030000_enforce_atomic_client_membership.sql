-- =============================================================================
-- Migration: 20260905030000_enforce_atomic_client_membership.sql
-- Pre-PX1 Guardrail I — Database-Owned CLIENT Provisioning Atomicity
-- =============================================================================
-- Invariant: Any account entering or existing with role = 'CLIENT' is guaranteed
-- to possess a canonical client_memberships record within the SAME PostgreSQL
-- transaction.
--
-- Architecture:
-- 1. Trigger function: ensure_client_membership_trigger()
--    - SECURITY DEFINER with fixed search_path = public, pg_temp
--    - Uses NEW.id only
--    - Inserts 'FREE' membership with ON CONFLICT (account_id) DO NOTHING
--    - Preserves existing VIP membership / valid_until without downgrade
-- 2. Trigger on public.account_users:
--    - AFTER INSERT OR UPDATE OF role ON public.account_users
--    - FOR EACH ROW
--    - WHEN (NEW.role = 'CLIENT'::public.user_role)
-- 3. Compatibility update to handle_new_auth_user():
--    - Consolidates membership creation authority into trg_ensure_client_membership
--    - Removes duplicate membership write while preserving intent consumption
-- 4. Safe idempotent backfill:
--    - Inserts FREE membership for any existing CLIENT without a membership
-- =============================================================================

-- 1. Trigger Function
CREATE OR REPLACE FUNCTION public.ensure_client_membership_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.role = 'CLIENT'::public.user_role THEN
    INSERT INTO public.client_memberships (
      account_id,
      membership_type
    ) VALUES (
      NEW.id,
      'FREE'::public.client_membership_type
    )
    ON CONFLICT (account_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Security: Revoke public execution
REVOKE EXECUTE ON FUNCTION public.ensure_client_membership_trigger() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_client_membership_trigger() TO service_role;

-- 2. Bind trigger to public.account_users
DROP TRIGGER IF EXISTS trg_ensure_client_membership ON public.account_users;

CREATE TRIGGER trg_ensure_client_membership
  AFTER INSERT OR UPDATE OF role ON public.account_users
  FOR EACH ROW
  WHEN (NEW.role = 'CLIENT'::public.user_role)
  EXECUTE FUNCTION public.ensure_client_membership_trigger();

-- 3. Consolidate handle_new_auth_user() so it delegates membership creation to trg_ensure_client_membership
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token text;
  v_intent_id uuid;
  v_role public.user_role := 'ADVERTISER'::public.user_role;
  v_account_id uuid;
BEGIN
  v_token := NEW.raw_user_meta_data ->> 'velvet_client_signup_token';
  IF v_token IS NOT NULL THEN
    SELECT id INTO v_intent_id
    FROM public.client_signup_intents
    WHERE token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex')
      AND consumed_at IS NULL
      AND expires_at > now()
    FOR UPDATE;
    IF v_intent_id IS NOT NULL THEN v_role := 'CLIENT'::public.user_role; END IF;
  END IF;

  INSERT INTO public.account_users (
    auth_user_id, role, status, onboarding_status, onboarding_step,
    terms_version, terms_accepted_at, privacy_version, privacy_accepted_at
  ) VALUES (
    NEW.id, v_role, 'ACTIVE'::public.user_status,
    CASE WHEN v_role = 'CLIENT'::public.user_role
      THEN 'COMPLETED'::public.onboarding_status
      ELSE 'NOT_STARTED'::public.onboarding_status
    END,
    0, NULL, NULL, NULL, NULL
  )
  ON CONFLICT (auth_user_id) DO NOTHING
  RETURNING id INTO v_account_id;

  IF v_role = 'CLIENT'::public.user_role AND v_account_id IS NOT NULL THEN
    UPDATE public.client_signup_intents SET consumed_at = now(), auth_user_id = NEW.id WHERE id = v_intent_id;
    -- Note: client_memberships is automatically created by trg_ensure_client_membership on account_users
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;

-- 4. Safe idempotent backfill for any existing partial CLIENT accounts
INSERT INTO public.client_memberships (account_id, membership_type)
SELECT au.id, 'FREE'::public.client_membership_type
FROM public.account_users au
LEFT JOIN public.client_memberships cm ON cm.account_id = au.id
WHERE au.role = 'CLIENT'::public.user_role
  AND cm.account_id IS NULL
ON CONFLICT (account_id) DO NOTHING;

-- 5. Documentation
COMMENT ON FUNCTION public.ensure_client_membership_trigger() IS
  'Guarantees transactional atomicity of client membership creation whenever an account enters role CLIENT. Guardrail I.';
