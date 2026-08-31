-- Admin Founder entitlement management and explicit publication-plan alignment.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES public.account_users(id),
  ADD COLUMN IF NOT EXISTS grant_source TEXT;

COMMENT ON COLUMN public.subscriptions.granted_by IS
  'Administrative actor that granted an internal/free subscription; NULL for provider-created legacy rows.';
COMMENT ON COLUMN public.subscriptions.grant_source IS
  'Auditable internal grant source such as FOUNDER_LAUNCH; NULL for provider-created legacy rows.';

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
  ON a.id = p.account_user_id AND a.status = 'ACTIVE'
JOIN public.identity_verifications iv
  ON iv.account_user_id = a.id
 AND iv.status = 'VERIFIED'
 AND iv.identity_verified = TRUE
 AND iv.age_verified = TRUE
JOIN public.professional_profile_locations ppl ON ppl.profile_id = p.id
JOIN public.marketplace_locations ml ON ml.id = ppl.location_id AND ml.active = TRUE
JOIN public.cities ci ON ci.id = ml.city_id AND ci.active = TRUE
WHERE p.status = 'ACTIVE'
  AND length(trim(p.stage_name)) >= 2
  AND p.headline IS NOT NULL AND length(trim(p.headline)) >= 5
  AND p.bio IS NOT NULL AND length(trim(p.bio)) >= 20
  AND (
    (p.show_whatsapp = TRUE AND NULLIF(trim(p.whatsapp_phone), '') IS NOT NULL)
    OR (p.show_phone = TRUE AND NULLIF(trim(p.direct_phone), '') IS NOT NULL)
    OR (p.show_telegram = TRUE AND NULLIF(trim(p.telegram_username), '') IS NOT NULL)
  )
  AND p.content_moderation_status = 'APPROVED'
  AND EXISTS (
    SELECT 1 FROM public.profile_media pm
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
        AND EXISTS (
          SELECT 1 FROM public.plan_entitlements pe
          WHERE pe.plan_id = s.plan_id
            AND pe.code = 'PROFILE_PUBLICATION'
            AND pe.value_bool = TRUE
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.billing_overrides bo
      WHERE bo.account_user_id = a.id
        AND bo.revoked_at IS NULL
        AND (bo.expires_at IS NULL OR bo.expires_at > now())
    )
  );

REVOKE ALL ON public.v_publication_eligible_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_publication_eligible_profiles TO service_role;

COMMENT ON VIEW public.v_publication_eligible_profiles IS
  'ACTIVE-only public visibility source; subscriptions must explicitly grant PROFILE_PUBLICATION.';
