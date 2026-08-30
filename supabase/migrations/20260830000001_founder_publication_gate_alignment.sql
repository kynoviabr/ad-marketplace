-- Velvet Founder publication alignment.
-- READY_FOR_REVIEW is eligible for activation review but is never public.

-- Reconcile legacy/intended primary designations before enforcing the public
-- gate. This only affects profiles that already have approved media but no
-- approved primary, and always chooses the earliest approved photo.
WITH profiles_needing_approved_primary AS (
  SELECT DISTINCT pm.profile_id
  FROM public.profile_media pm
  WHERE pm.status = 'APPROVED'
    AND pm.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.profile_media current_primary
      WHERE current_primary.profile_id = pm.profile_id
        AND current_primary.status = 'APPROVED'
        AND current_primary.is_primary = TRUE
        AND current_primary.deleted_at IS NULL
    )
)
UPDATE public.profile_media pm
SET is_primary = FALSE, updated_at = now()
WHERE pm.is_primary = TRUE
  AND pm.deleted_at IS NULL
  AND pm.profile_id IN (SELECT profile_id FROM profiles_needing_approved_primary);

WITH ranked_approved AS (
  SELECT id, row_number() OVER (
    PARTITION BY profile_id ORDER BY position ASC, created_at ASC, id ASC
  ) AS rank
  FROM public.profile_media
  WHERE status = 'APPROVED'
    AND deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.profile_media current_primary
      WHERE current_primary.profile_id = profile_media.profile_id
        AND current_primary.is_primary = TRUE
        AND current_primary.deleted_at IS NULL
    )
)
UPDATE public.profile_media pm
SET is_primary = TRUE, updated_at = now()
FROM ranked_approved candidate
WHERE candidate.rank = 1
  AND pm.id = candidate.id;

CREATE OR REPLACE VIEW public.v_publication_eligible_profiles
WITH (security_invoker = false)
AS
SELECT
  p.id AS profile_id,
  p.slug AS profile_slug,
  p.account_user_id,
  p.status AS profile_status,
  p.content_moderation_status,
  p.updated_at,
  a.id AS account_id,
  ci.id AS city_id
FROM public.professional_profiles p
JOIN public.account_users a
  ON a.id = p.account_user_id
 AND a.status = 'ACTIVE'
JOIN public.identity_verifications iv
  ON iv.account_user_id = a.id
 AND iv.status = 'VERIFIED'
 AND iv.identity_verified = TRUE
 AND iv.age_verified = TRUE
JOIN public.professional_profile_locations ppl
  ON ppl.profile_id = p.id
JOIN public.marketplace_locations ml
  ON ml.id = ppl.location_id
 AND ml.active = TRUE
JOIN public.cities ci
  ON ci.id = ml.city_id
 AND ci.active = TRUE
WHERE p.status = 'ACTIVE'
  AND length(trim(p.stage_name)) >= 2
  AND p.headline IS NOT NULL
  AND length(trim(p.headline)) >= 5
  AND p.bio IS NOT NULL
  AND length(trim(p.bio)) >= 20
  AND (
    (p.show_whatsapp = TRUE AND NULLIF(trim(p.whatsapp_phone), '') IS NOT NULL)
    OR (p.show_phone = TRUE AND NULLIF(trim(p.direct_phone), '') IS NOT NULL)
    OR (p.show_telegram = TRUE AND NULLIF(trim(p.telegram_username), '') IS NOT NULL)
  )
  AND p.content_moderation_status = 'APPROVED'
  AND EXISTS (
    SELECT 1
    FROM public.profile_media pm
    WHERE pm.profile_id = p.id
      AND pm.status = 'APPROVED'
      AND pm.is_primary = TRUE
      AND pm.deleted_at IS NULL
  )
  AND (
    EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.account_user_id = a.id
        AND s.status IN ('ACTIVE', 'PAST_DUE', 'GRACE_PERIOD')
        AND (
          (s.status = 'ACTIVE' AND (s.current_period_end IS NULL OR s.current_period_end > now()))
          OR s.status = 'PAST_DUE'
          OR (s.status = 'GRACE_PERIOD' AND s.grace_period_end IS NOT NULL AND s.grace_period_end > now())
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.billing_overrides bo
      WHERE bo.account_user_id = a.id
        AND bo.revoked_at IS NULL
        AND (bo.expires_at IS NULL OR bo.expires_at > now())
    )
  );

REVOKE ALL ON public.v_publication_eligible_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_publication_eligible_profiles TO service_role;

COMMENT ON VIEW public.v_publication_eligible_profiles IS
  'Public visibility source of truth. Only ACTIVE profiles satisfying every canonical gate are exposed.';

-- Reconcile primary media during moderation. Approval promotes a deterministic
-- approved primary when the current designation is not publicly usable.
CREATE OR REPLACE FUNCTION public.moderate_media(
  p_media_id UUID,
  p_reviewer_id UUID,
  p_decision TEXT,
  p_reason_code TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_id UUID;
  v_old_status public.media_status;
  v_was_primary BOOLEAN;
  v_next_media_id UUID;
BEGIN
  SELECT profile_id, status, is_primary
  INTO v_profile_id, v_old_status, v_was_primary
  FROM public.profile_media
  WHERE id = p_media_id AND deleted_at IS NULL;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Mídia não encontrada ou excluída.';
  END IF;

  IF p_decision = 'APPROVE' THEN
    IF v_old_status NOT IN ('PENDING_MODERATION', 'QUARANTINED', 'PROCESSING', 'UPLOADING') THEN
      RAISE EXCEPTION 'Mídia em status % não pode ser aprovada diretamente.', v_old_status;
    END IF;
    UPDATE public.profile_media
    SET status = 'APPROVED', approved_at = now(), updated_at = now()
    WHERE id = p_media_id;

    IF NOT EXISTS (
      SELECT 1 FROM public.profile_media
      WHERE profile_id = v_profile_id
        AND status = 'APPROVED'
        AND is_primary = TRUE
        AND deleted_at IS NULL
    ) THEN
      UPDATE public.profile_media
      SET is_primary = FALSE, updated_at = now()
      WHERE profile_id = v_profile_id AND is_primary = TRUE AND deleted_at IS NULL;

      SELECT id INTO v_next_media_id
      FROM public.profile_media
      WHERE profile_id = v_profile_id AND status = 'APPROVED' AND deleted_at IS NULL
      ORDER BY position ASC, created_at ASC, id ASC
      LIMIT 1;

      UPDATE public.profile_media
      SET is_primary = TRUE, updated_at = now()
      WHERE id = v_next_media_id;
    END IF;
  ELSIF p_decision = 'REJECT' THEN
    UPDATE public.profile_media
    SET status = 'REJECTED', approved_at = NULL, is_primary = FALSE, updated_at = now()
    WHERE id = p_media_id;
  ELSIF p_decision = 'QUARANTINE' THEN
    UPDATE public.profile_media
    SET status = 'QUARANTINED', approved_at = NULL, is_primary = FALSE, updated_at = now()
    WHERE id = p_media_id;
    IF p_reason_code = 'UNDERAGE_SUSPICION' THEN
      UPDATE public.professional_profiles
      SET content_moderation_status = 'FLAGGED', updated_at = now()
      WHERE id = v_profile_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Decisão de moderação inválida: %', p_decision;
  END IF;

  INSERT INTO public.media_moderation_reviews (
    media_id, reviewer_id, review_source, decision, reason_code, notes
  ) VALUES (
    p_media_id, p_reviewer_id, 'ADMIN', p_decision, p_reason_code, p_notes
  );

  IF v_was_primary AND p_decision IN ('REJECT', 'QUARANTINE') THEN
    SELECT id INTO v_next_media_id
    FROM public.profile_media
    WHERE profile_id = v_profile_id AND status = 'APPROVED' AND deleted_at IS NULL
    ORDER BY position ASC, created_at ASC, id ASC
    LIMIT 1;
    IF v_next_media_id IS NOT NULL THEN
      UPDATE public.profile_media SET is_primary = TRUE, updated_at = now()
      WHERE id = v_next_media_id;
    END IF;
  END IF;

  UPDATE public.professional_profiles SET updated_at = now() WHERE id = v_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_media(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_media(UUID, UUID, TEXT, TEXT, TEXT) TO service_role;
