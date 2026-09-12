-- =============================================================================
-- Migration: 20260912160000_lgpd_lifecycle_execution_foundation.sql
-- LGPD-02B — Synthetic Destructive Lifecycle Execution Ledger & Protection
-- =============================================================================
-- 1. Creates privacy_lifecycle_executions and privacy_lifecycle_execution_events
--    for auditable, append-only lifecycle execution tracking.
-- 2. Decouples foreign keys on audit/review-required tables (DSR, KYC, billing,
--    moderation reviews/events) to ensure their immutable survival when subject
--    account/profile records are deleted.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABLE: privacy_lifecycle_executions
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.privacy_lifecycle_executions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_subject_request_id   UUID REFERENCES public.data_subject_requests(id) ON DELETE SET NULL,
  subject_account_id        UUID,
  subject_email             TEXT,
  plan_fingerprint          TEXT NOT NULL,
  mode                      TEXT NOT NULL DEFAULT 'SYNTHETIC_DESTRUCTIVE',
  status                    TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  current_phase             TEXT NOT NULL DEFAULT 'PLANNED',
  started_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at              TIMESTAMPTZ,
  failure_code              TEXT,
  failure_metadata          JSONB DEFAULT '{}'::jsonb,
  metadata                  JSONB DEFAULT '{}'::jsonb,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.privacy_lifecycle_executions IS
  'Canonical execution ledger for LGPD lifecycle destructive actions.';

-- -----------------------------------------------------------------------------
-- 2. TABLE: privacy_lifecycle_execution_events
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.privacy_lifecycle_execution_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id  UUID NOT NULL REFERENCES public.privacy_lifecycle_executions(id) ON DELETE CASCADE,
  phase         TEXT NOT NULL,
  event_type    TEXT NOT NULL,
  actor         TEXT NOT NULL DEFAULT 'SYSTEM',
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.privacy_lifecycle_execution_events IS
  'Append-only immutable audit trail of lifecycle execution phases and actions.';

-- -----------------------------------------------------------------------------
-- 3. INDEXES
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_privacy_lifecycle_executions_subject
  ON public.privacy_lifecycle_executions(subject_account_id);

CREATE INDEX IF NOT EXISTS idx_privacy_lifecycle_executions_status
  ON public.privacy_lifecycle_executions(status);

CREATE INDEX IF NOT EXISTS idx_privacy_lifecycle_execution_events_exec
  ON public.privacy_lifecycle_execution_events(execution_id, created_at ASC);

-- -----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------

ALTER TABLE public.privacy_lifecycle_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_lifecycle_execution_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'privacy_lifecycle_executions'
      AND policyname = 'Admins can read privacy lifecycle executions'
  ) THEN
    CREATE POLICY "Admins can read privacy lifecycle executions"
      ON public.privacy_lifecycle_executions
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.account_users
          WHERE account_users.auth_user_id = auth.uid()
            AND account_users.role = 'ADMIN'
            AND account_users.status = 'ACTIVE'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'privacy_lifecycle_execution_events'
      AND policyname = 'Admins can read privacy lifecycle execution events'
  ) THEN
    CREATE POLICY "Admins can read privacy lifecycle execution events"
      ON public.privacy_lifecycle_execution_events
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.account_users
          WHERE account_users.auth_user_id = auth.uid()
            AND account_users.role = 'ADMIN'
            AND account_users.status = 'ACTIVE'
        )
      );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5. FOREIGN KEY DECOUPLING & SURVIVAL
-- -----------------------------------------------------------------------------

-- DSR request ledger survival
ALTER TABLE public.data_subject_requests
  ALTER COLUMN requester_account_user_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'data_subject_requests_requester_account_user_id_fkey'
      AND table_name = 'data_subject_requests'
  ) THEN
    ALTER TABLE public.data_subject_requests
      DROP CONSTRAINT data_subject_requests_requester_account_user_id_fkey,
      ADD CONSTRAINT data_subject_requests_requester_account_user_id_fkey
        FOREIGN KEY (requester_account_user_id) REFERENCES public.account_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- DSR events survival
ALTER TABLE public.data_subject_request_events
  ALTER COLUMN actor_account_user_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'data_subject_request_events_actor_account_user_id_fkey'
      AND table_name = 'data_subject_request_events'
  ) THEN
    ALTER TABLE public.data_subject_request_events
      DROP CONSTRAINT data_subject_request_events_actor_account_user_id_fkey,
      ADD CONSTRAINT data_subject_request_events_actor_account_user_id_fkey
        FOREIGN KEY (actor_account_user_id) REFERENCES public.account_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Identity verifications survival (KYC legal retention)
ALTER TABLE public.identity_verifications
  ALTER COLUMN account_user_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'identity_verifications_account_user_id_fkey'
      AND table_name = 'identity_verifications'
  ) THEN
    ALTER TABLE public.identity_verifications
      DROP CONSTRAINT identity_verifications_account_user_id_fkey,
      ADD CONSTRAINT identity_verifications_account_user_id_fkey
        FOREIGN KEY (account_user_id) REFERENCES public.account_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Subscriptions survival (Financial audit retention)
ALTER TABLE public.subscriptions
  ALTER COLUMN account_user_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subscriptions_account_user_id_fkey'
      AND table_name = 'subscriptions'
  ) THEN
    ALTER TABLE public.subscriptions
      DROP CONSTRAINT subscriptions_account_user_id_fkey,
      ADD CONSTRAINT subscriptions_account_user_id_fkey
        FOREIGN KEY (account_user_id) REFERENCES public.account_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Profile moderation reviews survival (Content compliance retention)
ALTER TABLE public.profile_moderation_reviews
  ALTER COLUMN profile_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profile_moderation_reviews_profile_id_fkey'
      AND table_name = 'profile_moderation_reviews'
  ) THEN
    ALTER TABLE public.profile_moderation_reviews
      DROP CONSTRAINT profile_moderation_reviews_profile_id_fkey,
      ADD CONSTRAINT profile_moderation_reviews_profile_id_fkey
        FOREIGN KEY (profile_id) REFERENCES public.professional_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Profile boosts survival (Financial/promotional ledger)
ALTER TABLE public.profile_boosts
  ALTER COLUMN profile_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profile_boosts_profile_id_fkey'
      AND table_name = 'profile_boosts'
  ) THEN
    ALTER TABLE public.profile_boosts
      DROP CONSTRAINT profile_boosts_profile_id_fkey,
      ADD CONSTRAINT profile_boosts_profile_id_fkey
        FOREIGN KEY (profile_id) REFERENCES public.professional_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Media moderation reviews survival
ALTER TABLE public.media_moderation_reviews
  ALTER COLUMN media_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'media_moderation_reviews_media_id_fkey'
      AND table_name = 'media_moderation_reviews'
  ) THEN
    ALTER TABLE public.media_moderation_reviews
      DROP CONSTRAINT media_moderation_reviews_media_id_fkey,
      ADD CONSTRAINT media_moderation_reviews_media_id_fkey
        FOREIGN KEY (media_id) REFERENCES public.profile_media(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Profile video moderation events survival
ALTER TABLE public.profile_video_moderation_events
  ALTER COLUMN video_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profile_video_moderation_events_video_id_fkey'
      AND table_name = 'profile_video_moderation_events'
  ) THEN
    ALTER TABLE public.profile_video_moderation_events
      DROP CONSTRAINT profile_video_moderation_events_video_id_fkey,
      ADD CONSTRAINT profile_video_moderation_events_video_id_fkey
        FOREIGN KEY (video_id) REFERENCES public.profile_videos(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Professional profile status events survival
ALTER TABLE public.professional_profile_status_events
  ALTER COLUMN profile_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'professional_profile_status_events_profile_id_fkey'
      AND table_name = 'professional_profile_status_events'
  ) THEN
    ALTER TABLE public.professional_profile_status_events
      DROP CONSTRAINT professional_profile_status_events_profile_id_fkey,
      ADD CONSTRAINT professional_profile_status_events_profile_id_fkey
        FOREIGN KEY (profile_id) REFERENCES public.professional_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Professional reviews: allow reviewer_account_user_id to be NULL for anonymized authored reviews
ALTER TABLE public.professional_reviews
  ALTER COLUMN reviewer_account_user_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'professional_reviews_reviewer_account_user_id_fkey'
      AND table_name = 'professional_reviews'
  ) THEN
    ALTER TABLE public.professional_reviews
      DROP CONSTRAINT professional_reviews_reviewer_account_user_id_fkey,
      ADD CONSTRAINT professional_reviews_reviewer_account_user_id_fkey
        FOREIGN KEY (reviewer_account_user_id) REFERENCES public.account_users(id) ON DELETE SET NULL;
  END IF;
END $$;
