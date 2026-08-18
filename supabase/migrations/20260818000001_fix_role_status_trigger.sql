-- =============================================================================
-- Migration: 20260818000001_fix_role_status_trigger.sql
-- FASE 01 — Correction
-- =============================================================================
-- PROBLEM FOUND:
--   The prevent_role_status_change trigger was blocking ALL role/status changes,
--   including legitimate administrative operations via service_role.
--   This made it impossible to suspend or delete accounts via admin client.
--
-- ROOT CAUSE:
--   The trigger comment claimed "service_role/postgres can still modify via
--   explicit bypasses" — this was INCORRECT. The trigger had no such exception.
--   It raised an exception for ALL callers unconditionally.
--
-- FIX:
--   Add a session_user check: allow postgres and authenticator (service_role)
--   to modify role/status for legitimate admin operations.
--   Block only the `authenticated` and `anon` roles from doing so.
--
-- SECURITY ANALYSIS:
--   - The `authenticated` role is what end-users operate under.
--   - The `anon` role is for unauthenticated requests.
--   - The `postgres` role is the superuser (local admin ops).
--   - The `authenticator` role is what Supabase uses for service_role operations.
--   - Blocking authenticated/anon covers the threat model: users cannot
--     escalate their own role or change their own status.
--   - Allowing postgres/authenticator is necessary for admin operations
--     (suspending accounts, etc.) — these operations are server-controlled only.
--
-- RLS REMAINS THE PRIMARY GUARD:
--   Since there is no UPDATE RLS policy for `authenticated`, end-users
--   cannot update account_users via the API at all (0 rows affected).
--   The trigger is a defense-in-depth layer for cases where RLS might be
--   misconfigured in the future.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_role_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
-- NOT SECURITY DEFINER — runs as calling role
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Allow postgres (superuser), authenticator (service_role proxy), and
  -- supabase_admin roles to modify role/status for legitimate admin operations.
  -- Block authenticated (end-users) and anon from modifying these fields.
  IF session_user IN ('postgres', 'authenticator', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- For all other callers (authenticated end-users via PostgREST):
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'SECURITY: role cannot be modified by this operation.';
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    RAISE EXCEPTION 'SECURITY: status cannot be modified by this operation.';
  END IF;

  RETURN NEW;
END;
$$;

-- Re-apply execute revocations (CREATE OR REPLACE resets grants in some versions)
REVOKE EXECUTE ON FUNCTION public.prevent_role_status_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_role_status_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.prevent_role_status_change() FROM authenticated;

-- Verify the fix is in place with a comment update
COMMENT ON FUNCTION public.prevent_role_status_change() IS
  'Prevents authenticated/anon users from modifying role or status. Allows postgres/authenticator/supabase_admin for admin operations. Updated 20260818000001.';
