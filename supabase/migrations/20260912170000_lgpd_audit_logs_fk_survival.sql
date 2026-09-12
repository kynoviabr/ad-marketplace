-- =============================================================================
-- Migration: 20260912170000_lgpd_audit_logs_fk_survival.sql
-- LGPD-02B — Audit Logs & Override Tables Foreign Key Survival
-- =============================================================================
-- Ensures billing admin audit logs, content reports, and entitlement overrides
-- survive subject account deletion by decoupling foreign keys with ON DELETE SET NULL.
-- =============================================================================

-- 1. billing_admin_audit_logs: detach actor and target on delete so audit records survive
ALTER TABLE public.billing_admin_audit_logs
  ALTER COLUMN actor_account_user_id DROP NOT NULL,
  ALTER COLUMN target_account_user_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'billing_admin_audit_logs_actor_account_user_id_fkey'
      AND table_name = 'billing_admin_audit_logs'
  ) THEN
    ALTER TABLE public.billing_admin_audit_logs
      DROP CONSTRAINT billing_admin_audit_logs_actor_account_user_id_fkey,
      ADD CONSTRAINT billing_admin_audit_logs_actor_account_user_id_fkey
        FOREIGN KEY (actor_account_user_id) REFERENCES public.account_users(id) ON DELETE SET NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'billing_admin_audit_logs_target_account_user_id_fkey'
      AND table_name = 'billing_admin_audit_logs'
  ) THEN
    ALTER TABLE public.billing_admin_audit_logs
      DROP CONSTRAINT billing_admin_audit_logs_target_account_user_id_fkey,
      ADD CONSTRAINT billing_admin_audit_logs_target_account_user_id_fkey
        FOREIGN KEY (target_account_user_id) REFERENCES public.account_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. billing_overrides: granted_by / revoked_by ON DELETE SET NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'billing_overrides_granted_by_fkey'
      AND table_name = 'billing_overrides'
  ) THEN
    ALTER TABLE public.billing_overrides
      DROP CONSTRAINT billing_overrides_granted_by_fkey,
      ADD CONSTRAINT billing_overrides_granted_by_fkey
        FOREIGN KEY (granted_by) REFERENCES public.account_users(id) ON DELETE SET NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'billing_overrides_revoked_by_fkey'
      AND table_name = 'billing_overrides'
  ) THEN
    ALTER TABLE public.billing_overrides
      DROP CONSTRAINT billing_overrides_revoked_by_fkey,
      ADD CONSTRAINT billing_overrides_revoked_by_fkey
        FOREIGN KEY (revoked_by) REFERENCES public.account_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. entitlement_overrides: granted_by / revoked_by ON DELETE SET NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'entitlement_overrides_granted_by_fkey'
      AND table_name = 'entitlement_overrides'
  ) THEN
    ALTER TABLE public.entitlement_overrides
      DROP CONSTRAINT entitlement_overrides_granted_by_fkey,
      ADD CONSTRAINT entitlement_overrides_granted_by_fkey
        FOREIGN KEY (granted_by) REFERENCES public.account_users(id) ON DELETE SET NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'entitlement_overrides_revoked_by_fkey'
      AND table_name = 'entitlement_overrides'
  ) THEN
    ALTER TABLE public.entitlement_overrides
      DROP CONSTRAINT entitlement_overrides_revoked_by_fkey,
      ADD CONSTRAINT entitlement_overrides_revoked_by_fkey
        FOREIGN KEY (revoked_by) REFERENCES public.account_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. content_reports: resolved_by ON DELETE SET NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'content_reports_resolved_by_fkey'
      AND table_name = 'content_reports'
  ) THEN
    ALTER TABLE public.content_reports
      DROP CONSTRAINT content_reports_resolved_by_fkey,
      ADD CONSTRAINT content_reports_resolved_by_fkey
        FOREIGN KEY (resolved_by) REFERENCES public.account_users(id) ON DELETE SET NULL;
  END IF;
END $$;
