-- =============================================================================
-- Migration: 20260912200000_lgpd_admin_operations_indexes.sql
-- LGPD-02B.1 — Admin Operations & Reporting Performance Indexes
-- =============================================================================
-- Additive only: Adds dedicated indexes for period filtering and synthetic mode
-- filtering on data_subject_requests and privacy_lifecycle_executions.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_dsr_requests_created_at
  ON public.data_subject_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_privacy_lifecycle_executions_created_at
  ON public.privacy_lifecycle_executions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_privacy_lifecycle_executions_mode
  ON public.privacy_lifecycle_executions (mode);
