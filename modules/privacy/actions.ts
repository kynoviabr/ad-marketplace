'use server'

import { requireAccount } from '@/modules/auth/dal'
import { requireAdmin } from '@/modules/moderation/guards'
import {
  createDataSubjectRequest,
  getAccountDataSubjectRequests,
  getAdminDataSubjectRequests,
  getDsrEvents,
  getAccountDsrEventsSafe,
  cancelAccountDataSubjectRequest,
  getAccountDataSummary,
} from './dal'
import {
  LGPD_RIGHTS,
  type LgpdRight,
  type DataSubjectRequestSafeDTO,
  type DataSubjectRequestEventSafeDTO,
  type DataSubjectSummaryDTO,
  type DataSubjectRequest,
  type DataSubjectRequestEvent,
} from './types'


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
 * Retrieves the personal data summary for the authenticated user.
 * Strictly session-bound via requireAccount().
 */
export async function getMyDataSummaryAction(): Promise<DsrActionResult<DataSubjectSummaryDTO>> {
  try {
    const account = await requireAccount()
    if (!account || !account.id) {
      return { success: false, error: 'Acesso não autorizado.', code: 'UNAUTHORIZED' }
    }

    const summary = await getAccountDataSummary(account.id)
    if (!summary) {
      return { success: false, error: 'Não foi possível carregar os dados do titular.', code: 'NOT_FOUND' }
    }

    return { success: true, data: summary }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao recuperar resumo de dados.'
    return { success: false, error: message, code: 'INTERNAL_ERROR' }
  }
}

/**
 * Server action for an authenticated data subject to download their personal data as a sanitized ZIP archive.
 *
 * Security Invariants:
 * 1. Target ID is resolved exclusively server-side via requireAccount().
 * 2. Pure sanitized data bundle (all passwords, tokens, internal notes stripped).
 * 3. Returns base64 ZIP buffer and safe filename.
 */
export async function getMyDataExportZipAction(): Promise<DsrActionResult<{ base64Zip: string; filename: string }>> {
  try {
    const account = await requireAccount()
    if (!account || !account.id) {
      return { success: false, error: 'Acesso não autorizado.', code: 'UNAUTHORIZED' }
    }

    const { exportSubjectDataZip } = await import('./export-engine')
    const zipBuffer = await exportSubjectDataZip(account.id)
    const base64Zip = zipBuffer.toString('base64')
    const filename = `velvet-meus-dados-${account.id.slice(0, 8)}-${Date.now()}.zip`

    return {
      success: true,
      data: { base64Zip, filename },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar arquivo de exportação.'
    return { success: false, error: message, code: 'EXPORT_FAILED' }
  }
}

/**
 * Server action for a data subject to retrieve the safe event timeline of their own request.
 * Strictly session-bound; rejects access if the request belongs to another account.
 */
export async function getMyDsrEventsTimelineAction(
  requestId: string
): Promise<DsrActionResult<DataSubjectRequestEventSafeDTO[]>> {
  try {
    const account = await requireAccount()
    if (!account || !account.id) {
      return { success: false, error: 'Acesso não autorizado.', code: 'UNAUTHORIZED' }
    }

    if (!requestId || typeof requestId !== 'string') {
      return { success: false, error: 'ID da solicitação inválido.', code: 'INVALID_ID' }
    }

    const events = await getAccountDsrEventsSafe(account.id, requestId)
    if (events === null) {
      return { success: false, error: 'Solicitação não encontrada ou acesso negado.', code: 'NOT_FOUND' }
    }

    return { success: true, data: events }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao carregar linha do tempo da solicitação.'
    return { success: false, error: message, code: 'INTERNAL_ERROR' }
  }
}

/**
 * Server action for a data subject to cancel their own request in RECEIVED, IDENTITY_VERIFICATION_REQUIRED, or IN_REVIEW status.
 */
export async function cancelMyDataSubjectRequestAction(
  requestId: string
): Promise<DsrActionResult<{ cancelled: boolean }>> {
  try {
    const account = await requireAccount()
    if (!account || !account.id) {
      return { success: false, error: 'Acesso não autorizado.', code: 'UNAUTHORIZED' }
    }

    if (!requestId || typeof requestId !== 'string') {
      return { success: false, error: 'ID da solicitação inválido.', code: 'INVALID_ID' }
    }

    const res = await cancelAccountDataSubjectRequest(account.id, requestId)
    if (!res.success) {
      return { success: false, error: res.error, code: res.code }
    }

    return { success: true, data: { cancelled: true } }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao cancelar solicitação.'
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

/**
 * Administrative action for simulating a subject lifecycle dry run (LGPD-02A).
 * Strictly observational: ZERO mutations are executed.
 * Strictly gated by requireAdmin().
 */
export async function getAdminSubjectLifecycleDryRunAction(
  subjectAccountId: string
): Promise<DsrActionResult<import('./lifecycle-types').LifecyclePlan>> {
  try {
    await requireAdmin()
    if (!subjectAccountId || typeof subjectAccountId !== 'string') {
      return { success: false, error: 'ID do titular inválido.', code: 'INVALID_ID' }
    }

    const { generateSubjectLifecyclePlan } = await import('./lifecycle-planner')
    const plan = await generateSubjectLifecyclePlan(subjectAccountId)
    return { success: true, data: plan }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar simulação de ciclo de vida.'
    return { success: false, error: message, code: 'PLAN_GENERATION_FAILED' }
  }
}

/**
 * Administrative action for generating a sanitized personal data export bundle (LGPD Art. 18).
 * Strictly gated by requireAdmin().
 */
export async function getAdminSubjectExportBundleAction(
  subjectAccountId: string
): Promise<DsrActionResult<import('./lifecycle-types').SubjectExportBundle>> {
  try {
    await requireAdmin()
    if (!subjectAccountId || typeof subjectAccountId !== 'string') {
      return { success: false, error: 'ID do titular inválido.', code: 'INVALID_ID' }
    }

    const { generateSubjectExportBundle } = await import('./export-engine')
    const bundle = await generateSubjectExportBundle(subjectAccountId)
    return { success: true, data: bundle }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar pacote de exportação.'
    return { success: false, error: message, code: 'EXPORT_FAILED' }
  }
}

/**
 * Administrative action for downloading the subject export as a ZIP archive.
 * Returns base64 binary buffer for direct browser download.
 * Strictly gated by requireAdmin().
 */
export async function getAdminSubjectExportZipAction(
  subjectAccountId: string
): Promise<DsrActionResult<{ base64Zip: string; filename: string }>> {
  try {
    await requireAdmin()
    if (!subjectAccountId || typeof subjectAccountId !== 'string') {
      return { success: false, error: 'ID do titular inválido.', code: 'INVALID_ID' }
    }

    const { exportSubjectDataZip } = await import('./export-engine')
    const zipBuffer = await exportSubjectDataZip(subjectAccountId)
    const base64Zip = zipBuffer.toString('base64')
    const filename = `lgpd-export-${subjectAccountId.slice(0, 8)}-${Date.now()}.zip`

    return {
      success: true,
      data: { base64Zip, filename },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao empacotar exportação ZIP.'
    return { success: false, error: message, code: 'ZIP_FAILED' }
  }
}

/**
 * Administrative action for fetching operational privacy summary & reports.
 * Strictly gated by requireAdmin().
 */
export async function getAdminPrivacyOperationsSummaryAction(options?: {
  includeSynthetic?: boolean
}): Promise<DsrActionResult<import('./operations-dal').PrivacyOperationsSummary>> {
  try {
    await requireAdmin()
    const { getPrivacyOperationsSummary } = await import('./operations-dal')
    const summary = await getPrivacyOperationsSummary(options)
    return { success: true, data: summary }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Acesso restrito a administradores.'
    return { success: false, error: message, code: 'FORBIDDEN' }
  }
}

/**
 * Administrative action for querying privacy requests with filtering.
 * Strictly gated by requireAdmin().
 */
export async function getAdminPrivacyRequestsAction(options?: {
  includeSynthetic?: boolean
  period?: '7d' | '30d' | '90d' | 'all'
  status?: string
  requestType?: string
  role?: string
  limit?: number
  offset?: number
}): Promise<DsrActionResult<{ items: import('./operations-dal').PrivacyRequestItem[]; total: number }>> {
  try {
    await requireAdmin()
    const { getPrivacyRequests } = await import('./operations-dal')
    const res = await getPrivacyRequests(options)
    return { success: true, data: res }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Acesso restrito a administradores.'
    return { success: false, error: message, code: 'FORBIDDEN' }
  }
}

/**
 * Administrative action for fetching details of an individual request.
 * Strictly gated by requireAdmin().
 */
export async function getAdminPrivacyRequestDetailAction(
  requestId: string
): Promise<DsrActionResult<import('./operations-dal').PrivacyRequestDetail>> {
  try {
    await requireAdmin()
    if (!requestId || typeof requestId !== 'string') {
      return { success: false, error: 'ID da solicitação inválido.', code: 'INVALID_ID' }
    }
    const { getPrivacyRequestDetail } = await import('./operations-dal')
    const detail = await getPrivacyRequestDetail(requestId)
    if (!detail) {
      return { success: false, error: 'Solicitação não encontrada.', code: 'NOT_FOUND' }
    }
    return { success: true, data: detail }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Acesso restrito a administradores.'
    return { success: false, error: message, code: 'FORBIDDEN' }
  }
}

/**
 * Administrative action for querying lifecycle executions.
 * Strictly gated by requireAdmin().
 */
export async function getAdminPrivacyExecutionsAction(options?: {
  includeSynthetic?: boolean
  limit?: number
  offset?: number
}): Promise<DsrActionResult<{ items: import('./operations-dal').PrivacyExecutionItem[]; total: number }>> {
  try {
    await requireAdmin()
    const { getPrivacyExecutions } = await import('./operations-dal')
    const res = await getPrivacyExecutions(options)
    return { success: true, data: res }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Acesso restrito a administradores.'
    return { success: false, error: message, code: 'FORBIDDEN' }
  }
}

/**
 * Administrative action for fetching details of an individual execution.
 * Strictly gated by requireAdmin().
 */
export async function getAdminPrivacyExecutionDetailAction(
  executionId: string
): Promise<DsrActionResult<import('./operations-dal').PrivacyExecutionDetail>> {
  try {
    await requireAdmin()
    if (!executionId || typeof executionId !== 'string') {
      return { success: false, error: 'ID da execução inválido.', code: 'INVALID_ID' }
    }
    const { getPrivacyExecutionDetail } = await import('./operations-dal')
    const detail = await getPrivacyExecutionDetail(executionId)
    if (!detail) {
      return { success: false, error: 'Execução não encontrada.', code: 'NOT_FOUND' }
    }
    return { success: true, data: detail }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Acesso restrito a administradores.'
    return { success: false, error: message, code: 'FORBIDDEN' }
  }
}

/**
 * Administrative action for exporting aggregated non-PII CSV report.
 * Strictly gated by requireAdmin().
 */
export async function exportAdminPrivacyReportCsvAction(options?: {
  includeSynthetic?: boolean
  period?: '7d' | '30d' | '90d' | 'all'
}): Promise<DsrActionResult<{ csv: string; filename: string }>> {
  try {
    await requireAdmin()
    const { exportPrivacyAggregatedCsv } = await import('./operations-dal')
    const csv = await exportPrivacyAggregatedCsv(options)
    const filename = `privacy-report-aggregated-${options?.period || '30d'}-${Date.now()}.csv`
    return { success: true, data: { csv, filename } }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Acesso restrito a administradores.'
    return { success: false, error: message, code: 'FORBIDDEN' }
  }
}

