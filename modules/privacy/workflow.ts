import type { DsrStatus, LgpdRight } from './types'

/**
 * LGPD-02D — Canonical DSR Workflow, Transition Matrix & Controlled Gates
 *
 * Rules:
 * 1. Single source of truth for allowed DSR state transitions.
 * 2. Terminal states (COMPLETED, REJECTED, CANCELLED) are strictly immutable.
 * 3. Completion gates prevent false completion:
 *    - Real-user DELETION/ANONYMIZATION/BLOCKING blocked while destructive execution is disabled.
 *    - Synthetic DELETION/ANONYMIZATION/BLOCKING requires completed synthetic lifecycle execution.
 *    - PORTABILITY/ACCESS requires fulfillment evidence.
 * 4. Rejection requires controlled reason codes and mandatory justification where appropriate.
 */

// -----------------------------------------------------------------------------
// 1. REJECTION REASON TAXONOMY
// -----------------------------------------------------------------------------

export const DSR_REJECTION_REASONS = [
  'IDENTITY_NOT_VERIFIED',
  'LEGAL_OBLIGATION_PRESERVATION',
  'REQUEST_NOT_APPLICABLE',
  'INSUFFICIENT_INFORMATION',
  'DUPLICATE_REQUEST',
  'OTHER_JUSTIFIED',
] as const

export type DsrRejectionReason = (typeof DSR_REJECTION_REASONS)[number]

// -----------------------------------------------------------------------------
// 2. CANONICAL TRANSITION MATRIX
// -----------------------------------------------------------------------------

export const DSR_ALLOWED_TRANSITIONS: Record<DsrStatus, readonly DsrStatus[]> = {
  RECEIVED: ['IDENTITY_VERIFICATION_REQUIRED', 'IN_REVIEW', 'REJECTED', 'CANCELLED'],
  IDENTITY_VERIFICATION_REQUIRED: ['IN_REVIEW', 'REJECTED', 'CANCELLED'],
  IN_REVIEW: ['IDENTITY_VERIFICATION_REQUIRED', 'PROCESSING', 'REJECTED', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'REJECTED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
} as const

// -----------------------------------------------------------------------------
// 3. COMPLETION GATE TYPES & LOGIC
// -----------------------------------------------------------------------------

export interface CompletionGateContext {
  isSynthetic: boolean
  hasCompletedLifecycleExecution?: boolean
  hasExportFulfilled?: boolean
  operatorNotes?: string
  resolutionMessage?: string
}

export interface GateValidationResult {
  allowed: boolean
  blockerCode?: string
  reason?: string
}

/**
 * Validates whether a DSR can be marked COMPLETED based on request type and evidence.
 */
export function validateCompletionGate(
  requestType: LgpdRight,
  context: CompletionGateContext
): GateValidationResult {
  // Destructive lifecycle requests
  if (requestType === 'DELETION' || requestType === 'ANONYMIZATION' || requestType === 'BLOCKING') {
    if (!context.isSynthetic) {
      return {
        allowed: false,
        blockerCode: 'REAL_USER_LIFECYCLE_EXECUTION_DISABLED',
        reason:
          'Execução de ciclo de vida destrutivo desativada para usuários reais. Solicitação não pode ser concluída.',
      }
    }

    if (!context.hasCompletedLifecycleExecution) {
      return {
        allowed: false,
        blockerCode: 'SYNTHETIC_EXECUTION_REQUIRED',
        reason:
          'Nenhuma execução destrutiva sintética concluída vinculada a esta solicitação. Conclusão bloqueada.',
      }
    }

    return { allowed: true }
  }

  // Data delivery requests (Portability / Access)
  if (requestType === 'PORTABILITY' || requestType === 'ACCESS') {
    if (!context.hasExportFulfilled && !context.operatorNotes?.trim()) {
      return {
        allowed: false,
        blockerCode: 'FULFILLMENT_EVIDENCE_REQUIRED',
        reason:
          'Evidência de exportação ou atendimento de acesso é necessária para concluir a solicitação.',
      }
    }
    return { allowed: true }
  }

  // Rectification, Revocation, Sharing Info, Decision Review
  if (
    requestType === 'CORRECTION' ||
    requestType === 'CONSENT_REVOCATION' ||
    requestType === 'SHARING_INFORMATION' ||
    requestType === 'AUTOMATED_DECISION_REVIEW'
  ) {
    if (!context.operatorNotes?.trim() && !context.resolutionMessage?.trim()) {
      return {
        allowed: false,
        blockerCode: 'OPERATOR_JUSTIFICATION_REQUIRED',
        reason:
          'Observação do operador ou mensagem de atendimento é obrigatória para concluir esta solicitação.',
      }
    }
    return { allowed: true }
  }

  return { allowed: true }
}

/**
 * Validates rejection parameters (reason code and notes).
 */
export function validateRejectionGate(
  reasonCode?: string,
  operatorNotes?: string
): GateValidationResult {
  if (!reasonCode || !DSR_REJECTION_REASONS.includes(reasonCode as DsrRejectionReason)) {
    return {
      allowed: false,
      blockerCode: 'INVALID_REASON_CODE',
      reason: `Código de motivo inválido. Valores aceitos: ${DSR_REJECTION_REASONS.join(', ')}`,
    }
  }

  if (reasonCode === 'OTHER_JUSTIFIED' && (!operatorNotes || !operatorNotes.trim())) {
    return {
      allowed: false,
      blockerCode: 'NOTE_REQUIRED_FOR_OTHER',
      reason: 'Observação explicativa é obrigatória quando o motivo for "Outro motivo legítimo".',
    }
  }

  return { allowed: true }
}

/**
 * Validates whether a DSR can transition from currentStatus to targetStatus.
 */
export function canTransitionDsrStatus(
  currentStatus: DsrStatus,
  targetStatus: DsrStatus,
  requestType?: LgpdRight,
  context?: CompletionGateContext,
  rejection?: { reasonCode?: string; operatorNotes?: string }
): GateValidationResult {
  // Terminal state immutability
  if (currentStatus === 'COMPLETED' || currentStatus === 'REJECTED' || currentStatus === 'CANCELLED') {
    return {
      allowed: false,
      blockerCode: 'TERMINAL_STATUS',
      reason: `Solicitações em estado terminal (${currentStatus}) não permitem novas transições.`,
    }
  }

  // Canonical transition matrix check
  const allowedTargets = DSR_ALLOWED_TRANSITIONS[currentStatus] || []
  if (!allowedTargets.includes(targetStatus)) {
    return {
      allowed: false,
      blockerCode: 'INVALID_TRANSITION',
      reason: `Transição de ${currentStatus} para ${targetStatus} não é permitida pela matriz de workflow.`,
    }
  }

  // Target-specific gates
  if (targetStatus === 'COMPLETED' && requestType && context) {
    return validateCompletionGate(requestType, context)
  }

  if (targetStatus === 'REJECTED') {
    return validateRejectionGate(rejection?.reasonCode, rejection?.operatorNotes)
  }

  return { allowed: true }
}
