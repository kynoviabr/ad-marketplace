-- =============================================================================
-- Migration: 20260904202500_profile_status_audit_and_atomic_rpc.sql
-- R12.4C1 — Profile Status Audit Event Ledger & Atomic RPC Foundation
-- =============================================================================
-- Creates the canonical append-only audit event ledger for profile status
-- transitions (SUSPEND / REACTIVATE) and the atomic transactional RPC
-- admin_transition_profile_status with session-bound auth.uid() ADMIN
-- authorization, pessimistic row locking, publication gate validation,
-- explicit whitelisted audit snapshot, and published_at preservation.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABLE: professional_profile_status_events (Dedicated Status Event Ledger)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.professional_profile_status_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  actor_account_user_id UUID NOT NULL REFERENCES public.account_users(id),
  action                TEXT NOT NULL CHECK (action IN ('SUSPEND', 'REACTIVATE')),
  from_status           public.profile_status NOT NULL,
  to_status             public.profile_status NOT NULL,
  reason_code           TEXT NOT NULL,
  notes                 TEXT,
  safe_state_snapshot   JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for audit query performance and actor tracking
CREATE INDEX IF NOT EXISTS idx_profile_status_events_profile_id
  ON public.professional_profile_status_events (profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_status_events_actor
  ON public.professional_profile_status_events (actor_account_user_id);

CREATE INDEX IF NOT EXISTS idx_profile_status_events_action
  ON public.professional_profile_status_events (action, created_at DESC);

-- -----------------------------------------------------------------------------
-- 2. IMMUTABILITY TRIGGER: Append-only enforcement (No UPDATE or DELETE)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_profile_status_events_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'A tabela professional_profile_status_events é estritamente imutável (append-only). Não são permitidas alterações ou exclusões.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_status_events_mutation ON public.professional_profile_status_events;
CREATE TRIGGER trg_prevent_profile_status_events_mutation
  BEFORE UPDATE OR DELETE ON public.professional_profile_status_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_status_events_mutation();

-- -----------------------------------------------------------------------------
-- 3. RLS & PERMISSIONS: Defense-in-depth isolation
-- -----------------------------------------------------------------------------

ALTER TABLE public.professional_profile_status_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.professional_profile_status_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.professional_profile_status_events TO service_role;

DROP POLICY IF EXISTS p_profile_status_events_deny_authenticated ON public.professional_profile_status_events;
CREATE POLICY p_profile_status_events_deny_authenticated
  ON public.professional_profile_status_events FOR ALL TO authenticated USING (false);

DROP POLICY IF EXISTS p_profile_status_events_deny_anon ON public.professional_profile_status_events;
CREATE POLICY p_profile_status_events_deny_anon
  ON public.professional_profile_status_events FOR ALL TO anon USING (false);

COMMENT ON TABLE public.professional_profile_status_events IS
  'Immutable append-only audit event ledger for administrative profile status transitions (SUSPEND and REACTIVATE).';

-- -----------------------------------------------------------------------------
-- 4. ATOMIC TRANSACTIONAL RPC: admin_transition_profile_status
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_transition_profile_status(
  p_profile_id          UUID,
  p_action              TEXT,
  p_reason_code         TEXT,
  p_notes               TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id    UUID;
  v_profile     RECORD;
  v_to_status   public.profile_status;
  v_snapshot    JSONB;
  v_now         TIMESTAMPTZ := now();
  v_event_id    UUID;
BEGIN
  -- 1. Validate action parameter
  IF p_action NOT IN ('SUSPEND', 'REACTIVATE') THEN
    RAISE EXCEPTION 'INVALID_ACTION: Ação inválida. Permitido apenas SUSPEND ou REACTIVATE.';
  END IF;

  -- 2. Validate reason code
  IF p_reason_code IS NULL OR length(trim(p_reason_code)) = 0 THEN
    RAISE EXCEPTION 'MISSING_REASON_CODE: Código de motivo é obrigatório.';
  END IF;

  IF length(p_reason_code) > 50 THEN
    RAISE EXCEPTION 'INVALID_REASON_CODE: Código de motivo excede 50 caracteres.';
  END IF;

  IF p_notes IS NOT NULL AND length(p_notes) > 1000 THEN
    RAISE EXCEPTION 'INVALID_NOTES: Observações excedem 1000 caracteres.';
  END IF;

  -- 3. Resolve & Verify ADMIN Actor Authorization strictly from session context (auth.uid())
  -- Fail closed: Anonymous or non-session callers are strictly blocked.
  -- Client-supplied admin account parameters are forbidden.
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

  -- 4. Lock target profile row inside transaction (Pessimistic concurrency protection)
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

  -- 5. Validate current state & state transition guards
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

    -- -------------------------------------------------------------------------
    -- 6. Canonical Publication Gates Check on Reactivation (Fail-closed)
    -- -------------------------------------------------------------------------

    -- Gate 1: Associated Account must be ACTIVE
    IF NOT EXISTS (
      SELECT 1 FROM public.account_users a
      WHERE a.id = v_profile.account_user_id
        AND a.status = 'ACTIVE'
    ) THEN
      RAISE EXCEPTION 'PUBLICATION_GATE_FAILED: A conta associada ao perfil não está ativa.';
    END IF;

    -- Gate 2: KYC identity & age verified (18+)
    IF NOT EXISTS (
      SELECT 1 FROM public.identity_verifications iv
      WHERE iv.account_user_id = v_profile.account_user_id
        AND iv.status = 'VERIFIED'
        AND iv.identity_verified = TRUE
        AND iv.age_verified = TRUE
    ) THEN
      RAISE EXCEPTION 'PUBLICATION_GATE_FAILED: A verificação de identidade e maioridade (KYC) não está aprovada.';
    END IF;

    -- Gate 3: Profile completeness & active contact channel
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

    -- Gate 4: At least one active service location and active city
    IF NOT EXISTS (
      SELECT 1
      FROM public.professional_profile_locations ppl
      JOIN public.marketplace_locations ml ON ml.id = ppl.location_id AND ml.active = TRUE
      JOIN public.cities ci ON ci.id = ml.city_id AND ci.active = TRUE
      WHERE ppl.profile_id = v_profile.id
    ) THEN
      RAISE EXCEPTION 'PUBLICATION_GATE_FAILED: O perfil não possui nenhuma localização ou cidade de atendimento ativa.';
    END IF;

    -- Gate 5: At least one approved, non-deleted primary photo
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

    -- Gate 6: Editorial content moderation must be APPROVED
    IF v_profile.content_moderation_status <> 'APPROVED' THEN
      RAISE EXCEPTION 'PUBLICATION_GATE_FAILED: O conteúdo editorial do perfil não possui aprovação da moderação.';
    END IF;

    -- Gate 7: Active publication entitlement (Subscription or Override)
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
      )
      OR EXISTS (
        SELECT 1
        FROM public.billing_overrides bo
        WHERE bo.account_user_id = v_profile.account_user_id
          AND bo.revoked_at IS NULL
          AND (bo.expires_at IS NULL OR bo.expires_at > now())
      )
    ) THEN
      RAISE EXCEPTION 'PUBLICATION_GATE_FAILED: A conta não possui assinatura ou benefício de publicação ativo.';
    END IF;

    v_to_status := 'ACTIVE'::public.profile_status;
  END IF;

  -- 7. Build safe operational snapshot strictly from explicit database whitelist
  -- Never accept client-supplied snapshot JSON; never include personal, KYC, biometrics or secrets
  v_snapshot := jsonb_build_object(
    'profile_id', v_profile.id,
    'stage_name', v_profile.stage_name,
    'from_status', v_profile.status,
    'to_status', v_to_status,
    'content_moderation_status', v_profile.content_moderation_status,
    'published_at', v_profile.published_at,
    'transition_timestamp', v_now
  );

  -- 8. Atomic Status Mutation
  -- Note: trg_profile_first_published_at automatically preserves OLD.published_at
  UPDATE public.professional_profiles
  SET
    status = v_to_status,
    updated_at = v_now
  WHERE id = v_profile.id;

  -- 9. Insert Immutable Status Event Record in the same transaction
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

  -- 10. Return operational confirmation
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
  'Atomic transactional RPC to SUSPEND or REACTIVATE professional profiles with session-bound auth.uid() ADMIN authorization, row locking, gate validation, and immutable whitelisted audit event logging.';
