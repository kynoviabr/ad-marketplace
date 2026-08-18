-- =============================================================================
-- Migration: 20260818000002_identity_verifications.sql
-- FASE 02 — Identity, Age Verification & KYC Foundation
-- =============================================================================
-- Creates the identity_verifications and verification_webhook_events tables.
--
-- DESIGN DECISIONS (FASE 02):
--
-- 1. verification_status Enum:
--    7 business domain states: NOT_STARTED, PENDING, IN_PROGRESS, IN_REVIEW,
--    VERIFIED, REJECTED, EXPIRED.
--    Technical/operational errors are separated into verification_webhook_events.
--
-- 2. Single Active Verification per User:
--    A partial unique index guarantees at database level that an account_user
--    can have at most ONE verification record in an active/non-terminal state
--    ('NOT_STARTED', 'PENDING', 'IN_PROGRESS', 'IN_REVIEW').
--
-- 3. Webhook Idempotency Event Ledger:
--    verification_webhook_events stores provider event IDs with a UNIQUE
--    constraint (provider, provider_event_id) to prevent replay attacks and
--    race conditions at DB level via ON CONFLICT DO NOTHING.
--
-- 4. Defense-in-Depth RLS & Grants (NO DIRECT CLIENT ACCESS):
--    All direct DML privileges (SELECT, INSERT, UPDATE, DELETE) are REVOKED
--    from 'anon' and 'authenticated' roles. All reads and writes must go
--    through server-side DAL/actions using service_role.
--    Deny-all RLS policies are applied as defense-in-depth.
--
-- 5. Data Minimization & Privacy:
--    No raw documents, selfies, biometrics, full DOB or raw CPFs are stored.
--    age_verified strictly indicates document-confirmed age >= 18.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENUMS
-- -----------------------------------------------------------------------------

CREATE TYPE public.verification_status AS ENUM (
  'NOT_STARTED',
  'PENDING',
  'IN_PROGRESS',
  'IN_REVIEW',
  'VERIFIED',
  'REJECTED',
  'EXPIRED'
);

CREATE TYPE public.webhook_processing_status AS ENUM (
  'RECEIVED',
  'PROCESSED',
  'IGNORED',
  'FAILED'
);

-- -----------------------------------------------------------------------------
-- 2. TABLE: identity_verifications
-- -----------------------------------------------------------------------------

CREATE TABLE public.identity_verifications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_user_id       UUID NOT NULL REFERENCES public.account_users(id) ON DELETE CASCADE,
  
  -- Provider details
  provider              TEXT NOT NULL DEFAULT 'didit',
  provider_session_id   TEXT,
  
  -- Domain State
  status                public.verification_status NOT NULL DEFAULT 'NOT_STARTED',
  
  -- Authoritative Invariants (written exclusively server-side upon verified check)
  identity_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  age_verified          BOOLEAN NOT NULL DEFAULT FALSE,
  cpf_verified          BOOLEAN,
  verified_country      TEXT,
  
  -- Timestamps
  started_at            TIMESTAMPTZ,
  submitted_at          TIMESTAMPTZ,
  verified_at           TIMESTAMPTZ,
  expires_at            TIMESTAMPTZ,
  
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_identity_verifications_provider_nonempty 
    CHECK (provider <> ''),
  CONSTRAINT chk_identity_verifications_country_format 
    CHECK (verified_country IS NULL OR length(verified_country) = 2),
  CONSTRAINT chk_identity_verifications_age_requires_identity 
    CHECK (age_verified = FALSE OR identity_verified = TRUE),
  CONSTRAINT uq_identity_verifications_provider_session 
    UNIQUE (provider_session_id)
);

-- Comments
COMMENT ON TABLE public.identity_verifications IS 
  'Stores identity & age verification lifecycle and authoritative outcomes per advertiser.';
COMMENT ON COLUMN public.identity_verifications.age_verified IS 
  'Authoritative invariant: strictly indicates provider confirmed document-verified age >= 18.';

-- Indexes
CREATE INDEX idx_identity_verifications_account_user_id 
  ON public.identity_verifications (account_user_id);

CREATE INDEX idx_identity_verifications_status 
  ON public.identity_verifications (status);

-- Partial Unique Index: Single active verification attempt per user
CREATE UNIQUE INDEX uq_idx_single_active_verification_per_user
  ON public.identity_verifications (account_user_id)
  WHERE status IN ('NOT_STARTED', 'PENDING', 'IN_PROGRESS', 'IN_REVIEW');

-- Trigger: auto-update updated_at using existing public.set_updated_at function
CREATE TRIGGER trg_identity_verifications_updated_at
  BEFORE UPDATE ON public.identity_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. TABLE: verification_webhook_events (Event Ledger)
-- -----------------------------------------------------------------------------

CREATE TABLE public.verification_webhook_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider              TEXT NOT NULL DEFAULT 'didit',
  provider_event_id     TEXT NOT NULL,
  provider_session_id   TEXT,
  event_type            TEXT NOT NULL,
  processing_status     public.webhook_processing_status NOT NULL DEFAULT 'RECEIVED',
  error_message         TEXT,
  
  received_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at          TIMESTAMPTZ,
  
  CONSTRAINT uq_webhook_events_provider_event 
    UNIQUE (provider, provider_event_id)
);

COMMENT ON TABLE public.verification_webhook_events IS 
  'Event ledger for webhook deduplication, idempotency, and audit trail.';

CREATE INDEX idx_webhook_events_session_id 
  ON public.verification_webhook_events (provider_session_id);

CREATE INDEX idx_webhook_events_status 
  ON public.verification_webhook_events (processing_status);

-- -----------------------------------------------------------------------------
-- 4. GRANTS & ROW LEVEL SECURITY (NO DIRECT CLIENT ACCESS)
-- -----------------------------------------------------------------------------

-- Enable RLS on both tables
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_webhook_events ENABLE ROW LEVEL SECURITY;

-- Revoke all direct permissions from untrusted roles
REVOKE ALL ON public.identity_verifications FROM anon, authenticated;
REVOKE ALL ON public.verification_webhook_events FROM anon, authenticated;

-- Grant access strictly to service_role (used server-side by admin client / DAL)
GRANT ALL ON public.identity_verifications TO service_role;
GRANT ALL ON public.verification_webhook_events TO service_role;

-- Deny-all RLS policies as defense-in-depth
CREATE POLICY "identity_verifications_deny_all_public"
  ON public.identity_verifications
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

CREATE POLICY "webhook_events_deny_all_public"
  ON public.verification_webhook_events
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);
