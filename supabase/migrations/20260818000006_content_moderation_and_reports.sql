-- =============================================================================
-- Migration: 20260818000006_content_moderation_and_reports.sql
-- FASE 06 — Content Moderation, Reports & Admin Oversight
-- =============================================================================
-- Creates the moderation reviews tables (media and profile), content reports
-- table with target integrity, atomic transactional RPCs, RLS and strict grants.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ALTER TABLE: professional_profiles (Add Editorial Moderation Status)
-- -----------------------------------------------------------------------------

ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS content_moderation_status TEXT NOT NULL DEFAULT 'PENDING'
  CONSTRAINT chk_profile_content_moderation_status CHECK (content_moderation_status IN ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'));

CREATE INDEX IF NOT EXISTS idx_professional_profiles_moderation_status
  ON public.professional_profiles (content_moderation_status);

-- -----------------------------------------------------------------------------
-- 2. TABLE: media_moderation_reviews (Media Review Audit Trail)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.media_moderation_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id        UUID NOT NULL REFERENCES public.profile_media(id) ON DELETE CASCADE,
  reviewer_id     UUID NOT NULL REFERENCES public.account_users(id),
  review_source   TEXT NOT NULL DEFAULT 'HUMAN' CHECK (review_source IN ('HUMAN', 'AUTOMATED', 'ADMIN')),
  decision        TEXT NOT NULL CHECK (decision IN ('APPROVE', 'REJECT', 'QUARANTINE')),
  reason_code     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_moderation_reviews_media_id 
  ON public.media_moderation_reviews (media_id);

CREATE INDEX IF NOT EXISTS idx_media_moderation_reviews_reviewer 
  ON public.media_moderation_reviews (reviewer_id);

-- -----------------------------------------------------------------------------
-- 3. TABLE: profile_moderation_reviews (Profile Content Review Audit Trail)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_moderation_reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  reviewer_id       UUID NOT NULL REFERENCES public.account_users(id),
  decision          TEXT NOT NULL CHECK (decision IN ('APPROVE', 'REJECT', 'FLAG')),
  reason_code       TEXT,
  notes             TEXT,
  content_snapshot  JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_moderation_reviews_profile_id 
  ON public.profile_moderation_reviews (profile_id);

CREATE INDEX IF NOT EXISTS idx_profile_moderation_reviews_reviewer 
  ON public.profile_moderation_reviews (reviewer_id);

-- -----------------------------------------------------------------------------
-- 4. TABLE: content_reports (Public Reports with Target FK Integrity)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.content_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  media_id          UUID REFERENCES public.profile_media(id) ON DELETE CASCADE,
  reason_category   TEXT NOT NULL CHECK (reason_category IN (
    'UNDERAGE_SUSPICION',
    'NON_CONSENSUAL',
    'IMPERSONATION_OR_STOLEN',
    'VIOLENCE_OR_EXPLOITATION',
    'SCAM_OR_FRAUD',
    'MISLEADING_LOCATION',
    'OTHER'
  )),
  description       TEXT,
  reporter_hash     TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED')),
  resolution_action TEXT CHECK (resolution_action IS NULL OR resolution_action IN ('NONE', 'QUARANTINE_MEDIA', 'FLAG_PROFILE', 'DISMISS')),
  resolution_notes  TEXT,
  resolved_by       UUID REFERENCES public.account_users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at       TIMESTAMPTZ,

  CONSTRAINT chk_content_reports_single_target CHECK (
    (profile_id IS NOT NULL AND media_id IS NULL) OR
    (profile_id IS NULL AND media_id IS NOT NULL)
  ),
  CONSTRAINT chk_content_reports_desc_len CHECK (description IS NULL OR length(description) <= 1000)
);

CREATE INDEX IF NOT EXISTS idx_content_reports_profile_id 
  ON public.content_reports (profile_id) WHERE profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_reports_media_id 
  ON public.content_reports (media_id) WHERE media_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_reports_status 
  ON public.content_reports (status);

CREATE INDEX IF NOT EXISTS idx_content_reports_hash_created 
  ON public.content_reports (reporter_hash, created_at);

-- -----------------------------------------------------------------------------
-- 5. ATOMIC TRANSACTIONAL RPCS (Hardened)
-- -----------------------------------------------------------------------------

-- 5.1. RPC: moderate_media
CREATE OR REPLACE FUNCTION public.moderate_media(
  p_media_id    UUID,
  p_reviewer_id UUID,
  p_decision    TEXT,
  p_reason_code TEXT DEFAULT NULL,
  p_notes       TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_id    UUID;
  v_old_status    public.media_status;
  v_was_primary   BOOLEAN;
  v_next_media_id UUID;
BEGIN
  -- 1. Get existing media
  SELECT profile_id, status, is_primary
  INTO v_profile_id, v_old_status, v_was_primary
  FROM public.profile_media
  WHERE id = p_media_id AND deleted_at IS NULL;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Mídia não encontrada ou excluída.';
  END IF;

  -- 2. Validate and execute status transition
  IF p_decision = 'APPROVE' THEN
    IF v_old_status NOT IN ('PENDING_MODERATION', 'QUARANTINED', 'PROCESSING', 'UPLOADING') THEN
      RAISE EXCEPTION 'Mídia em status % não pode ser aprovada diretamente.', v_old_status;
    END IF;

    UPDATE public.profile_media
    SET status = 'APPROVED', approved_at = now(), updated_at = now()
    WHERE id = p_media_id;

  ELSIF p_decision = 'REJECT' THEN
    UPDATE public.profile_media
    SET status = 'REJECTED', approved_at = NULL, is_primary = FALSE, updated_at = now()
    WHERE id = p_media_id;

  ELSIF p_decision = 'QUARANTINE' THEN
    UPDATE public.profile_media
    SET status = 'QUARANTINED', approved_at = NULL, is_primary = FALSE, updated_at = now()
    WHERE id = p_media_id;

    -- If reason is UNDERAGE_SUSPICION, immediately flag the entire profile
    IF p_reason_code = 'UNDERAGE_SUSPICION' THEN
      UPDATE public.professional_profiles
      SET content_moderation_status = 'FLAGGED', updated_at = now()
      WHERE id = v_profile_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Decisão de moderação inválida: %', p_decision;
  END IF;

  -- 3. Record audit trail in media_moderation_reviews
  INSERT INTO public.media_moderation_reviews (
    media_id, reviewer_id, review_source, decision, reason_code, notes
  ) VALUES (
    p_media_id, p_reviewer_id, 'ADMIN', p_decision, p_reason_code, p_notes
  );

  -- 4. Reconcile primary photo if the photo was primary and lost APPROVED status
  IF v_was_primary AND p_decision IN ('REJECT', 'QUARANTINE') THEN
    SELECT id INTO v_next_media_id
    FROM public.profile_media
    WHERE profile_id = v_profile_id AND status = 'APPROVED' AND deleted_at IS NULL
    ORDER BY position ASC, created_at ASC, id ASC
    LIMIT 1;

    IF v_next_media_id IS NOT NULL THEN
      UPDATE public.profile_media
      SET is_primary = TRUE, updated_at = now()
      WHERE id = v_next_media_id;
    END IF;
  END IF;

  -- 5. Update profile updated_at timestamp
  UPDATE public.professional_profiles
  SET updated_at = now()
  WHERE id = v_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_media(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_media(UUID, UUID, TEXT, TEXT, TEXT) TO service_role;

-- 5.2. RPC: moderate_profile
CREATE OR REPLACE FUNCTION public.moderate_profile(
  p_profile_id       UUID,
  p_reviewer_id      UUID,
  p_decision         TEXT,
  p_reason_code      TEXT DEFAULT NULL,
  p_notes            TEXT DEFAULT NULL,
  p_content_snapshot JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_decision NOT IN ('APPROVE', 'REJECT', 'FLAG') THEN
    RAISE EXCEPTION 'Decisão de perfil inválida: %', p_decision;
  END IF;

  UPDATE public.professional_profiles
  SET
    content_moderation_status = CASE
      WHEN p_decision = 'APPROVE' THEN 'APPROVED'
      WHEN p_decision = 'REJECT'  THEN 'REJECTED'
      WHEN p_decision = 'FLAG'    THEN 'FLAGGED'
    END,
    updated_at = now()
  WHERE id = p_profile_id;

  INSERT INTO public.profile_moderation_reviews (
    profile_id, reviewer_id, decision, reason_code, notes, content_snapshot
  ) VALUES (
    p_profile_id, p_reviewer_id, p_decision, p_reason_code, p_notes, p_content_snapshot
  );
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_profile(UUID, UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_profile(UUID, UUID, TEXT, TEXT, TEXT, JSONB) TO service_role;

-- 5.3. RPC: resolve_content_report
CREATE OR REPLACE FUNCTION public.resolve_content_report(
  p_report_id        UUID,
  p_admin_id         UUID,
  p_action           TEXT,
  p_resolution_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_media_id   UUID;
  v_profile_id UUID;
BEGIN
  SELECT media_id, profile_id INTO v_media_id, v_profile_id
  FROM public.content_reports
  WHERE id = p_report_id;

  IF v_media_id IS NULL AND v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Denúncia não encontrada.';
  END IF;

  IF p_action = 'QUARANTINE_MEDIA' AND v_media_id IS NOT NULL THEN
    PERFORM public.moderate_media(v_media_id, p_admin_id, 'QUARANTINE', 'REPORT_CONFIRMED', p_resolution_notes);
  ELSIF p_action = 'FLAG_PROFILE' AND v_profile_id IS NOT NULL THEN
    PERFORM public.moderate_profile(v_profile_id, p_admin_id, 'FLAG', 'REPORT_CONFIRMED', p_resolution_notes, '{}'::JSONB);
  END IF;

  UPDATE public.content_reports
  SET
    status = CASE WHEN p_action = 'DISMISS' THEN 'DISMISSED' ELSE 'RESOLVED' END,
    resolution_action = p_action,
    resolution_notes = p_resolution_notes,
    resolved_by = p_admin_id,
    resolved_at = now()
  WHERE id = p_report_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_content_report(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_content_report(UUID, UUID, TEXT, TEXT) TO service_role;

-- -----------------------------------------------------------------------------
-- 6. RLS & GRANTS MATRIX
-- -----------------------------------------------------------------------------

ALTER TABLE public.media_moderation_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_moderation_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.media_moderation_reviews FROM anon, authenticated;
REVOKE ALL ON public.profile_moderation_reviews FROM anon, authenticated;
REVOKE ALL ON public.content_reports FROM anon, authenticated;

GRANT ALL ON public.media_moderation_reviews TO service_role;
GRANT ALL ON public.profile_moderation_reviews TO service_role;
GRANT ALL ON public.content_reports TO service_role;
