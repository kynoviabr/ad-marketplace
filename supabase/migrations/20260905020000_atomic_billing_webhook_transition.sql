-- R12 security remediation P1-5: atomic billing webhook finalization.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider_state_updated_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.finalize_billing_webhook_transition(
  p_event_id UUID,
  p_provider TEXT,
  p_provider_event_id TEXT,
  p_subscription_id UUID,
  p_provider_subscription_id TEXT,
  p_provider_customer_id TEXT,
  p_provider_state_updated_at TIMESTAMPTZ,
  p_new_status TEXT,
  p_period_start TIMESTAMPTZ DEFAULT NULL,
  p_period_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event RECORD;
  v_subscription RECORD;
  v_now TIMESTAMPTZ := now();
  v_new_state TEXT;
  v_rows INTEGER;
  v_reason TEXT;
BEGIN
  IF p_event_id IS NULL OR p_subscription_id IS NULL
     OR NULLIF(trim(p_provider), '') IS NULL
     OR NULLIF(trim(p_provider_event_id), '') IS NULL
     OR NULLIF(trim(p_provider_subscription_id), '') IS NULL
     OR NULLIF(trim(p_provider_customer_id), '') IS NULL
     OR p_provider_state_updated_at IS NULL THEN
    RAISE EXCEPTION 'INVALID_INPUT: Identificadores obrigatórios ausentes.';
  END IF;
  IF p_new_status NOT IN ('INCOMPLETE', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'EXPIRED') THEN
    RAISE EXCEPTION 'INVALID_STATUS: Estado normalizado inválido.';
  END IF;
  IF p_period_start IS NOT NULL AND p_period_end IS NOT NULL AND p_period_end < p_period_start THEN
    RAISE EXCEPTION 'INVALID_PERIOD: Período de assinatura inválido.';
  END IF;

  SELECT id, provider, provider_event_id, subscription_id, processing_status
  INTO v_event
  FROM public.billing_webhook_events
  WHERE id = p_event_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'EVENT_NOT_FOUND: Evento não encontrado.'; END IF;

  IF v_event.provider <> p_provider
     OR v_event.provider_event_id <> p_provider_event_id
     OR v_event.subscription_id IS DISTINCT FROM p_subscription_id THEN
    RAISE EXCEPTION 'EVENT_MISMATCH: Evento não corresponde à assinatura reconciliada.';
  END IF;

  IF v_event.processing_status = 'PROCESSED' THEN
    RETURN jsonb_build_object('outcome', 'ALREADY_PROCESSED');
  END IF;
  IF v_event.processing_status = 'IGNORED' THEN
    RETURN jsonb_build_object('outcome', 'ALREADY_IGNORED');
  END IF;
  IF v_event.processing_status NOT IN ('RECEIVED', 'FAILED') THEN
    RAISE EXCEPTION 'INVALID_EVENT_STATE: Estado do evento incompatível com processamento.';
  END IF;

  SELECT id, provider, provider_subscription_id, provider_customer_id, status,
         provider_state_updated_at
  INTO v_subscription
  FROM public.subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND: Assinatura não encontrada.'; END IF;
  IF v_subscription.provider IS DISTINCT FROM p_provider
     OR v_subscription.provider_subscription_id IS DISTINCT FROM p_provider_subscription_id
     OR v_subscription.provider_customer_id IS DISTINCT FROM p_provider_customer_id THEN
    RAISE EXCEPTION 'SUBSCRIPTION_MISMATCH: Referência do provedor não corresponde à assinatura.';
  END IF;

  IF v_subscription.provider_state_updated_at IS NOT NULL
     AND p_provider_state_updated_at < v_subscription.provider_state_updated_at THEN
    UPDATE public.billing_webhook_events
    SET processing_status = 'IGNORED', processed_at = v_now, error_code = 'STALE_EVENT'
    WHERE id = v_event.id AND processing_status IN ('RECEIVED', 'FAILED');
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 1 THEN RAISE EXCEPTION 'EVENT_COMPLETION_FAILED: Evento não foi concluído.'; END IF;
    RETURN jsonb_build_object('outcome', 'IGNORED', 'reason', 'STALE_EVENT');
  END IF;

  IF v_subscription.status <> p_new_status AND NOT (
    (v_subscription.status = 'INCOMPLETE' AND p_new_status IN ('ACTIVE', 'EXPIRED')) OR
    (v_subscription.status = 'ACTIVE' AND p_new_status IN ('PAST_DUE', 'EXPIRED')) OR
    (v_subscription.status = 'PAST_DUE' AND p_new_status IN ('ACTIVE', 'GRACE_PERIOD')) OR
    (v_subscription.status = 'GRACE_PERIOD' AND p_new_status IN ('ACTIVE', 'EXPIRED'))
  ) THEN
    v_reason := CASE
      WHEN v_subscription.status = 'EXPIRED'
        OR (p_new_status = 'INCOMPLETE' AND v_subscription.status <> 'INCOMPLETE')
        OR (v_subscription.status = 'GRACE_PERIOD' AND p_new_status = 'PAST_DUE')
      THEN 'STALE_EVENT'
      ELSE 'INVALID_TRANSITION'
    END;

    UPDATE public.billing_webhook_events
    SET processing_status = 'IGNORED', processed_at = v_now, error_code = v_reason
    WHERE id = v_event.id AND processing_status IN ('RECEIVED', 'FAILED');
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 1 THEN RAISE EXCEPTION 'EVENT_COMPLETION_FAILED: Evento não foi concluído.'; END IF;
    RETURN jsonb_build_object('outcome', 'IGNORED', 'reason', v_reason);
  END IF;

  v_new_state := CASE p_new_status
    WHEN 'INCOMPLETE' THEN 'TRIAL'
    WHEN 'GRACE_PERIOD' THEN 'PAST_DUE'
    ELSE p_new_status
  END;

  UPDATE public.subscriptions
  SET status = p_new_status,
      subscription_state = v_new_state,
      current_period_start = COALESCE(p_period_start, current_period_start),
      current_period_end = COALESCE(p_period_end, current_period_end),
      grace_period_end = CASE
        WHEN p_new_status = 'GRACE_PERIOD' THEN v_now + interval '7 days'
        WHEN p_new_status = 'ACTIVE' THEN NULL
        ELSE grace_period_end
      END,
      provider_state_updated_at = p_provider_state_updated_at,
      updated_at = v_now
  WHERE id = v_subscription.id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'SUBSCRIPTION_UPDATE_FAILED: Assinatura não foi atualizada.'; END IF;

  UPDATE public.billing_webhook_events
  SET processing_status = 'PROCESSED', processed_at = v_now, error_code = NULL
  WHERE id = v_event.id AND processing_status IN ('RECEIVED', 'FAILED');
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'EVENT_COMPLETION_FAILED: Evento não foi concluído.'; END IF;

  RETURN jsonb_build_object(
    'outcome', CASE WHEN v_subscription.status = p_new_status THEN 'NO_OP' ELSE 'APPLIED' END,
    'from_status', v_subscription.status,
    'to_status', p_new_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_billing_webhook_transition(
  UUID, TEXT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TIMESTAMPTZ, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_billing_webhook_transition(
  UUID, TEXT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TIMESTAMPTZ, TIMESTAMPTZ
) TO service_role;

COMMENT ON FUNCTION public.finalize_billing_webhook_transition(
  UUID, TEXT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TIMESTAMPTZ, TIMESTAMPTZ
) IS 'Service-role-only atomic subscription transition and billing webhook ledger completion.';
