-- Server-authoritative CLIENT signup. Only app metadata, set by a trusted admin
-- API, may request CLIENT. Public user metadata remains ignored.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role public.user_role := 'ADVERTISER';
  v_account_id uuid;
BEGIN
  IF NEW.raw_app_meta_data ->> 'velvet_account_type' = 'CLIENT' THEN
    v_role := 'CLIENT';
  END IF;

  INSERT INTO public.account_users (
    auth_user_id, role, status, onboarding_status, onboarding_step,
    terms_version, terms_accepted_at, privacy_version, privacy_accepted_at
  ) VALUES (
    NEW.id, v_role, 'ACTIVE',
    CASE WHEN v_role = 'CLIENT' THEN 'COMPLETED' ELSE 'NOT_STARTED' END,
    0, NULL, NULL, NULL, NULL
  )
  ON CONFLICT (auth_user_id) DO NOTHING
  RETURNING id INTO v_account_id;

  IF v_role = 'CLIENT' THEN
    IF v_account_id IS NULL THEN
      SELECT id INTO v_account_id FROM public.account_users
      WHERE auth_user_id = NEW.id AND role = 'CLIENT';
    END IF;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO public.client_memberships (account_id, membership_type)
      VALUES (v_account_id, 'FREE') ON CONFLICT (account_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
