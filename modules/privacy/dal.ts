import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  DataSubjectRequest,
  DataSubjectRequestEvent,
  DataSubjectRequestSafeDTO,
  DataSubjectRequestEventSafeDTO,
  DataSubjectSummaryDTO,
  SubjectRole,
  LgpdRight,
  DsrStatus,
  DsrEventType,
  DsrActorRole,
} from './types'
import { resolveSubject } from './subject-resolver'


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

/**
 * User-safe timeline retrieval for a specific request.
 * Strictly verifies ownership by accountUserId. Strips internal operator notes and metadata.
 */
export async function getAccountDsrEventsSafe(
  accountUserId: string,
  requestId: string
): Promise<DataSubjectRequestEventSafeDTO[] | null> {
  const admin = createAdminClient()

  // 1. Verify ownership of the request
  const { data: request, error: requestError } = await admin
    .from('data_subject_requests')
    .select('id, requester_account_user_id')
    .eq('id', requestId)
    .eq('requester_account_user_id', accountUserId)
    .maybeSingle()

  if (requestError || !request) {
    return null
  }

  // 2. Fetch events ordered chronologically
  const { data: events, error: eventsError } = await admin
    .from('data_subject_request_events')
    .select('id, request_id, event_type, actor_role, created_at')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })

  if (eventsError || !events) {
    return []
  }

  return events.map((e) => ({
    id: e.id,
    requestId: e.request_id,
    eventType: e.event_type as DsrEventType,
    actorRole: e.actor_role as DsrActorRole,
    createdAt: e.created_at,
  }))
}

/**
 * Allows a data subject to cancel their own active request in RECEIVED, IDENTITY_VERIFICATION_REQUIRED, or IN_REVIEW status.
 */
export async function cancelAccountDataSubjectRequest(
  accountUserId: string,
  requestId: string
): Promise<{ success: boolean; error?: string; code?: string }> {
  const admin = createAdminClient()

  // 1. Verify request exists and belongs to this user
  const { data: request, error: fetchError } = await admin
    .from('data_subject_requests')
    .select('id, requester_account_user_id, status')
    .eq('id', requestId)
    .eq('requester_account_user_id', accountUserId)
    .maybeSingle()

  if (fetchError || !request) {
    return { success: false, error: 'Solicitação não encontrada.', code: 'NOT_FOUND' }
  }

  // 2. Verify state is cancellable by user
  const cancellableStatuses: DsrStatus[] = ['RECEIVED', 'IDENTITY_VERIFICATION_REQUIRED', 'IN_REVIEW']
  if (!cancellableStatuses.includes(request.status as DsrStatus)) {
    return {
      success: false,
      error: 'Esta solicitação não pode mais ser cancelada pelo usuário.',
      code: 'INVALID_STATUS',
    }
  }

  const now = new Date().toISOString()

  // 3. Update status to CANCELLED
  const { error: updateError } = await admin
    .from('data_subject_requests')
    .update({
      status: 'CANCELLED' as DsrStatus,
      cancelled_at: now,
      updated_at: now,
    })
    .eq('id', requestId)

  if (updateError) {
    console.error('[privacy:cancelDSR] Failed to update status:', updateError.message)
    return { success: false, error: 'Erro ao cancelar solicitação.', code: 'DATABASE_ERROR' }
  }

  // 4. Record audit event
  await admin.from('data_subject_request_events').insert({
    request_id: requestId,
    event_type: 'REQUEST_CANCELLED' as DsrEventType,
    actor_account_user_id: accountUserId,
    actor_role: 'SUBJECT' as DsrActorRole,
    metadata: { cancelledBy: 'SUBJECT' },
    created_at: now,
  })

  return { success: true }
}

/**
 * Resolves safe personal data summary for the authenticated subject.
 * Guaranteed zero exposure of secrets, hashes, internal notes, or tokens.
 */
export async function getAccountDataSummary(
  accountUserId: string
): Promise<DataSubjectSummaryDTO | null> {
  const subject = await resolveSubject(accountUserId)
  if (!subject) return null

  const admin = createAdminClient()

  // 1. Fetch account record
  const { data: accountRow } = await admin
    .from('account_users')
    .select('role, status, terms_version, terms_accepted_at, privacy_version, privacy_accepted_at, created_at')
    .eq('id', subject.accountId)
    .single()

  // 2. Total and active requests counts
  const { data: dsrRows } = await admin
    .from('data_subject_requests')
    .select('id, status')
    .eq('requester_account_user_id', subject.accountId)

  const allRequests = dsrRows || []
  const totalRequestsCount = allRequests.length
  const activeRequestsCount = allRequests.filter((r) =>
    ['RECEIVED', 'IDENTITY_VERIFICATION_REQUIRED', 'IN_REVIEW', 'PROCESSING'].includes(r.status)
  ).length

  let advertiserSummary = null
  let clientSummary = null

  if (subject.role === 'ADVERTISER' && subject.profileId) {
    const profileId = subject.profileId

    const [
      { data: profileRow },
      { count: locCount },
      { count: offCount },
      { count: photosCount },
      { count: videosCount },
      { count: boostsCount },
      { data: subRow },
    ] = await Promise.all([
      admin.from('professional_profiles').select('stage_name, slug, published_at').eq('id', profileId).maybeSingle(),
      admin.from('professional_profile_locations').select('*', { count: 'exact', head: true }).eq('profile_id', profileId),
      admin.from('professional_profile_offerings').select('*', { count: 'exact', head: true }).eq('profile_id', profileId),
      admin.from('profile_media').select('*', { count: 'exact', head: true }).eq('profile_id', profileId),
      admin.from('profile_videos').select('*', { count: 'exact', head: true }).eq('profile_id', profileId),
      admin.from('profile_boosts').select('*', { count: 'exact', head: true }).eq('profile_id', profileId).eq('status', 'ACTIVE'),
      admin.from('subscriptions').select('plan:subscription_plans(code)').eq('account_user_id', subject.accountId).eq('status', 'ACTIVE').maybeSingle(),
    ])

    advertiserSummary = {
      stageName: profileRow?.stage_name ?? subject.stageName,
      slug: profileRow?.slug ?? null,
      publishedAt: profileRow?.published_at ?? null,
      locationsCount: locCount ?? 0,
      offeringsCount: offCount ?? 0,
      photosCount: photosCount ?? 0,
      videosCount: videosCount ?? 0,
      activeBoostsCount: boostsCount ?? 0,
      subscriptionPlan: (subRow?.plan as { code?: string })?.code ?? null,
    }
  } else if (subject.role === 'CLIENT') {
    const [{ data: memRow }, { count: reviewsCount }] = await Promise.all([
      admin.from('client_memberships').select('membership_type, valid_until').eq('account_id', subject.accountId).maybeSingle(),
      admin.from('professional_reviews').select('*', { count: 'exact', head: true }).eq('reviewer_account_user_id', subject.accountId),
    ])

    clientSummary = {
      membershipType: memRow?.membership_type ?? subject.clientMembershipType ?? 'FREE',
      validUntil: memRow?.valid_until ?? null,
      authoredReviewsCount: reviewsCount ?? 0,
    }
  }

  return {
    accountId: subject.accountId,
    role: subject.role as SubjectRole,
    email: subject.email,
    phone: subject.phone,
    status: accountRow?.status ?? subject.status,
    createdAt: accountRow?.created_at ?? null,
    legalAcceptance: {
      termsVersion: accountRow?.terms_version ?? null,
      termsAcceptedAt: accountRow?.terms_accepted_at ?? null,
      privacyVersion: accountRow?.privacy_version ?? null,
      privacyAcceptedAt: accountRow?.privacy_accepted_at ?? null,
    },
    advertiserSummary,
    clientSummary,
    totalRequestsCount,
    activeRequestsCount,
  }
}

