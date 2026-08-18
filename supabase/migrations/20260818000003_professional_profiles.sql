-- =============================================================================
-- Migration: 20260818000003_professional_profiles.sql
-- FASE 03 — Professional Profile Domain
-- =============================================================================
-- Creates the professional_profiles domain table linked 1:1 to account_users.
--
-- DESIGN DECISIONS (FASE 03):
--
-- 1. 1:1 Relationship & Constraints:
--    account_user_id is UNIQUE to enforce exactly one profile per advertiser.
--    slug is UNIQUE globally to provide clean, stable public URL paths.
--
-- 2. Legal vs Public Identity Isolation:
--    stage_name is the public display name. It is NOT unique globally and is
--    NEVER automatically sourced from KYC legal documents.
--
-- 3. Public Age & Privacy:
--    public_age is an optional integer (CHECK >= 18). Full date of birth is
--    NEVER stored in the profile domain.
--
-- 4. Native PostgreSQL ENUMs for Filtering:
--    eye_color, hair_color, hair_length, and body_type use PostgreSQL ENUMs
--    to ensure strict typing and high-performance native B-Tree indexing
--    for FASE 04 search and filtering.
--
-- 5. Visibility Controls:
--    show_* boolean flags allow the professional to control public display
--    of optional physical attributes and contact channels.
--
-- 6. Defense-in-Depth RLS & Grants (NO DIRECT CLIENT WRITE):
--    Direct INSERT, UPDATE, and DELETE are REVOKED from client roles.
--    All mutations must go through server-side Server Actions using service_role.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENUMS
-- -----------------------------------------------------------------------------

CREATE TYPE public.profile_status AS ENUM (
  'DRAFT',
  'READY_FOR_REVIEW',
  'ACTIVE',
  'PAUSED',
  'SUSPENDED'
);

CREATE TYPE public.eye_color AS ENUM (
  'BLACK',
  'BROWN',
  'GREEN',
  'BLUE',
  'HAZEL',
  'OTHER'
);

CREATE TYPE public.hair_color AS ENUM (
  'BLACK',
  'BRUNETTE',
  'BLONDE',
  'REDHEAD',
  'OTHER'
);

CREATE TYPE public.hair_length AS ENUM (
  'SHORT',
  'MEDIUM',
  'LONG',
  'VERY_LONG',
  'BALD'
);

CREATE TYPE public.body_type AS ENUM (
  'SLIM',
  'ATHLETIC',
  'CURVY',
  'AVERAGE',
  'PLUS_SIZE',
  'OTHER'
);

-- -----------------------------------------------------------------------------
-- 2. TABLE: professional_profiles
-- -----------------------------------------------------------------------------

CREATE TABLE public.professional_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_user_id       UUID NOT NULL REFERENCES public.account_users(id) ON DELETE CASCADE,
  
  -- Public Professional Identity
  stage_name            TEXT NOT NULL,
  slug                  TEXT NOT NULL,
  headline              TEXT,
  bio                   TEXT,
  
  -- Public Age (Optional, self-declared, verified 18+ via KYC)
  public_age            INTEGER,
  
  -- Physical Attributes / Normalized Measurements
  height_cm             INTEGER,
  weight_kg             INTEGER,
  bust_cm               INTEGER,
  waist_cm              INTEGER,
  hips_cm               INTEGER,
  eye_color             public.eye_color,
  hair_color            public.hair_color,
  hair_length           public.hair_length,
  body_type             public.body_type,
  has_tattoos           BOOLEAN NOT NULL DEFAULT FALSE,
  has_piercings         BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Spoken Languages
  languages             TEXT[] NOT NULL DEFAULT '{"Português"}',
  
  -- Public Professional Contact Channels (E.164 normalized)
  whatsapp_phone        TEXT,
  direct_phone          TEXT,
  telegram_username     TEXT,
  
  -- Public Visibility Controls (Privacy Toggles)
  show_age              BOOLEAN NOT NULL DEFAULT FALSE,
  show_height           BOOLEAN NOT NULL DEFAULT TRUE,
  show_weight           BOOLEAN NOT NULL DEFAULT FALSE,
  show_measurements     BOOLEAN NOT NULL DEFAULT FALSE,
  show_whatsapp         BOOLEAN NOT NULL DEFAULT TRUE,
  show_phone            BOOLEAN NOT NULL DEFAULT FALSE,
  show_telegram         BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Profile State
  status                public.profile_status NOT NULL DEFAULT 'DRAFT',
  
  -- Timestamps
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Integrity Constraints & Ranges
  CONSTRAINT uq_professional_profiles_account_user 
    UNIQUE (account_user_id),
  CONSTRAINT uq_professional_profiles_slug 
    UNIQUE (slug),
  CONSTRAINT chk_professional_profiles_stage_name_length 
    CHECK (length(trim(stage_name)) >= 2 AND length(stage_name) <= 60),
  CONSTRAINT chk_professional_profiles_slug_format 
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT chk_professional_profiles_headline_length 
    CHECK (headline IS NULL OR length(headline) <= 120),
  CONSTRAINT chk_professional_profiles_bio_length 
    CHECK (bio IS NULL OR length(bio) <= 2000),
  CONSTRAINT chk_professional_profiles_public_age_range 
    CHECK (public_age IS NULL OR (public_age >= 18 AND public_age <= 99)),
  CONSTRAINT chk_professional_profiles_height_range 
    CHECK (height_cm IS NULL OR (height_cm >= 100 AND height_cm <= 250)),
  CONSTRAINT chk_professional_profiles_weight_range 
    CHECK (weight_kg IS NULL OR (weight_kg >= 30 AND weight_kg <= 300)),
  CONSTRAINT chk_professional_profiles_bust_range 
    CHECK (bust_cm IS NULL OR (bust_cm >= 40 AND bust_cm <= 200)),
  CONSTRAINT chk_professional_profiles_waist_range 
    CHECK (waist_cm IS NULL OR (waist_cm >= 30 AND waist_cm <= 200)),
  CONSTRAINT chk_professional_profiles_hips_range 
    CHECK (hips_cm IS NULL OR (hips_cm >= 40 AND hips_cm <= 250))
);

-- Comments
COMMENT ON TABLE public.professional_profiles IS 
  'Stores advertiser professional profiles, public attributes, and visibility settings.';
COMMENT ON COLUMN public.professional_profiles.stage_name IS 
  'Public professional display name. Independent from legal KYC name.';
COMMENT ON COLUMN public.professional_profiles.public_age IS 
  'Optional declared public age (18-99). Full DOB is never stored.';

-- Indexes
CREATE INDEX idx_professional_profiles_slug 
  ON public.professional_profiles (slug);

CREATE INDEX idx_professional_profiles_status 
  ON public.professional_profiles (status);

CREATE INDEX idx_professional_profiles_hair_color 
  ON public.professional_profiles (hair_color) 
  WHERE hair_color IS NOT NULL;

CREATE INDEX idx_professional_profiles_eye_color 
  ON public.professional_profiles (eye_color) 
  WHERE eye_color IS NOT NULL;

CREATE INDEX idx_professional_profiles_body_type 
  ON public.professional_profiles (body_type) 
  WHERE body_type IS NOT NULL;

-- Trigger: auto-update updated_at using existing public.set_updated_at function
CREATE TRIGGER trg_professional_profiles_updated_at
  BEFORE UPDATE ON public.professional_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. GRANTS & ROW LEVEL SECURITY (NO DIRECT CLIENT WRITE)
-- -----------------------------------------------------------------------------

ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;

-- Revoke direct modification privileges from untrusted roles
REVOKE ALL ON public.professional_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.professional_profiles FROM authenticated;

-- Allow authenticated advertisers to read strictly their own profile via RLS
GRANT SELECT ON public.professional_profiles TO authenticated;

-- Grant full access to service_role (used by server actions / DAL)
GRANT ALL ON public.professional_profiles TO service_role;

-- RLS Policies
CREATE POLICY "professional_profiles_select_own"
  ON public.professional_profiles
  FOR SELECT
  TO authenticated
  USING (
    account_user_id IN (
      SELECT id FROM public.account_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "professional_profiles_deny_client_insert"
  ON public.professional_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "professional_profiles_deny_client_update"
  ON public.professional_profiles
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "professional_profiles_deny_client_delete"
  ON public.professional_profiles
  FOR DELETE
  TO authenticated
  USING (false);
