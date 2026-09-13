-- =============================================================================
-- Migration: 20260913130000_lgpd_admin_dsr_workflow.sql
-- LGPD-02D — Admin DSR Workflow, Canonical Transitions & Atomic RPC
-- =============================================================================
-- Implements the atomic server-side state transition RPC for Data Subject Requests.
-- Guarantees:
-- 1. Atomic status update + immutable event insertion in a single transaction.
-- 2. Concurrency protection via row-level pessimistic locking (FOR UPDATE).
-- 3. Stale state / double-submission defense (p_expected_current_status).
-- 4. Server-enforced transition matrix (fail-closed).
-- 5. Terminal state immutability (COMPLETED, REJECTED, CANCELLED cannot transition).
-- 6. Role authorization: caller must be an ACTIVE account with role = 'ADMIN'.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ADDITIVE ENUM EXTENSION: dsr_event_type
-- -----------------------------------------------------------------------------

ALTER TYPE public.dsr_event_type ADD VALUE IF NOT EXISTS 'IDENTITY_VERIFICATION_REQUESTED';

-- -----------------------------------------------------------------------------
-- 2. ATOMIC TRANSACTIONAL RPC: admin_transition_data_subject_request
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_transition_data_subject_request(
  p_request_id              UUID,
  p_expected_current_status public.dsr_status,
  p_target_status           public.dsr_status,
  p_admin_account_id        UUID,
  p_reason_code             TEXT DEFAULT NULL,
  p_operator_notes          TEXT DEFAULT NULL,
  p_resolution_message      TEXT DEFAULT NULL,
  p_metadata                JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_record            RECORD;
  v_request                 RECORD;
  v_now                     TIMESTAMPTZ := now();
  v_event_type              public.dsr_event_type;
  v_event_id                UUID;
  v_event_metadata          JSONB;
BEGIN
  -- 1. Input parameter validation
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_PARAMETER: ID da solicitação é obrigatório.';
  END IF;

  IF p_expected_current_status IS NULL OR p_target_status IS NULL THEN
    RAISE EXCEPTION 'INVALID_PARAMETER: Status atual esperado e status de destino são obrigatórios.';
  END IF;

  IF p_admin_account_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_PARAMETER: ID do administrador é obrigatório.';
  END IF;

  IF p_reason_code IS NOT NULL AND length(p_reason_code) > 100 THEN
    RAISE EXCEPTION 'INVALID_PARAMETER: Código de motivo excede 100 caracteres.';
  END IF;

  IF p_operator_notes IS NOT NULL AND length(p_operator_notes) > 2000 THEN
    RAISE EXCEPTION 'INVALID_PARAMETER: Observações do operador excedem 2000 caracteres.';
  END IF;

  IF p_resolution_message IS NOT NULL AND length(p_resolution_message) > 2000 THEN
    RAISE EXCEPTION 'INVALID_PARAMETER: Mensagem de resolução excede 2000 caracteres.';
  END IF;

  -- 2. Verify Admin Actor Authorization
  -- Fail-closed: Must exist in account_users with role = 'ADMIN' and status = 'ACTIVE'.
  SELECT id, auth_user_id, role, status
  INTO v_admin_record
  FROM public.account_users
  WHERE id = p_admin_account_id;

  IF NOT FOUND OR v_admin_record.role <> 'ADMIN' OR v_admin_record.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'FORBIDDEN: Apenas administradores ativos têm permissão para executar esta operação.';
  END IF;

  -- If called with an authenticated user JWT session, verify caller matches the admin account
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_admin_record.auth_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN: Sessão autenticada não corresponde à conta de administrador informada.';
  END IF;

  -- 3. Lock target request row inside transaction (Pessimistic concurrency protection)
  SELECT id, requester_account_user_id, request_type, status, resolution_code, resolution_notes, details
  INTO v_request
  FROM public.data_subject_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND: Solicitação de privacidade não encontrada.';
  END IF;

  -- 4. Terminal State Defense: Terminal statuses are strictly immutable
  IF v_request.status IN ('COMPLETED', 'REJECTED', 'CANCELLED') THEN
    RAISE EXCEPTION 'TERMINAL_STATUS: Solicitações em estado terminal (%) não permitem novas transições.', v_request.status;
  END IF;

  -- 5. Stale State / Concurrency Defense: Validate expected current status
  IF v_request.status <> p_expected_current_status THEN
    RAISE EXCEPTION 'STALE_STATUS: O status atual da solicitação (%) difere do esperado (%).', v_request.status, p_expected_current_status;
  END IF;

  -- 6. Canonical Transition Matrix Enforcement
  IF v_request.status = 'RECEIVED' THEN
    IF p_target_status NOT IN ('IDENTITY_VERIFICATION_REQUIRED', 'IN_REVIEW', 'REJECTED', 'CANCELLED') THEN
      RAISE EXCEPTION 'INVALID_TRANSITION: Transição de % para % não é permitida.', v_request.status, p_target_status;
    END IF;
  ELSIF v_request.status = 'IDENTITY_VERIFICATION_REQUIRED' THEN
    IF p_target_status NOT IN ('IN_REVIEW', 'REJECTED', 'CANCELLED') THEN
      RAISE EXCEPTION 'INVALID_TRANSITION: Transição de % para % não é permitida.', v_request.status, p_target_status;
    END IF;
  ELSIF v_request.status = 'IN_REVIEW' THEN
    IF p_target_status NOT IN ('IDENTITY_VERIFICATION_REQUIRED', 'PROCESSING', 'REJECTED', 'CANCELLED') THEN
      RAISE EXCEPTION 'INVALID_TRANSITION: Transição de % para % não é permitida.', v_request.status, p_target_status;
    END IF;
  ELSIF v_request.status = 'PROCESSING' THEN
    IF p_target_status NOT IN ('COMPLETED', 'REJECTED') THEN
      RAISE EXCEPTION 'INVALID_TRANSITION: Transição de % para % não é permitida.', v_request.status, p_target_status;
    END IF;
  ELSE
    RAISE EXCEPTION 'INVALID_TRANSITION: Transição a partir de % não é permitida.', v_request.status;
  END IF;

  -- 7. Target-specific invariant checks
  IF p_target_status = 'REJECTED' THEN
    IF p_reason_code IS NULL OR length(trim(p_reason_code)) = 0 THEN
      RAISE EXCEPTION 'MISSING_REASON_CODE: Código de motivo é obrigatório para rejeição.';
    END IF;
  END IF;

  -- 8. Map target status to canonical event type
  CASE p_target_status
    WHEN 'IDENTITY_VERIFICATION_REQUIRED' THEN
      v_event_type := 'IDENTITY_VERIFICATION_REQUESTED';
    WHEN 'IN_REVIEW' THEN
      v_event_type := 'REVIEW_STARTED';
    WHEN 'PROCESSING' THEN
      v_event_type := 'PROCESSING_STARTED';
    WHEN 'COMPLETED' THEN
      v_event_type := 'REQUEST_COMPLETED';
    WHEN 'REJECTED' THEN
      v_event_type := 'REQUEST_REJECTED';
    WHEN 'CANCELLED' THEN
      v_event_type := 'REQUEST_CANCELLED';
    ELSE
      RAISE EXCEPTION 'UNMAPPED_EVENT_TYPE: Não há tipo de evento mapeado para o status %.', p_target_status;
  END CASE;

  -- 9. Update data_subject_requests row
  UPDATE public.data_subject_requests
  SET
    status = p_target_status,
    resolution_code = COALESCE(p_reason_code, resolution_code),
    resolution_notes = COALESCE(p_operator_notes, resolution_notes),
    updated_at = v_now,
    completed_at = CASE WHEN p_target_status = 'COMPLETED' THEN v_now ELSE completed_at END,
    cancelled_at = CASE WHEN p_target_status = 'CANCELLED' THEN v_now ELSE cancelled_at END
  WHERE id = p_request_id;

  -- 10. Build safe structured audit event metadata
  v_event_metadata := jsonb_build_object(
    'previous_status', v_request.status,
    'new_status', p_target_status,
    'reason_code', p_reason_code,
    'resolution_message', p_resolution_message,
    'operator_notes', p_operator_notes
  ) || COALESCE(p_metadata, '{}'::jsonb);

  -- 11. Insert append-only audit event in data_subject_request_events
  INSERT INTO public.data_subject_request_events (
    request_id,
    event_type,
    actor_account_user_id,
    actor_role,
    metadata,
    created_at
  ) VALUES (
    p_request_id,
    v_event_type,
    p_admin_account_id,
    'ADMIN',
    v_event_metadata,
    v_now
  )
  RETURNING id INTO v_event_id;

  -- 12. Return canonical result payload
  RETURN jsonb_build_object(
    'success', true,
    'requestId', p_request_id,
    'previousStatus', v_request.status,
    'newStatus', p_target_status,
    'eventType', v_event_type,
    'eventId', v_event_id,
    'timestamp', v_now
  );
END;
$$;

-- Privileges
REVOKE ALL ON FUNCTION public.admin_transition_data_subject_request(
  UUID, public.dsr_status, public.dsr_status, UUID, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_transition_data_subject_request(
  UUID, public.dsr_status, public.dsr_status, UUID, TEXT, TEXT, TEXT, JSONB
) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_transition_data_subject_request IS
  'Atomic transactional RPC for Admin DSR lifecycle state transitions and append-only audit event recording.';
