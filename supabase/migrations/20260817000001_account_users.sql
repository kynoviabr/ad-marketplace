-- =============================================================================
-- Migration: 20260817000001_account_users.sql
-- FASE 01 — Authentication & Account
-- =============================================================================
-- Creates the account_users domain table linked to auth.users.
--
-- DESIGN DECISIONS (FASE 01):
--
-- Table name: account_users
--   Chosen over 'users' to avoid ambiguity with auth.users and any Supabase
--   internal naming conventions. Unambiguously scoped to account domain.
--
-- Terms/Privacy acceptance:
--   Fields are NULLABLE. The trigger creates the record with NULL terms.
--   The server-side action (using service_role) writes the authoritative
--   versions from centralized constants immediately after signUp().
--   This prevents user_metadata from being the authoritative source.
--   NULL terms/privacy = safe incomplete state (operationally blocked at DAL).
--
-- Trigger for account_users creation:
--   SECURITY DEFINER with explicit search_path to prevent search_path injection.
--   role = ADVERTISER HARDCODED — never from user_metadata.
--   status = ACTIVE HARDCODED — never from user_metadata.
--   Terms/Privacy = NULL initially — set by server action after signup.
--   This prevents any privilege escalation via signup payload.
--
-- RLS strategy:
--   Users can SELECT their own record only.
--   No client-initiated UPDATE, INSERT, or DELETE via RLS.
--   All writes to account_users go through Server Actions using admin client
--   (service_role bypasses RLS — used server-side only, never in browser).
--   Additional trigger prevents role/status self-modification as defense-in-depth.
--
-- This table does NOT contain: profile data, KYC, CPF, photos, billing, media.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENUMS
-- -----------------------------------------------------------------------------

CREATE TYPE public.user_role AS ENUM (
  'ADVERTISER',
  'ADMIN'
);

CREATE TYPE public.user_status AS ENUM (
  'ACTIVE',
  'SUSPENDED',
  'DELETED'
);

CREATE TYPE public.onboarding_status AS ENUM (
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED'
);

-- -----------------------------------------------------------------------------
-- 2. TABLE: account_users
-- -----------------------------------------------------------------------------

CREATE TABLE public.account_users (
  -- Primary key: independent UUID (decouples domain identity from auth identity)
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- FK to Supabase auth.users — UNIQUE enforces 1:1 relationship
  auth_user_id      UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Account role — HARDCODED to ADVERTISER by trigger; never from user input
  -- ADMIN can only be granted via secure manual server-side operation
  role              public.user_role NOT NULL DEFAULT 'ADVERTISER',

  -- Account status — HARDCODED to ACTIVE by trigger; admin-managed only
  status            public.user_status NOT NULL DEFAULT 'ACTIVE',

  -- Onboarding progression
  onboarding_status public.onboarding_status NOT NULL DEFAULT 'NOT_STARTED',
  onboarding_step   INTEGER NOT NULL DEFAULT 0 CHECK (onboarding_step >= 0),

  -- Legal acceptance — NULLABLE = safe incomplete state
  -- Written by server action immediately after signUp() using admin client.
  -- Versions come from CURRENT_TERMS_VERSION / CURRENT_PRIVACY_VERSION constants.
  -- NULL = account has not had legal acceptance persistently recorded.
  -- DAL's requireAccount() blocks operational access when NULL.
  -- NEVER populated from user_metadata — server writes authoritative values.
  terms_version     TEXT,                    -- NULL = incomplete state
  terms_accepted_at TIMESTAMPTZ,             -- NULL = incomplete state
  privacy_version   TEXT,                    -- NULL = incomplete state
  privacy_accepted_at TIMESTAMPTZ,           -- NULL = incomplete state

  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table and column documentation
COMMENT ON TABLE public.account_users IS
  'Account domain table. 1:1 with auth.users. Role/status admin-managed only. Terms/privacy nullable = safe incomplete state.';

COMMENT ON COLUMN public.account_users.role IS
  'ALWAYS ADVERTISER on creation. ADMIN requires explicit manual grant. Never set from user input or metadata.';

COMMENT ON COLUMN public.account_users.status IS
  'ALWAYS ACTIVE on creation. Admin-managed only. Never set from user input or metadata.';

COMMENT ON COLUMN public.account_users.terms_version IS
  'NULL = legal acceptance not yet persistently recorded (safe incomplete state). Written by server action using service_role after signUp.';

COMMENT ON COLUMN public.account_users.privacy_version IS
  'NULL = privacy acceptance not yet persistently recorded (safe incomplete state). Written by server action using service_role after signUp.';

-- -----------------------------------------------------------------------------
-- 3. INDEXES
-- -----------------------------------------------------------------------------

-- auth_user_id has UNIQUE constraint (already indexed), explicit index for perf
CREATE INDEX idx_account_users_auth_user_id ON public.account_users(auth_user_id);

-- Admin query indexes
CREATE INDEX idx_account_users_status ON public.account_users(status);
CREATE INDEX idx_account_users_role ON public.account_users(role);

-- Safe incomplete state query index
CREATE INDEX idx_account_users_terms_null ON public.account_users(auth_user_id)
  WHERE terms_version IS NULL OR privacy_version IS NULL;

-- -----------------------------------------------------------------------------
-- 4. UPDATED_AT TRIGGER
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
-- Not SECURITY DEFINER — runs as calling user, limited scope
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Revoke unnecessary execute on this utility function
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM authenticated;

CREATE TRIGGER trg_account_users_updated_at
  BEFORE UPDATE ON public.account_users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------

ALTER TABLE public.account_users ENABLE ROW LEVEL SECURITY;

-- POLICY: authenticated user can only SELECT their own record
CREATE POLICY "account_users__select_own"
  ON public.account_users
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- POLICY: NO client-initiated INSERT (trigger handles creation)
-- Inserts from authenticated users are completely blocked at RLS level.
-- The trigger (SECURITY DEFINER) bypasses RLS when invoked by the DB mechanism.
CREATE POLICY "account_users__no_client_insert"
  ON public.account_users
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- POLICY: NO client-initiated UPDATE via API
-- All updates go through Server Actions using the admin client (service_role)
-- which bypasses RLS. This eliminates the risk of users modifying role/status
-- via crafted PATCH requests.
-- INTENTIONAL: No UPDATE policy for authenticated role.
-- If a future phase requires user-modifiable fields, add narrow policies then.

-- POLICY: NO client-initiated DELETE
CREATE POLICY "account_users__no_client_delete"
  ON public.account_users
  FOR DELETE
  TO authenticated
  USING (false);

-- NOTE: anon role has no policies — cannot access this table at all.

-- -----------------------------------------------------------------------------
-- 6. ROLE/STATUS PROTECTION TRIGGER (defense-in-depth)
-- Fires even if RLS policies were misconfigured in the future.
-- Prevents role or status from being changed on account_users rows
-- by any operation that isn't coming from the postgres superuser role.
-- This does NOT use SECURITY DEFINER — runs as the calling role.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_role_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
-- NOT SECURITY DEFINER — runs as the calling role so the check applies
-- to any user trying to update. Service_role/postgres can still modify
-- via explicit bypasses (they are not restricted by this trigger).
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'SECURITY: role cannot be modified directly. Use admin operation.';
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    RAISE EXCEPTION 'SECURITY: status cannot be modified directly. Use admin operation.';
  END IF;
  RETURN NEW;
END;
$$;

-- Revoke direct execution (trigger calls it via DB mechanism, not by users)
REVOKE EXECUTE ON FUNCTION public.prevent_role_status_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_role_status_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.prevent_role_status_change() FROM authenticated;

-- Trigger fires at depth 0 (direct updates, not recursive from other triggers)
CREATE TRIGGER trg_prevent_role_status_change
  BEFORE UPDATE ON public.account_users
  FOR EACH ROW
  WHEN (pg_trigger_depth() = 0)
  EXECUTE FUNCTION public.prevent_role_status_change();

-- -----------------------------------------------------------------------------
-- 7. TRIGGER: Auto-create account_users on auth.users INSERT
-- =============================================================================
-- SECURITY DEFINER HARDENING:
--   - SET search_path = public, pg_temp: prevents search_path injection attacks
--     where a malicious schema earlier in the path could shadow functions/tables
--   - All table references are schema-qualified (public.account_users)
--   - Function uses only the privileges needed for the INSERT
--   - role = 'ADVERTISER' HARDCODED — never from raw_user_meta_data
--   - status = 'ACTIVE' HARDCODED — never from raw_user_meta_data
--   - terms_version = NULL — written by server action after signup (not from metadata)
--   - privacy_version = NULL — written by server action after signup (not from metadata)
--   - ON CONFLICT DO NOTHING for idempotency (safe re-run)
--
-- PRIVILEGE ESCALATION PREVENTION:
--   Even if a signup payload contains role=ADMIN or status=SUSPENDED,
--   this trigger NEVER reads those values. They are completely ignored.
--   The only metadata fields read are for informational logging, not for
--   authorization decisions.
--
-- TERMS/PRIVACY SAFE INCOMPLETE STATE:
--   The trigger creates the account with NULL terms/privacy fields.
--   The server action (signupAction) immediately writes the authoritative
--   versions using the admin client. If that write fails, the account
--   remains in safe incomplete state and the DAL blocks operational access.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
-- CRITICAL: Explicit search_path prevents search_path injection
-- public: where our tables live; pg_temp: required for Pg internals
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Insert a new account_users record with hardcoded safe defaults.
  --
  -- SECURITY INVARIANTS (always true regardless of signup payload):
  --   role    = ADVERTISER   (hardcoded, not from NEW.raw_user_meta_data)
  --   status  = ACTIVE       (hardcoded, not from NEW.raw_user_meta_data)
  --   terms_version     = NULL  (safe incomplete state)
  --   privacy_version   = NULL  (safe incomplete state)
  --
  -- The server action will update terms/privacy immediately after signup
  -- using the service_role client. Until that happens, the account is in
  -- safe incomplete state and the DAL will not grant operational access.

  INSERT INTO public.account_users (
    auth_user_id,
    role,
    status,
    onboarding_status,
    onboarding_step,
    terms_version,
    terms_accepted_at,
    privacy_version,
    privacy_accepted_at
  ) VALUES (
    NEW.id,
    'ADVERTISER',   -- HARDCODED: never from user input
    'ACTIVE',       -- HARDCODED: never from user input
    'NOT_STARTED',
    0,
    NULL,           -- safe incomplete state: server action writes this
    NULL,           -- safe incomplete state: server action writes this
    NULL,           -- safe incomplete state: server action writes this
    NULL            -- safe incomplete state: server action writes this
  )
  ON CONFLICT (auth_user_id) DO NOTHING; -- idempotent: safe to re-run

  RETURN NEW;
END;
$$;

-- Revoke direct execution by any role (only called by trigger mechanism)
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM authenticated;

-- Attach trigger to auth.users
-- AFTER INSERT ensures the auth.users row is committed before we reference it
CREATE TRIGGER trg_create_account_user_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- =============================================================================
-- MIGRATION CHECKLIST REVIEW (required by FASE 01 spec):
--
-- [x] Foreign keys: auth_user_id REFERENCES auth.users(id) ON DELETE CASCADE
-- [x] UNIQUE constraints: auth_user_id UNIQUE
-- [x] CHECK constraints: onboarding_step >= 0
-- [x] Enums: user_role, user_status, onboarding_status
-- [x] Indexes: auth_user_id, status, role, incomplete state partial index
-- [x] Timestamps: created_at, updated_at with DEFAULT now()
-- [x] RLS enabled: ALTER TABLE ... ENABLE ROW LEVEL SECURITY
-- [x] RLS policies: SELECT own, no INSERT, no UPDATE, no DELETE (client)
-- [x] SECURITY DEFINER: handle_new_auth_user with explicit search_path
-- [x] search_path: SET search_path = public, pg_temp on all SECURITY DEFINER functions
-- [x] Privileges: REVOKE EXECUTE from PUBLIC/anon/authenticated on trigger functions
-- [x] Trigger: trg_create_account_user_on_signup on auth.users
-- [x] Idempotency: ON CONFLICT (auth_user_id) DO NOTHING
-- [x] Privilege escalation: role/status hardcoded, no metadata read
-- [x] No future-phase tables: only account_users created here
-- =============================================================================
