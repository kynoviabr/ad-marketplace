-- One-time, server-created intents let the auth trigger distinguish customer
-- signup without trusting caller-controlled role metadata. Additive only.
CREATE TABLE public.client_signup_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  consumed_at timestamptz,
  auth_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_signup_intents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_signup_intents FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.client_signup_intents TO service_role;

CREATE INDEX idx_client_signup_intents_available
  ON public.client_signup_intents (expires_at)
  WHERE consumed_at IS NULL;

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
    WHERE token_hash = encode(digest(v_token, 'sha256'), 'hex')
      AND consumed_at IS NULL
      AND expires_at > now()
    FOR UPDATE;
    IF v_intent_id IS NOT NULL THEN
      v_role := 'CLIENT'::public.user_role;
    END IF;
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
    UPDATE public.client_signup_intents
    SET consumed_at = now(), auth_user_id = NEW.id
    WHERE id = v_intent_id;
    INSERT INTO public.client_memberships (account_id, membership_type)
    VALUES (v_account_id, 'FREE'::public.client_membership_type)
    ON CONFLICT (account_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
