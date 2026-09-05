-- R12 security remediation P1-1: align REACTIVATE with the canonical
-- v_publication_eligible_profiles subscription entitlement contract.

CREATE OR REPLACE FUNCTION public.admin_transition_profile_status(
  p_profile_id UUID,
  p_action TEXT,
  p_reason_code TEXT,
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
  v_to_status public.profile_status;
  v_snapshot JSONB;
  v_now TIMESTAMPTZ := now();
  v_event_id UUID;
BEGIN
  IF p_action NOT IN ('SUSPEND', 'REACTIVATE') THEN
    RAISE EXCEPTION 'INVALID_ACTION: Ação inválida. Permitido apenas SUSPEND ou REACTIVATE.';
  END IF;

  IF p_reason_code IS NULL OR length(trim(p_reason_code)) = 0 THEN
    RAISE EXCEPTION 'MISSING_REASON_CODE: Código de motivo é obrigatório.';
  END IF;

  IF length(p_reason_code) > 50 THEN
    RAISE EXCEPTION 'INVALID_REASON_CODE: Código de motivo excede 50 caracteres.';
  END IF;

  IF p_notes IS NOT NULL AND length(p_notes) > 1000 THEN
    RAISE EXCEPTION 'INVALID_NOTES: Observações excedem 1000 caracteres.';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Sessão autenticada necessária.';
  END IF;

  SELECT id INTO v_admin_id
  FROM public.account_users
  WHERE auth_user_id = auth.uid()
    AND role = 'ADMIN'
    AND status = 'ACTIVE';

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: Apenas administradores ativos têm permissão para executar esta operação.';
  END IF;

  SELECT
    id,
    account_user_id,
    stage_name,
    headline,
    bio,
    status,
    content_moderation_status,
    published_at,
    show_whatsapp,
    whatsapp_phone,
    show_phone,
    direct_phone,
    show_telegram,
    telegram_username
  INTO v_profile
  FROM public.professional_profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND: Perfil não encontrado.';
  END IF;

  IF p_action = 'SUSPEND' THEN
    IF v_profile.status = 'SUSPENDED' THEN
      RAISE EXCEPTION 'ALREADY_SUSPENDED: O perfil já se encontra suspenso.';
    END IF;

    IF v_profile.status = 'DRAFT' THEN
      RAISE EXCEPTION 'INVALID_TRANSITION: Perfis em rascunho (DRAFT) não podem ser suspensos.';
    END IF;

    IF v_profile.status = 'READY_FOR_REVIEW' THEN
      RAISE EXCEPTION 'INVALID_TRANSITION: Perfis em revisão (READY_FOR_REVIEW) não podem ser suspensos diretamente.';
    END IF;

    IF v_profile.status <> 'ACTIVE' THEN
      RAISE EXCEPTION 'INVALID_TRANSITION: Apenas perfis ativos podem ser suspensos.';
    END IF;

    v_to_status := 'SUSPENDED'::public.profile_status;

  ELSIF p_action = 'REACTIVATE' THEN
    IF v_profile.status = 'ACTIVE' THEN
      RAISE EXCEPTION 'ALREADY_ACTIVE: O perfil já se encontra ativo.';
    END IF;

    IF v_profile.status <> 'SUSPENDED' THEN
      RAISE EXCEPTION 'INVALID_TRANSITION: Apenas perfis suspensos podem ser reativados.';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.account_users a
      WHERE a.id = v_profile.account_user_id
        AND a.status = 'ACTIVE'
    ) THEN
      RAISE EXCEPTION 'PUBLICATION_GATE_FAILED: A conta associada ao perfil não está ativa.';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.identity_verifications iv
      WHERE iv.account_user_id = v_profile.account_user_id
        AND iv.status = 'VERIFIED'
        AND iv.identity_verified = TRUE
        AND iv.age_verified = TRUE
    ) THEN
      RAISE EXCEPTION 'PUBLICATION_GATE_FAILED: A verificação de identidade e maioridade (KYC) não está aprovada.';
    END IF;

    IF length(trim(COALESCE(v_profile.stage_name, ''))) < 2
       OR v_profile.headline IS NULL
       OR length(trim(v_profile.headline)) < 5
       OR v_profile.bio IS NULL
       OR length(trim(v_profile.bio)) < 20
       OR NOT (
         (v_profile.show_whatsapp = TRUE AND NULLIF(trim(COALESCE(v_profile.whatsapp_phone, '')), '') IS NOT NULL)
         OR (v_profile.show_phone = TRUE AND NULLIF(trim(COALESCE(v_profile.direct_phone, '')), '') IS NOT NULL)
         OR (v_profile.show_telegram = TRUE AND NULLIF(trim(COALESCE(v_profile.telegram_username, '')), '') IS NOT NULL)
       )
    THEN
      RAISE EXCEPTION 'PUBLICATION_GATE_FAILED: Os dados cadastrais ou canais de contato do perfil estão incompletos.';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.professional_profile_locations ppl
      JOIN public.marketplace_locations ml ON ml.id = ppl.location_id AND ml.active = TRUE
      JOIN public.cities ci ON ci.id = ml.city_id AND ci.active = TRUE
      WHERE ppl.profile_id = v_profile.id
    ) THEN
      RAISE EXCEPTION 'PUBLICATION_GATE_FAILED: O perfil não possui nenhuma localização ou cidade de atendimento ativa.';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.profile_media pm
      WHERE pm.profile_id = v_profile.id
        AND pm.status = 'APPROVED'
        AND pm.is_primary = TRUE
        AND pm.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'PUBLICATION_GATE_FAILED: O perfil precisa ter ao menos uma foto aprovada definida como principal.';
    END IF;

    IF v_profile.content_moderation_status <> 'APPROVED' THEN
      RAISE EXCEPTION 'PUBLICATION_GATE_FAILED: O conteúdo editorial do perfil não possui aprovação da moderação.';
    END IF;

    -- Subscription publication is valid only when both its lifecycle window
    -- qualifies and its effective plan explicitly grants PROFILE_PUBLICATION.
    -- The billing override branch intentionally remains identical to the
    -- canonical public eligibility view.
    IF NOT (
      EXISTS (
        SELECT 1
        FROM public.subscriptions s
        WHERE s.account_user_id = v_profile.account_user_id
          AND s.status IN ('ACTIVE', 'PAST_DUE', 'GRACE_PERIOD')
          AND (
            (s.status = 'ACTIVE' AND (s.current_period_end IS NULL OR s.current_period_end > now()))
            OR s.status = 'PAST_DUE'
            OR (s.status = 'GRACE_PERIOD' AND s.grace_period_end IS NOT NULL AND s.grace_period_end > now())
          )
          AND EXISTS (
            SELECT 1
            FROM public.plan_entitlements pe
            WHERE pe.plan_id = s.plan_id
              AND pe.code = 'PROFILE_PUBLICATION'
              AND pe.value_bool = TRUE
          )
      )
      OR EXISTS (
        SELECT 1 FROM public.billing_overrides bo
        WHERE bo.account_user_id = v_profile.account_user_id
          AND bo.revoked_at IS NULL
          AND (bo.expires_at IS NULL OR bo.expires_at > now())
      )
    ) THEN
      RAISE EXCEPTION 'PUBLICATION_GATE_FAILED: A conta não possui assinatura ou benefício de publicação ativo.';
    END IF;

    v_to_status := 'ACTIVE'::public.profile_status;
  END IF;

  v_snapshot := jsonb_build_object(
    'profile_id', v_profile.id,
    'stage_name', v_profile.stage_name,
    'from_status', v_profile.status,
    'to_status', v_to_status,
    'content_moderation_status', v_profile.content_moderation_status,
    'published_at', v_profile.published_at,
    'transition_timestamp', v_now
  );

  UPDATE public.professional_profiles
  SET
    status = v_to_status,
    updated_at = v_now
  WHERE id = v_profile.id;

  INSERT INTO public.professional_profile_status_events (
    profile_id,
    actor_account_user_id,
    action,
    from_status,
    to_status,
    reason_code,
    notes,
    safe_state_snapshot,
    created_at
  ) VALUES (
    v_profile.id,
    v_admin_id,
    p_action,
    v_profile.status,
    v_to_status,
    trim(p_reason_code),
    NULLIF(trim(p_notes), ''),
    v_snapshot,
    v_now
  )
  RETURNING id INTO v_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'profile_id', v_profile.id,
    'action', p_action,
    'from_status', v_profile.status,
    'to_status', v_to_status,
    'actor_id', v_admin_id,
    'event_id', v_event_id,
    'created_at', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_transition_profile_status(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_transition_profile_status(UUID, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.admin_transition_profile_status IS
  'Atomic ADMIN-only SUSPEND/REACTIVATE transition; reactivation uses canonical PROFILE_PUBLICATION plan entitlement or billing override semantics.';
