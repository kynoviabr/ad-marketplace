-- 1. Extend user roles
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'CLIENT';

-- 2. Client Memberships
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_membership_type' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.client_membership_type AS ENUM ('FREE', 'VIP');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.client_memberships (
  account_id UUID PRIMARY KEY REFERENCES public.account_users(id) ON DELETE CASCADE,
  membership_type public.client_membership_type NOT NULL DEFAULT 'FREE',
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_memberships ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'client_memberships'
      AND policyname = 'Clients can view their own membership'
  ) THEN
    CREATE POLICY "Clients can view their own membership" ON public.client_memberships
      FOR SELECT TO authenticated USING (
        auth.uid() IN (SELECT auth_user_id FROM public.account_users WHERE id = account_id)
      );
  END IF;
END $$;

REVOKE ALL ON public.client_memberships FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.client_memberships TO authenticated;
GRANT ALL ON public.client_memberships TO service_role;

-- 3. Audience Control
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audience_setting' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.audience_setting AS ENUM ('PUBLIC', 'VIP_ONLY');
  END IF;
END $$;
ALTER TABLE public.professional_profiles ADD COLUMN IF NOT EXISTS audience_setting public.audience_setting NOT NULL DEFAULT 'PUBLIC';
