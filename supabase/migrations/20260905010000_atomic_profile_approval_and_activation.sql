-- R12 security remediation P1-2: canonical publication prerequisites and
-- atomic ADMIN approval / owner activation.

CREATE OR REPLACE FUNCTION public.profile_publication_prerequisites_satisfied(
  p_profile_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.professional_profiles p
    JOIN public.account_users a ON a.id = p.account_user_id
    WHERE p.id = p_profile_id
      AND a.status = 'ACTIVE'
      AND length(trim(COALESCE(p.stage_name, ''))) >= 2
      AND p.headline IS NOT NULL AND length(trim(p.headline)) >= 5
      AND p.bio IS NOT NULL AND length(trim(p.bio)) >= 20
      AND (
        (p.show_whatsapp = TRUE AND NULLIF(trim(COALESCE(p.whatsapp_phone, '')), '') IS NOT NULL)
        OR (p.show_phone = TRUE AND NULLIF(trim(COALESCE(p.direct_phone, '')), '') IS NOT NULL)
        OR (p.show_telegram = TRUE AND NULLIF(trim(COALESCE(p.telegram_username, '')), '') IS NOT NULL)
      )
      AND EXISTS (
        SELECT 1 FROM public.identity_verifications iv
        WHERE iv.account_user_id = a.id
          AND iv.status = 'VERIFIED'
          AND iv.identity_verified = TRUE
          AND iv.age_verified = TRUE
      )
      AND EXISTS (
        SELECT 1
        FROM public.professional_profile_locations ppl
        JOIN public.marketplace_locations ml ON ml.id = ppl.location_id AND ml.active = TRUE
        JOIN public.cities ci ON ci.id = ml.city_id AND ci.active = TRUE
        WHERE ppl.profile_id = p.id
      )
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
      )
  );
$$;

REVOKE ALL ON FUNCTION public.profile_publication_prerequisites_satisfied(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.profile_publication_prerequisites_satisfied(UUID) TO service_role;

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
JOIN public.account_users a ON a.id = p.account_user_id
JOIN public.professional_profile_locations ppl ON ppl.profile_id = p.id
JOIN public.marketplace_locations ml ON ml.id = ppl.location_id AND ml.active = TRUE
JOIN public.cities ci ON ci.id = ml.city_id AND ci.active = TRUE
WHERE p.status = 'ACTIVE'
  AND p.content_moderation_status = 'APPROVED'
  AND public.profile_publication_prerequisites_satisfied(p.id);

REVOKE ALL ON public.v_publication_eligible_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_publication_eligible_profiles TO service_role;

COMMENT ON VIEW public.v_publication_eligible_profiles IS
  'ACTIVE-only public visibility source using canonical publication prerequisites.';

CREATE OR REPLACE FUNCTION public.admin_approve_and_activate_profile(
  p_profile_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id UUID;
  v_profile RECORD;
  v_now TIMESTAMPTZ := now();
  v_review_id UUID;
  v_snapshot JSONB;
BEGIN
  IF p_notes IS NOT NULL AND length(p_notes) > 1000 THEN
    RAISE EXCEPTION 'INVALID_NOTES: Observações excedem 1000 caracteres.';
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Sessão autenticada necessária.';
  END IF;

  SELECT id INTO v_admin_id
  FROM public.account_users
  WHERE auth_user_id = auth.uid() AND role = 'ADMIN' AND status = 'ACTIVE';
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: Apenas administradores ativos podem aprovar perfis.';
  END IF;

  SELECT id, account_user_id, stage_name, headline, bio, status,
         content_moderation_status, published_at, show_whatsapp,
         whatsapp_phone, show_phone, direct_phone, show_telegram,
         telegram_username
  INTO v_profile
  FROM public.professional_profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND: Perfil não encontrado.'; END IF;
  IF v_profile.status = 'ACTIVE' AND v_profile.content_moderation_status = 'APPROVED' THEN
    RAISE EXCEPTION 'ALREADY_APPROVED: O perfil já está aprovado e ativo.';
  END IF;
  IF v_profile.content_moderation_status = 'REJECTED' THEN
    RAISE EXCEPTION 'ALREADY_REJECTED: O perfil já foi rejeitado.';
  END IF;
  IF v_profile.status = 'SUSPENDED' THEN
    RAISE EXCEPTION 'INVALID_STATE: Perfis suspensos não podem ser aprovados diretamente.';
  END IF;
  IF v_profile.status = 'DRAFT' THEN
    RAISE EXCEPTION 'INVALID_STATE: Perfis em rascunho não podem ser aprovados.';
  END IF;
  IF v_profile.status NOT IN ('READY_FOR_REVIEW', 'ACTIVE') THEN
    RAISE EXCEPTION 'INVALID_STATE: Estado do perfil incompatível com aprovação.';
  END IF;

  -- Lock all currently qualifying dependent records before the final canonical
  -- check so revocation/deactivation cannot race the state mutation.
  PERFORM 1 FROM public.account_users a
    WHERE a.id = v_profile.account_user_id FOR SHARE;
  PERFORM 1 FROM public.identity_verifications iv
    WHERE iv.account_user_id = v_profile.account_user_id
      AND iv.status = 'VERIFIED' AND iv.identity_verified = TRUE AND iv.age_verified = TRUE
    FOR SHARE;
  PERFORM 1 FROM public.professional_profile_locations ppl
    JOIN public.marketplace_locations ml ON ml.id = ppl.location_id
    JOIN public.cities ci ON ci.id = ml.city_id
    WHERE ppl.profile_id = v_profile.id AND ml.active = TRUE AND ci.active = TRUE
    FOR SHARE OF ppl, ml, ci;
  PERFORM 1 FROM public.profile_media pm
    WHERE pm.profile_id = v_profile.id AND pm.status = 'APPROVED'
      AND pm.is_primary = TRUE AND pm.deleted_at IS NULL FOR SHARE;
  PERFORM 1 FROM public.subscriptions s
    JOIN public.plan_entitlements pe ON pe.plan_id = s.plan_id
      AND pe.code = 'PROFILE_PUBLICATION' AND pe.value_bool = TRUE
    WHERE s.account_user_id = v_profile.account_user_id
      AND s.status IN ('ACTIVE', 'PAST_DUE', 'GRACE_PERIOD')
    FOR SHARE OF s, pe;
  PERFORM 1 FROM public.billing_overrides bo
    WHERE bo.account_user_id = v_profile.account_user_id
      AND bo.revoked_at IS NULL AND (bo.expires_at IS NULL OR bo.expires_at > now())
    FOR SHARE;

  IF NOT public.profile_publication_prerequisites_satisfied(v_profile.id) THEN
    RAISE EXCEPTION 'PUBLICATION_GATE_FAILED: O perfil não atende aos critérios de publicação.';
  END IF;

  v_snapshot := jsonb_build_object(
    'stage_name', v_profile.stage_name,
    'headline', v_profile.headline,
    'bio', v_profile.bio,
    'whatsapp_phone', CASE WHEN v_profile.show_whatsapp THEN v_profile.whatsapp_phone ELSE NULL END,
    'direct_phone', CASE WHEN v_profile.show_phone THEN v_profile.direct_phone ELSE NULL END,
    'telegram_username', CASE WHEN v_profile.show_telegram THEN v_profile.telegram_username ELSE NULL END
  );

  UPDATE public.professional_profiles
  SET content_moderation_status = 'APPROVED', status = 'ACTIVE', updated_at = v_now
  WHERE id = v_profile.id;

  INSERT INTO public.profile_moderation_reviews (
    profile_id, reviewer_id, decision, reason_code, notes, content_snapshot
  ) VALUES (
    v_profile.id, v_admin_id, 'APPROVE', NULL, NULLIF(trim(p_notes), ''), v_snapshot
  ) RETURNING id INTO v_review_id;

  UPDATE public.account_users
  SET onboarding_status = 'COMPLETED', onboarding_step = 6, updated_at = v_now
  WHERE id = v_profile.account_user_id;

  RETURN jsonb_build_object('success', TRUE, 'profile_id', v_profile.id,
    'review_id', v_review_id, 'status', 'ACTIVE', 'moderation_status', 'APPROVED');
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_and_activate_profile(UUID, TEXT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_approve_and_activate_profile(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.publish_owned_profile()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account RECORD;
  v_profile RECORD;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED: Sessão autenticada necessária.'; END IF;

  SELECT id, role, status, terms_version, privacy_version INTO v_account
  FROM public.account_users
  WHERE auth_user_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND OR v_account.status <> 'ACTIVE' OR v_account.role <> 'ADVERTISER'
     OR v_account.terms_version IS NULL OR v_account.privacy_version IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: Conta profissional ativa necessária.';
  END IF;

  SELECT id, status, content_moderation_status, published_at INTO v_profile
  FROM public.professional_profiles
  WHERE account_user_id = v_account.id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND: Perfil não encontrado.'; END IF;
  IF v_profile.status = 'ACTIVE' THEN RAISE EXCEPTION 'ALREADY_ACTIVE: O perfil já está ativo.'; END IF;
  IF v_profile.status <> 'READY_FOR_REVIEW' THEN
    RAISE EXCEPTION 'INVALID_STATE: O perfil não está pronto para publicação.';
  END IF;
  IF v_profile.content_moderation_status <> 'APPROVED' THEN
    RAISE EXCEPTION 'MODERATION_REQUIRED: A moderação do perfil ainda não foi aprovada.';
  END IF;

  PERFORM 1 FROM public.identity_verifications iv
    WHERE iv.account_user_id = v_account.id
      AND iv.status = 'VERIFIED' AND iv.identity_verified = TRUE AND iv.age_verified = TRUE
    FOR SHARE;
  PERFORM 1 FROM public.professional_profile_locations ppl
    JOIN public.marketplace_locations ml ON ml.id = ppl.location_id
    JOIN public.cities ci ON ci.id = ml.city_id
    WHERE ppl.profile_id = v_profile.id AND ml.active = TRUE AND ci.active = TRUE
    FOR SHARE OF ppl, ml, ci;
  PERFORM 1 FROM public.profile_media pm
    WHERE pm.profile_id = v_profile.id AND pm.status = 'APPROVED'
      AND pm.is_primary = TRUE AND pm.deleted_at IS NULL FOR SHARE;
  PERFORM 1 FROM public.subscriptions s
    JOIN public.plan_entitlements pe ON pe.plan_id = s.plan_id
      AND pe.code = 'PROFILE_PUBLICATION' AND pe.value_bool = TRUE
    WHERE s.account_user_id = v_account.id
      AND s.status IN ('ACTIVE', 'PAST_DUE', 'GRACE_PERIOD')
    FOR SHARE OF s, pe;
  PERFORM 1 FROM public.billing_overrides bo
    WHERE bo.account_user_id = v_account.id
      AND bo.revoked_at IS NULL AND (bo.expires_at IS NULL OR bo.expires_at > now())
    FOR SHARE;

  IF NOT public.profile_publication_prerequisites_satisfied(v_profile.id) THEN
    RAISE EXCEPTION 'PUBLICATION_GATE_FAILED: O perfil não atende aos critérios de publicação.';
  END IF;

  UPDATE public.professional_profiles
  SET status = 'ACTIVE', updated_at = v_now
  WHERE id = v_profile.id;

  UPDATE public.account_users
  SET onboarding_status = 'COMPLETED', onboarding_step = 6, updated_at = v_now
  WHERE id = v_account.id;

  RETURN jsonb_build_object('success', TRUE, 'profile_id', v_profile.id, 'status', 'ACTIVE');
END;
$$;

REVOKE ALL ON FUNCTION public.publish_owned_profile() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.publish_owned_profile() TO authenticated;
