-- =============================================================================
-- Migration: 20260818000005_profile_media.sql
-- FASE 05 — Media Management, Photo Upload & Storage Domain
-- =============================================================================
-- Creates the media_status enum, profile_media table, partial unique index for
-- primary photo, hardened RPCs for atomic reordering and primary selection,
-- RLS policies and grants.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENUM: media_status
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_status') THEN
    CREATE TYPE public.media_status AS ENUM (
      'UPLOADING',
      'PROCESSING',
      'PENDING_MODERATION',
      'APPROVED',
      'PROCESSING_FAILED',
      'REJECTED',
      'QUARANTINED',
      'DELETED'
    );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. TABLE: profile_media
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_media (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  storage_path    TEXT NOT NULL UNIQUE,
  status          public.media_status NOT NULL DEFAULT 'UPLOADING',
  position        INTEGER NOT NULL DEFAULT 1,
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  mime_type       TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  width           INTEGER,
  height          INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at     TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT chk_profile_media_mime_type CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  CONSTRAINT chk_profile_media_size CHECK (file_size_bytes > 0 AND file_size_bytes <= 15728640), -- Max 15MB
  CONSTRAINT chk_profile_media_position CHECK (position >= 1)
);

-- Partial Unique Index: Exactly one primary photo per profile among active (non-deleted) media
CREATE UNIQUE INDEX IF NOT EXISTS uq_idx_single_primary_photo_per_profile
  ON public.profile_media (profile_id)
  WHERE is_primary = TRUE AND deleted_at IS NULL;

-- Operational Indexes
CREATE INDEX IF NOT EXISTS idx_profile_media_profile_id
  ON public.profile_media (profile_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profile_media_status
  ON public.profile_media (status);

-- Attach updated_at trigger
DROP TRIGGER IF EXISTS trg_profile_media_updated_at ON public.profile_media;
CREATE TRIGGER trg_profile_media_updated_at
  BEFORE UPDATE ON public.profile_media
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. HARDENED ATOMIC TRANSACTIONAL RPCS
-- -----------------------------------------------------------------------------

-- 3.1. Reorder Profile Media
CREATE OR REPLACE FUNCTION public.reorder_profile_media(
  p_profile_id UUID,
  p_media_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  i INTEGER;
BEGIN
  -- Update positions 1..N based on array order
  FOR i IN 1..array_length(p_media_ids, 1) LOOP
    UPDATE public.profile_media
    SET position = i, updated_at = now()
    WHERE id = p_media_ids[i] AND profile_id = p_profile_id AND deleted_at IS NULL;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_profile_media(UUID, UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_profile_media(UUID, UUID[]) TO service_role;

-- 3.2. Set Primary Profile Media
CREATE OR REPLACE FUNCTION public.set_primary_profile_media(
  p_profile_id UUID,
  p_media_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- 1. Unset previous primary
  UPDATE public.profile_media
  SET is_primary = FALSE, updated_at = now()
  WHERE profile_id = p_profile_id AND is_primary = TRUE AND deleted_at IS NULL;

  -- 2. Set new primary
  UPDATE public.profile_media
  SET is_primary = TRUE, updated_at = now()
  WHERE id = p_media_id AND profile_id = p_profile_id AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.set_primary_profile_media(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_primary_profile_media(UUID, UUID) TO service_role;

-- -----------------------------------------------------------------------------
-- 4. RLS & GRANTS
-- -----------------------------------------------------------------------------

ALTER TABLE public.profile_media ENABLE ROW LEVEL SECURITY;

-- 4.1. Select own photos
DROP POLICY IF EXISTS "profile_media_select_own" ON public.profile_media;
CREATE POLICY "profile_media_select_own"
  ON public.profile_media
  FOR SELECT
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM public.professional_profiles
      WHERE account_user_id IN (
        SELECT id FROM public.account_users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- 4.2. Deny direct client mutations
DROP POLICY IF EXISTS "profile_media_deny_client_insert" ON public.profile_media;
CREATE POLICY "profile_media_deny_client_insert" ON public.profile_media FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "profile_media_deny_client_update" ON public.profile_media;
CREATE POLICY "profile_media_deny_client_update" ON public.profile_media FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "profile_media_deny_client_delete" ON public.profile_media;
CREATE POLICY "profile_media_deny_client_delete" ON public.profile_media FOR DELETE TO authenticated USING (false);

REVOKE ALL ON public.profile_media FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.profile_media FROM authenticated;
GRANT SELECT ON public.profile_media TO authenticated;
GRANT ALL ON public.profile_media TO service_role;
