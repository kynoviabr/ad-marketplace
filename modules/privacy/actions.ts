'use server'

import { requireAccount } from '@/modules/auth/dal'
import { requireAdmin } from '@/modules/moderation/guards'
import {
  createDataSubjectRequest,
  getAccountDataSubjectRequests,
  getAdminDataSubjectRequests,
  getDsrEvents,
} from './dal'
import { LGPD_RIGHTS, type LgpdRight, type DataSubjectRequestSafeDTO, type DataSubjectRequest, type DataSubjectRequestEvent } from './types'

export interface CreateDsrActionInput {
  requestType: string
  details?: Record<string, unknown>
  // Any client-supplied target IDs will be deliberately ignored
  subject_user_id?: unknown
  auth_user_id?: unknown
  account_user_id?: unknown
}

export interface DsrActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

/**
 * Server action for an authenticated user to submit an LGPD Data Subject Request.
 *
 * Security Invariants:
 * 1. Session-Bound: Identity is resolved exclusively via requireAccount().
 * 2. Client Identity Ignored: Any client-provided IDs (account_user_id, etc.) are ignored.
 * 3. Type Validation: Validates requestType against canonical LGPD rights.
 * 4. Idempotency: Disallows duplicate in-flight requests of the same type.
 * 5. Non-Destructive: Request enters 'RECEIVED' status. No automated deletion or purge is triggered.
 */
export async function createDataSubjectRequestAction(
  input: CreateDsrActionInput
): Promise<DsrActionResult<DataSubjectRequestSafeDTO>> {
  try {
    const account = await requireAccount()
    if (!account || !account.id) {
      return { success: false, error: 'Acesso não autorizado.', code: 'UNAUTHORIZED' }
    }

    const { requestType, details } = input

    if (!requestType || !LGPD_RIGHTS.includes(requestType as LgpdRight)) {
      return {
        success: false,
        error: `Tipo de solicitação inválido. Valores aceitos: ${LGPD_RIGHTS.join(', ')}`,
        code: 'INVALID_REQUEST_TYPE',
      }
    }

    const result = await createDataSubjectRequest({
      accountUserId: account.id, // Strictly resolved from server session
      requestType: requestType as LgpdRight,
      details: typeof details === 'object' && details !== null ? details : {},
    })

    if (!result.success || !result.request) {
      return {
        success: false,
        error: result.error || 'Não foi possível registrar a solicitação.',
        code: result.code || 'CREATION_FAILED',
      }
    }

    return {
      success: true,
      data: result.request,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno ao processar solicitação.'
    return { success: false, error: message, code: 'INTERNAL_ERROR' }
  }
}

/**
 * Retrieves all DSR requests for the currently authenticated user.
 */
export async function getMyDataSubjectRequestsAction(): Promise<DsrActionResult<DataSubjectRequestSafeDTO[]>> {
  try {
    const account = await requireAccount()
    if (!account || !account.id) {
      return { success: false, error: 'Acesso não autorizado.', code: 'UNAUTHORIZED' }
    }

    const requests = await getAccountDataSubjectRequests(account.id)
    return { success: true, data: requests }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno ao listar solicitações.'
    return { success: false, error: message, code: 'INTERNAL_ERROR' }
  }
}

/**
 * Administrative action for listing all Data Subject Requests.
 * Strictly gated by requireAdmin().
 */
export async function getAdminDataSubjectRequestsAction(params?: {
  status?: string
  requestType?: string
  limit?: number
}): Promise<DsrActionResult<DataSubjectRequest[]>> {
  try {
    await requireAdmin()
    const requests = await getAdminDataSubjectRequests(params as Parameters<typeof getAdminDataSubjectRequests>[0])
    return { success: true, data: requests }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Acesso restrito a administradores.'
    return { success: false, error: message, code: 'FORBIDDEN' }
  }
}

/**
 * Administrative action for querying the event audit trail of a specific DSR request.
 * Strictly gated by requireAdmin().
 */
export async function getAdminDsrAuditTrailAction(
  requestId: string
): Promise<DsrActionResult<DataSubjectRequestEvent[]>> {
  try {
    await requireAdmin()
    if (!requestId || typeof requestId !== 'string') {
      return { success: false, error: 'ID da solicitação inválido.', code: 'INVALID_ID' }
    }

    const events = await getDsrEvents(requestId)
    return { success: true, data: events }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Acesso restrito a administradores.'
    return { success: false, error: message, code: 'FORBIDDEN' }
  }
}
