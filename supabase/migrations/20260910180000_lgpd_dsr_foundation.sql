-- =============================================================================
-- Migration: 20260910180000_lgpd_dsr_foundation.sql
-- LGPD-01 — Data Subject Rights (DSR) Ledger & Event Audit Foundation
-- =============================================================================
-- Creates the canonical request ledger (data_subject_requests) and append-only
-- audit event ledger (data_subject_request_events) for managing data subject
-- rights under the Brazilian General Data Protection Law (LGPD / Lei 13.709/2018).
--
-- DESIGN PRINCIPLES:
-- 1. Fail-Closed Security: Direct client DML is REVOKED.
-- 2. Authenticated Self-Service: Subjects can query only their own requests via RLS.
-- 3. Immutability: Events table is strictly append-only (prevent UPDATE/DELETE).
-- 4. Audit Retention: Requests use RESTRICT on account_users to prevent silent deletion.
-- 5. Non-Destructive: Request creation NEVER triggers automatic account or data deletion.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENUMS / TYPES
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dsr_request_type' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.dsr_request_type AS ENUM (
      'ACCESS',
      'CORRECTION',
      'ANONYMIZATION',
      'BLOCKING',
      'DELETION',
      'PORTABILITY',
      'CONSENT_REVOCATION',
      'SHARING_INFORMATION',
      'AUTOMATED_DECISION_REVIEW'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dsr_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.dsr_status AS ENUM (
      'RECEIVED',
      'IDENTITY_VERIFICATION_REQUIRED',
      'IN_REVIEW',
      'PROCESSING',
      'COMPLETED',
      'REJECTED',
      'CANCELLED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dsr_event_type' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.dsr_event_type AS ENUM (
      'REQUEST_CREATED',
      'IDENTITY_VERIFIED',
      'REVIEW_STARTED',
      'PROCESSING_STARTED',
      'REQUEST_COMPLETED',
      'REQUEST_REJECTED',
      'REQUEST_CANCELLED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dsr_actor_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.dsr_actor_role AS ENUM (
      'SUBJECT',
      'ADMIN',
      'SYSTEM'
    );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. TABLE: data_subject_requests
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.data_subject_requests (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_account_user_id UUID NOT NULL REFERENCES public.account_users(id) ON DELETE RESTRICT,
  request_type              public.dsr_request_type NOT NULL,
  status                    public.dsr_status NOT NULL DEFAULT 'RECEIVED',
  details                   JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolution_code           TEXT CHECK (resolution_code IS NULL OR length(resolution_code) <= 100),
  resolution_notes          TEXT CHECK (resolution_notes IS NULL OR length(resolution_notes) <= 2000),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at              TIMESTAMPTZ,
  cancelled_at              TIMESTAMPTZ
);

COMMENT ON TABLE public.data_subject_requests IS
  'Canonical ledger of Data Subject Requests under LGPD (Lei 13.709/2018).';
COMMENT ON COLUMN public.data_subject_requests.resolution_notes IS
  'Internal operator / admin notes. Must never be exposed to non-admin clients.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dsr_requester_account
  ON public.data_subject_requests (requester_account_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsr_status_created
  ON public.data_subject_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsr_type_created
  ON public.data_subject_requests (request_type, created_at DESC);

-- Partial Unique Index: Prevent concurrent duplicate active requests of the same type
CREATE UNIQUE INDEX IF NOT EXISTS uq_idx_active_dsr_per_type
  ON public.data_subject_requests (requester_account_user_id, request_type)
  WHERE status IN ('RECEIVED', 'IDENTITY_VERIFICATION_REQUIRED', 'IN_REVIEW', 'PROCESSING');

-- Trigger: auto-update updated_at
CREATE TRIGGER trg_dsr_updated_at
  BEFORE UPDATE ON public.data_subject_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. TABLE: data_subject_request_events (Append-only Audit Ledger)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.data_subject_request_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id            UUID NOT NULL REFERENCES public.data_subject_requests(id) ON DELETE CASCADE,
  event_type            public.dsr_event_type NOT NULL,
  actor_account_user_id UUID NOT NULL REFERENCES public.account_users(id),
  actor_role            public.dsr_actor_role NOT NULL,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.data_subject_request_events IS
  'Strictly append-only audit event ledger for all DSR lifecycle actions.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dsr_events_request_id
  ON public.data_subject_request_events (request_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_dsr_events_actor
  ON public.data_subject_request_events (actor_account_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsr_events_type
  ON public.data_subject_request_events (event_type, created_at DESC);

-- -----------------------------------------------------------------------------
-- 4. IMMUTABILITY TRIGGER: Append-only enforcement for events
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_dsr_events_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'A tabela data_subject_request_events é estritamente imutável (append-only). Não são permitidas alterações ou exclusões.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_dsr_events_mutation ON public.data_subject_request_events;
CREATE TRIGGER trg_prevent_dsr_events_mutation
  BEFORE UPDATE OR DELETE ON public.data_subject_request_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_dsr_events_mutation();

-- -----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) & PRIVILEGES
-- -----------------------------------------------------------------------------

ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_subject_request_events ENABLE ROW LEVEL SECURITY;

-- Revoke all direct client DML privileges
REVOKE ALL ON public.data_subject_requests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.data_subject_request_events FROM PUBLIC, anon, authenticated;

-- Service role has full access (used by server actions / DAL)
GRANT ALL ON public.data_subject_requests TO service_role;
GRANT ALL ON public.data_subject_request_events TO service_role;

-- Authenticated subjects may SELECT only their own requests
GRANT SELECT ON public.data_subject_requests TO authenticated;

DROP POLICY IF EXISTS "Subjects can view their own DSR requests" ON public.data_subject_requests;
CREATE POLICY "Subjects can view their own DSR requests"
  ON public.data_subject_requests
  FOR SELECT TO authenticated
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM public.account_users WHERE id = requester_account_user_id
    )
  );

-- Authenticated subjects may SELECT events for their own requests
GRANT SELECT ON public.data_subject_request_events TO authenticated;

DROP POLICY IF EXISTS "Subjects can view events of their own DSR requests" ON public.data_subject_request_events;
CREATE POLICY "Subjects can view events of their own DSR requests"
  ON public.data_subject_request_events
  FOR SELECT TO authenticated
  USING (
    request_id IN (
      SELECT dsr.id FROM public.data_subject_requests dsr
      INNER JOIN public.account_users au ON au.id = dsr.requester_account_user_id
      WHERE au.auth_user_id = auth.uid()
    )
  );
