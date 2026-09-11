import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  DataSubjectRequest,
  DataSubjectRequestEvent,
  DataSubjectRequestSafeDTO,
  LgpdRight,
  DsrStatus,
  DsrEventType,
  DsrActorRole,
} from './types'

export interface CreateDsrParams {
  accountUserId: string
  requestType: LgpdRight
  details?: Record<string, unknown>
}

export interface CreateDsrResult {
  success: boolean
  request?: DataSubjectRequestSafeDTO
  error?: string
  code?: 'DUPLICATE_ACTIVE_REQUEST' | 'INVALID_REQUEST' | 'DATABASE_ERROR'
}

/**
 * Checks whether an account already has an active pending request of the given type.
 */
export async function getActiveRequestByType(
  accountUserId: string,
  requestType: LgpdRight
): Promise<DataSubjectRequest | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('data_subject_requests')
    .select('*')
    .eq('requester_account_user_id', accountUserId)
    .eq('request_type', requestType)
    .in('status', ['RECEIVED', 'IDENTITY_VERIFICATION_REQUIRED', 'IN_REVIEW', 'PROCESSING'])
    .maybeSingle()

  if (error || !data) return null
  return data as DataSubjectRequest
}

/**
 * Creates a new Data Subject Request in Postgres and records the initial audit event.
 *
 * Invariants:
 * - Requester account user ID is strictly server-bound.
 * - Idempotency: Returns DUPLICATE_ACTIVE_REQUEST if another active request of the same type exists.
 * - Non-destructive: DELETION requests enter RECEIVED status. No automated deletion occurs.
 */
export async function createDataSubjectRequest(
  params: CreateDsrParams
): Promise<CreateDsrResult> {
  const admin = createAdminClient()

  // 1. Idempotency check: prevent duplicate in-flight requests of the same right
  const existingActive = await getActiveRequestByType(params.accountUserId, params.requestType)
  if (existingActive) {
    return {
      success: false,
      error: 'Já existe uma solicitação ativa deste tipo em processamento para sua conta.',
      code: 'DUPLICATE_ACTIVE_REQUEST',
    }
  }

  // 2. Insert DSR request row
  const now = new Date().toISOString()
  const { data: request, error: insertError } = await admin
    .from('data_subject_requests')
    .insert({
      requester_account_user_id: params.accountUserId,
      request_type: params.requestType,
      status: 'RECEIVED',
      details: params.details || {},
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()

  if (insertError || !request) {
    console.error('[privacy:createDSR] Failed to insert request:', insertError?.message)
    return {
      success: false,
      error: 'Erro ao registrar solicitação de privacidade. Tente novamente mais tarde.',
      code: 'DATABASE_ERROR',
    }
  }

  // 3. Record audit event in append-only event ledger
  const { error: eventError } = await admin
    .from('data_subject_request_events')
    .insert({
      request_id: request.id,
      event_type: 'REQUEST_CREATED' as DsrEventType,
      actor_account_user_id: params.accountUserId,
      actor_role: 'SUBJECT' as DsrActorRole,
      metadata: { requestType: params.requestType, details: params.details || {} },
      created_at: now,
    })

  if (eventError) {
    console.error('[privacy:createDSR] Failed to record initial event:', eventError.message)
    // We log the error, but the request was recorded
  }

  return {
    success: true,
    request: {
      id: request.id,
      requestType: request.request_type as LgpdRight,
      status: request.status as DsrStatus,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
      completedAt: request.completed_at,
      cancelledAt: request.cancelled_at,
      resolutionCode: request.resolution_code,
    },
  }
}

/**
 * Lists all Data Subject Requests belonging to the given account user.
 * Strips internal operator/resolution notes to maintain privacy safe boundaries.
 */
export async function getAccountDataSubjectRequests(
  accountUserId: string
): Promise<DataSubjectRequestSafeDTO[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('data_subject_requests')
    .select('id, request_type, status, created_at, updated_at, completed_at, cancelled_at, resolution_code')
    .eq('requester_account_user_id', accountUserId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((r) => ({
    id: r.id,
    requestType: r.request_type as LgpdRight,
    status: r.status as DsrStatus,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    completedAt: r.completed_at,
    cancelledAt: r.cancelled_at,
    resolutionCode: r.resolution_code,
  }))
}

/**
 * Admin query service for listing and managing Data Subject Requests.
 * Requires administrator role in caller context.
 */
export async function getAdminDataSubjectRequests(options?: {
  status?: DsrStatus
  requestType?: LgpdRight
  limit?: number
}): Promise<DataSubjectRequest[]> {
  const admin = createAdminClient()
  let query = admin
    .from('data_subject_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (options?.status) {
    query = query.eq('status', options.status)
  }
  if (options?.requestType) {
    query = query.eq('request_type', options.requestType)
  }
  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query
  if (error || !data) return []
  return data as DataSubjectRequest[]
}

/**
 * Admin query for fetching the event ledger of a given request.
 */
export async function getDsrEvents(requestId: string): Promise<DataSubjectRequestEvent[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('data_subject_request_events')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data as DataSubjectRequestEvent[]
}
