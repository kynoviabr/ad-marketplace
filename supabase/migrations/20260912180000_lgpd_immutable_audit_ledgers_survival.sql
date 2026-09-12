-- =============================================================================
-- Migration: 20260912180000_lgpd_immutable_audit_ledgers_survival.sql
-- LGPD-02B — Immutable Audit Ledgers Subject Decoupling & Survival
-- =============================================================================
-- In accordance with append-only immutability triggers (prevent_audit_ledger_mutation,
-- prevent_dsr_events_mutation, prevent_profile_status_events_mutation), audit events
-- cannot be updated on parent row deletion.
-- Dropping foreign key constraints from these append-only event ledgers ensures:
-- 1. Subject data can be deleted without FK RESTRICT or SET NULL trigger errors.
-- 2. Audit records survive 100% untouched and immutable for regulatory retention.
-- =============================================================================

ALTER TABLE public.data_subject_request_events
  DROP CONSTRAINT IF EXISTS data_subject_request_events_actor_account_user_id_fkey;

ALTER TABLE public.billing_admin_audit_logs
  DROP CONSTRAINT IF EXISTS billing_admin_audit_logs_actor_account_user_id_fkey,
  DROP CONSTRAINT IF EXISTS billing_admin_audit_logs_target_account_user_id_fkey;

ALTER TABLE public.media_moderation_reviews
  DROP CONSTRAINT IF EXISTS media_moderation_reviews_media_id_fkey;

ALTER TABLE public.profile_moderation_reviews
  DROP CONSTRAINT IF EXISTS profile_moderation_reviews_profile_id_fkey;

ALTER TABLE public.profile_video_moderation_events
  DROP CONSTRAINT IF EXISTS profile_video_moderation_events_video_id_fkey;

ALTER TABLE public.professional_profile_status_events
  DROP CONSTRAINT IF EXISTS professional_profile_status_events_profile_id_fkey;
