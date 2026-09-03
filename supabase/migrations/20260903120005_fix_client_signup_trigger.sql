-- Correct the enum typing in the server-authoritative signup trigger. This
-- replaces code only; it does not update, delete, or backfill any account.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role public.user_role := 'ADVERTISER'::public.user_role;
  v_account_id uuid;
BEGIN
  IF NEW.raw_app_meta_data ->> 'velvet_account_type' = 'CLIENT' THEN
    v_role := 'CLIENT'::public.user_role;
  END IF;

  INSERT INTO public.account_users (
    auth_user_id, role, status, onboarding_status, onboarding_step,
    terms_version, terms_accepted_at, privacy_version, privacy_accepted_at
  ) VALUES (
    NEW.id,
    v_role,
    'ACTIVE'::public.user_status,
    CASE WHEN v_role = 'CLIENT'::public.user_role
      THEN 'COMPLETED'::public.onboarding_status
      ELSE 'NOT_STARTED'::public.onboarding_status
    END,
    0, NULL, NULL, NULL, NULL
  )
  ON CONFLICT (auth_user_id) DO NOTHING
  RETURNING id INTO v_account_id;

  IF v_role = 'CLIENT'::public.user_role THEN
    IF v_account_id IS NULL THEN
      SELECT id INTO v_account_id FROM public.account_users
      WHERE auth_user_id = NEW.id AND role = 'CLIENT'::public.user_role;
    END IF;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO public.client_memberships (account_id, membership_type)
      VALUES (v_account_id, 'FREE'::public.client_membership_type)
      ON CONFLICT (account_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
