-- 1. Extend user roles
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'CLIENT';

-- 2. Client Memberships
CREATE TYPE public.client_membership_type AS ENUM ('FREE', 'VIP');

CREATE TABLE public.client_memberships (
  account_id UUID PRIMARY KEY REFERENCES public.account_users(id) ON DELETE CASCADE,
  membership_type public.client_membership_type NOT NULL DEFAULT 'FREE',
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their own membership" ON public.client_memberships
  FOR SELECT USING (
    auth.uid() IN (SELECT auth_user_id FROM public.account_users WHERE id = account_id)
  );

-- 3. Audience Control
CREATE TYPE public.audience_setting AS ENUM ('PUBLIC', 'VIP_ONLY');
ALTER TABLE public.professional_profiles ADD COLUMN audience_setting public.audience_setting NOT NULL DEFAULT 'PUBLIC';

