-- =============================================================================
-- Migration: 20260907170000_px7_cybersecurity_hardening.sql
-- PX7 — Cybersecurity & Abuse Intelligence
-- =============================================================================
-- 1. Distributed Rate Limiting Infrastructure (Backlog Item G)
-- 2. Audit Ledger Immutability Triggers (Backlog Item C)
-- 3. Security-Sensitive Atomic Mutation RPCs (Backlog Item B)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. DISTRIBUTED RATE LIMITING INFRASTRUCTURE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.distributed_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_distributed_rate_limits_expires_at
  ON public.distributed_rate_limits (expires_at);

ALTER TABLE public.distributed_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.distributed_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.distributed_rate_limits TO service_role;

COMMENT ON TABLE public.distributed_rate_limits IS
  'Distributed atomic rate limit tracking storage for multi-instance Next.js/Vercel environments.';

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_expires_at TIMESTAMPTZ := v_now + (p_window_seconds || ' seconds')::INTERVAL;
  v_count INTEGER;
BEGIN
  -- Probabilistic cleanup (1% chance per call) to keep the table compact
  IF random() < 0.01 THEN
    DELETE FROM public.distributed_rate_limits
    WHERE expires_at < v_now;
  END IF;

  INSERT INTO public.distributed_rate_limits (bucket_key, hits, expires_at)
  VALUES (p_key, 1, v_expires_at)
  ON CONFLICT (bucket_key) DO UPDATE
  SET
    hits = CASE
      WHEN distributed_rate_limits.expires_at < v_now THEN 1
      ELSE distributed_rate_limits.hits + 1
    END,
    expires_at = CASE
      WHEN distributed_rate_limits.expires_at < v_now THEN v_expires_at
      ELSE distributed_rate_limits.expires_at
    END
  RETURNING hits INTO v_count;

  -- Returns TRUE if limit exceeded (BLOCKED), FALSE if allowed
  RETURN (v_count > p_limit);
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;

-- -----------------------------------------------------------------------------
-- 2. AUDIT LEDGER IMMUTABILITY TRIGGERS (Backlog Item C)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_audit_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'A tabela de auditoria % é estritamente imutável (append-only). Não são permitidas alterações ou exclusões.', TG_TABLE_NAME;
END;
$$;

-- Apply append-only enforcement to all audit and review event ledgers
DROP TRIGGER IF EXISTS trg_prevent_billing_admin_audit_logs_mutation ON public.billing_admin_audit_logs;
CREATE TRIGGER trg_prevent_billing_admin_audit_logs_mutation
  BEFORE UPDATE OR DELETE ON public.billing_admin_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_ledger_mutation();

DROP TRIGGER IF EXISTS trg_prevent_media_moderation_reviews_mutation ON public.media_moderation_reviews;
CREATE TRIGGER trg_prevent_media_moderation_reviews_mutation
  BEFORE UPDATE OR DELETE ON public.media_moderation_reviews
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_ledger_mutation();

DROP TRIGGER IF EXISTS trg_prevent_profile_moderation_reviews_mutation ON public.profile_moderation_reviews;
CREATE TRIGGER trg_prevent_profile_moderation_reviews_mutation
  BEFORE UPDATE OR DELETE ON public.profile_moderation_reviews
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_ledger_mutation();

DROP TRIGGER IF EXISTS trg_prevent_profile_video_moderation_events_mutation ON public.profile_video_moderation_events;
CREATE TRIGGER trg_prevent_profile_video_moderation_events_mutation
  BEFORE UPDATE OR DELETE ON public.profile_video_moderation_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_ledger_mutation();

DROP TRIGGER IF EXISTS trg_prevent_professional_review_moderation_events_mutation ON public.professional_review_moderation_events;
CREATE TRIGGER trg_prevent_professional_review_moderation_events_mutation
  BEFORE UPDATE OR DELETE ON public.professional_review_moderation_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_ledger_mutation();

-- Webhook events prevent deletion
CREATE OR REPLACE FUNCTION public.prevent_webhook_event_deletion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Registros da tabela de webhook % não podem ser excluídos.', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_billing_webhook_events_deletion ON public.billing_webhook_events;
CREATE TRIGGER trg_prevent_billing_webhook_events_deletion
  BEFORE DELETE ON public.billing_webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_webhook_event_deletion();

DROP TRIGGER IF EXISTS trg_prevent_verification_webhook_events_deletion ON public.verification_webhook_events;
CREATE TRIGGER trg_prevent_verification_webhook_events_deletion
  BEFORE DELETE ON public.verification_webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_webhook_event_deletion();

-- -----------------------------------------------------------------------------
-- 3. SECURITY-SENSITIVE ATOMIC MUTATION RPCS (Backlog Item B)
-- -----------------------------------------------------------------------------

-- 3.1 Toggle Client VIP Membership + Audit Log
CREATE OR REPLACE FUNCTION public.admin_toggle_client_vip(
  p_actor_account_user_id UUID,
  p_target_account_user_id UUID,
  p_membership_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_role public.user_role;
  v_target_role public.user_role;
  v_now TIMESTAMPTZ := now();
  v_audit_id UUID;
BEGIN
  -- 1. Validate actor is ADMIN
  SELECT role INTO v_actor_role FROM public.account_users WHERE id = p_actor_account_user_id AND status = 'ACTIVE';
  IF v_actor_role IS NULL OR v_actor_role != 'ADMIN' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores ativos podem alterar membros VIP.';
  END IF;

  -- 2. Validate target is CLIENT
  SELECT role INTO v_target_role FROM public.account_users WHERE id = p_target_account_user_id;
  IF v_target_role IS NULL OR v_target_role != 'CLIENT' THEN
    RAISE EXCEPTION 'Conta de destino inválida: o usuário deve possuir papel CLIENT.';
  END IF;

  -- 3. Upsert client membership
  INSERT INTO public.client_memberships (account_id, membership_type, updated_at)
  VALUES (p_target_account_user_id, p_membership_type::public.client_membership_type, v_now)
  ON CONFLICT (account_id) DO UPDATE
  SET membership_type = EXCLUDED.membership_type, updated_at = v_now;

  -- 4. Atomically insert audit log
  INSERT INTO public.billing_admin_audit_logs (
    actor_account_user_id,
    target_account_user_id,
    action,
    metadata
  )
  VALUES (
    p_actor_account_user_id,
    p_target_account_user_id,
    CASE WHEN p_membership_type = 'VIP' THEN 'ENTITLEMENT_OVERRIDE_GRANTED' ELSE 'ENTITLEMENT_OVERRIDE_REVOKED' END,
    jsonb_build_object('override_type', 'VIP_MEMBERSHIP', 'new_membership_type', p_membership_type)
  )
  RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object(
    'success', true,
    'account_id', p_target_account_user_id,
    'membership_type', p_membership_type,
    'audit_id', v_audit_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_toggle_client_vip FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_client_vip TO service_role;

-- 3.2 Set Profile Audience (PUBLIC / VIP_ONLY) + Audit Log
CREATE OR REPLACE FUNCTION public.admin_set_profile_audience(
  p_actor_account_user_id UUID,
  p_profile_id UUID,
  p_audience_setting TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_role public.user_role;
  v_target_account_id UUID;
  v_old_audience TEXT;
  v_audit_id UUID;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- 1. Validate actor is ADMIN
  SELECT role INTO v_actor_role FROM public.account_users WHERE id = p_actor_account_user_id AND status = 'ACTIVE';
  IF v_actor_role IS NULL OR v_actor_role != 'ADMIN' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores ativos podem alterar controle de audiência.';
  END IF;

  IF p_audience_setting NOT IN ('PUBLIC', 'VIP_ONLY') THEN
    RAISE EXCEPTION 'Configuração de audiência inválida: deve ser PUBLIC ou VIP_ONLY.';
  END IF;

  -- 2. Validate profile and lock row
  SELECT account_user_id, audience_setting INTO v_target_account_id, v_old_audience
  FROM public.professional_profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF v_target_account_id IS NULL THEN
    RAISE EXCEPTION 'Perfil não encontrado.';
  END IF;

  -- 3. Update audience
  UPDATE public.professional_profiles
  SET audience_setting = p_audience_setting::public.audience_setting, updated_at = v_now
  WHERE id = p_profile_id;

  -- 4. Atomically insert audit log
  INSERT INTO public.billing_admin_audit_logs (
    actor_account_user_id,
    target_account_user_id,
    action,
    metadata
  )
  VALUES (
    p_actor_account_user_id,
    v_target_account_id,
    CASE WHEN p_audience_setting = 'VIP_ONLY' THEN 'ENTITLEMENT_OVERRIDE_GRANTED' ELSE 'ENTITLEMENT_OVERRIDE_REVOKED' END,
    jsonb_build_object(
      'profile_id', p_profile_id,
      'old_audience_setting', v_old_audience,
      'new_audience_setting', p_audience_setting
    )
  )
  RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object(
    'success', true,
    'profile_id', p_profile_id,
    'audience_setting', p_audience_setting,
    'audit_id', v_audit_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_profile_audience FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_profile_audience TO service_role;

-- 3.3 Moderate Video + Audit Event
CREATE OR REPLACE FUNCTION public.admin_moderate_video(
  p_actor_account_user_id UUID,
  p_video_id UUID,
  p_decision TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_role public.user_role;
  v_status TEXT;
  v_now TIMESTAMPTZ := now();
  v_event_id UUID;
BEGIN
  -- 1. Validate actor is ADMIN
  SELECT role INTO v_actor_role FROM public.account_users WHERE id = p_actor_account_user_id AND status = 'ACTIVE';
  IF v_actor_role IS NULL OR v_actor_role != 'ADMIN' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores ativos podem moderar vídeos.';
  END IF;

  IF p_decision NOT IN ('APPROVE', 'REJECT') THEN
    RAISE EXCEPTION 'Decisão inválida: deve ser APPROVE ou REJECT.';
  END IF;

  v_status := CASE WHEN p_decision = 'APPROVE' THEN 'APPROVED' ELSE 'REJECTED' END;

  -- 2. Update profile_videos with row lock
  UPDATE public.profile_videos
  SET
    status = v_status,
    moderated_by = p_actor_account_user_id,
    moderation_reason = p_reason,
    moderated_at = v_now,
    approved_at = CASE WHEN v_status = 'APPROVED' THEN v_now ELSE approved_at END,
    updated_at = v_now
  WHERE id = p_video_id AND status = 'PENDING_MODERATION';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vídeo não encontrado ou não está pendente de moderação.';
  END IF;

  -- 3. Insert audit event
  INSERT INTO public.profile_video_moderation_events (
    video_id,
    moderator_account_user_id,
    decision,
    reason,
    created_at
  )
  VALUES (
    p_video_id,
    p_actor_account_user_id,
    p_decision,
    p_reason,
    v_now
  )
  RETURNING id INTO v_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'video_id', p_video_id,
    'decision', p_decision,
    'event_id', v_event_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_moderate_video FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_moderate_video TO service_role;

-- 3.4 Grant Founder Benefit + Audit Log
CREATE OR REPLACE FUNCTION public.admin_grant_founder_benefit(
  p_actor_account_user_id UUID,
  p_profile_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_role public.user_role;
  v_target_account_id UUID;
  v_account_status public.user_status;
  v_plan_id UUID;
  v_price_id UUID;
  v_sub_id UUID;
  v_audit_id UUID;
  v_now TIMESTAMPTZ := now();
  v_period_end TIMESTAMPTZ := v_now + INTERVAL '3 months';
BEGIN
  -- 1. Validate actor is ADMIN
  SELECT role INTO v_actor_role FROM public.account_users WHERE id = p_actor_account_user_id AND status = 'ACTIVE';
  IF v_actor_role IS NULL OR v_actor_role != 'ADMIN' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores ativos podem conceder benefício Founder.';
  END IF;

  -- 2. Validate profile and target account
  SELECT p.account_user_id, a.status INTO v_target_account_id, v_account_status
  FROM public.professional_profiles p
  JOIN public.account_users a ON a.id = p.account_user_id
  WHERE p.id = p_profile_id;

  IF v_target_account_id IS NULL OR v_account_status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Perfil não encontrado ou conta vinculada não está ativa.';
  END IF;

  -- 3. Get FOUNDER plan
  SELECT id INTO v_plan_id FROM public.subscription_plans WHERE code = 'FOUNDER' LIMIT 1;
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plano Founder não encontrado no catálogo.';
  END IF;

  SELECT id INTO v_price_id FROM public.plan_prices WHERE plan_id = v_plan_id LIMIT 1;

  -- 4. Insert or update subscription
  INSERT INTO public.subscriptions (
    account_user_id,
    plan_id,
    price_id,
    status,
    subscription_state,
    current_period_start,
    current_period_end,
    created_at,
    updated_at
  )
  VALUES (
    v_target_account_id,
    v_plan_id,
    v_price_id,
    'ACTIVE',
    'ACTIVE',
    v_now,
    v_period_end,
    v_now,
    v_now
  )
  RETURNING id INTO v_sub_id;

  -- 5. Atomically insert audit log
  INSERT INTO public.billing_admin_audit_logs (
    actor_account_user_id,
    target_account_user_id,
    action,
    subject_id,
    metadata
  )
  VALUES (
    p_actor_account_user_id,
    v_target_account_id,
    'FOUNDER_GRANTED',
    v_sub_id,
    jsonb_build_object('profile_id', p_profile_id, 'subscription_id', v_sub_id, 'period_end', v_period_end)
  )
  RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'audit_id', v_audit_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_founder_benefit FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_founder_benefit TO service_role;

-- 3.5 Revoke Founder Benefit + Audit Log
CREATE OR REPLACE FUNCTION public.admin_revoke_founder_benefit(
  p_actor_account_user_id UUID,
  p_profile_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_role public.user_role;
  v_target_account_id UUID;
  v_sub_id UUID;
  v_audit_id UUID;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- 1. Validate actor is ADMIN
  SELECT role INTO v_actor_role FROM public.account_users WHERE id = p_actor_account_user_id AND status = 'ACTIVE';
  IF v_actor_role IS NULL OR v_actor_role != 'ADMIN' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores ativos podem revogar benefício Founder.';
  END IF;

  -- 2. Validate profile
  SELECT account_user_id INTO v_target_account_id
  FROM public.professional_profiles
  WHERE id = p_profile_id;

  IF v_target_account_id IS NULL THEN
    RAISE EXCEPTION 'Perfil não encontrado.';
  END IF;

  -- 3. Find active founder subscription
  SELECT s.id INTO v_sub_id
  FROM public.subscriptions s
  JOIN public.subscription_plans p ON p.id = s.plan_id
  WHERE s.account_user_id = v_target_account_id
    AND p.code = 'FOUNDER'
    AND s.status IN ('ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'INCOMPLETE')
  LIMIT 1;

  IF v_sub_id IS NULL THEN
    RAISE EXCEPTION 'Benefício Founder ativo não encontrado para este perfil.';
  END IF;

  -- 4. Expire subscription
  UPDATE public.subscriptions
  SET
    status = 'EXPIRED',
    subscription_state = 'EXPIRED',
    canceled_at = v_now,
    cancellation_reason = 'ADMIN_FOUNDER_REVOKED',
    updated_at = v_now
  WHERE id = v_sub_id;

  -- 5. Atomically insert audit log
  INSERT INTO public.billing_admin_audit_logs (
    actor_account_user_id,
    target_account_user_id,
    action,
    subject_id,
    metadata
  )
  VALUES (
    p_actor_account_user_id,
    v_target_account_id,
    'FOUNDER_REVOKED',
    v_sub_id,
    jsonb_build_object('profile_id', p_profile_id, 'subscription_id', v_sub_id)
  )
  RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'audit_id', v_audit_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_founder_benefit FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_founder_benefit TO service_role;
