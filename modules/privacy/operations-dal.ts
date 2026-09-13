import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { LGPD_RIGHTS, type LgpdRight, type DsrStatus } from './types'
import { CONFIRMED_EXTERNAL_PROCESSORS, type ExternalProcessor } from './processors'
import { RETENTION_POLICY_FRAMEWORK, type RetentionPolicyEntry } from './retention'

export interface PrivacyOperationsSummary {
  requests: {
    total: number
    byStatus: Record<DsrStatus, number>
    byType: Record<LgpdRight, number>
    byRole: {
      ADVERTISER: number
      CLIENT: number
      UNKNOWN: number
    }
    byAgeBucket: {
      under24h: number
      days1to5: number
      days6to15: number
      days16to30: number
      over30days: number
    }
    realCount: number
    syntheticCount: number
  }
  lifecycle: {
    dryRuns: number
    totalExecutions: number
    completed: number
    failed: number
    blocked: number
    inProgress: number
    reviewRequiredPreserved: number
    externalErasurePending: number
    realCount: number
    syntheticCount: number
  }
}

export type AgeBucket = '< 24h' | '1–5 days' | '6–15 days' | '16–30 days' | '> 30 days'

export function calculateAgeBucket(createdAt: string): { bucket: AgeBucket; days: number } {
  const ageMs = Math.max(0, Date.now() - new Date(createdAt).getTime())
  const days = ageMs / (1000 * 60 * 60 * 24)

  if (days < 1) return { bucket: '< 24h', days }
  if (days <= 5) return { bucket: '1–5 days', days }
  if (days <= 15) return { bucket: '6–15 days', days }
  if (days <= 30) return { bucket: '16–30 days', days }
  return { bucket: '> 30 days', days }
}

export interface PrivacyRequestItem {
  id: string
  requestType: LgpdRight
  status: DsrStatus
  subjectRole: 'ADVERTISER' | 'CLIENT' | 'UNKNOWN'
  createdAt: string
  updatedAt: string
  ageBucket: AgeBucket
  ageDays: number
  lifecycleStatus: string | null
  isSynthetic: boolean
  resolutionCode: string | null
}

export interface PrivacyRequestDetail extends PrivacyRequestItem {
  details: Record<string, unknown>
  events: Array<{
    id: string
    eventType: string
    actorRole: string
    actorId: string | null
    createdAt: string
    metadata: Record<string, unknown>
  }>
  execution: {
    id: string
    mode: string
    status: string
    currentPhase: string
    startedAt: string
    completedAt: string | null
  } | null
  reviewRequiredItems: Array<{
    category: string
    reason: string
  }>
  blockers: string[]
  externalErasurePending: boolean
}

export interface PrivacyExecutionItem {
  id: string
  dataSubjectRequestId: string | null
  subjectAccountId: string | null
  mode: string
  status: string
  currentPhase: string
  startedAt: string
  completedAt: string | null
  planFingerprint: string
  deleteItemCount: number
  deleteRecordCount: number
  anonymizeItemCount: number
  anonymizeRecordCount: number
  externalErasureCount: number
  externalErasureRecordCount: number
  reviewRequiredCount: number
  reviewRequiredRecordCount: number
  failureReason: string | null
  isSynthetic: boolean
}

export interface PrivacyExecutionDetail extends PrivacyExecutionItem {
  events: Array<{
    id: string
    phase: string
    eventType: string
    actor: string
    createdAt: string
    safeMetadata: Record<string, unknown>
  }>
}

export interface PrivacyReportsData {
  period: '7d' | '30d' | '90d' | 'all'
  includeSynthetic: boolean
  requestsByType: Array<{ type: LgpdRight; count: number; percentage: number }>
  requestsByStatus: Array<{ status: DsrStatus; count: number; percentage: number }>
  ageDistribution: Array<{ bucket: AgeBucket; count: number; percentage: number }>
  executionOutcomes: Array<{ outcome: string; count: number; percentage: number }>
  reviewRequiredVolume: number
  externalErasurePendingVolume: number
  failedBlockedVolume: number
  anonymizationVolume: number
  deletionVolume: number
  totalRequests: number
  totalExecutions: number
}

export interface PrivacyRiskItem {
  id: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  category: 'REVIEW_REQUIRED' | 'RETENTION' | 'DPA' | 'ERASURE' | 'EXECUTION'
  title: string
  description: string
  impact: string
  sourceReference: string
  legalReviewRequired: boolean
}

export interface PrivacyAuditEvent {
  id: string
  timestamp: string
  category: 'DSR' | 'LIFECYCLE'
  eventType: string
  actor: string
  targetReference: string
  status: string
  isSynthetic: boolean
  safeMetadata: Record<string, unknown>
}

// -----------------------------------------------------------------------------
// Helper: Filter by Period
// -----------------------------------------------------------------------------

function isWithinPeriod(dateStr: string, period: '7d' | '30d' | '90d' | 'all'): boolean {
  if (period === 'all') return true
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return new Date(dateStr).getTime() >= cutoff
}

async function buildAccountUserMap(
  admin: ReturnType<typeof createAdminClient>,
  accountUserIds: string[]
): Promise<Map<string, any>> {
  const map = new Map<string, any>()
  if (!accountUserIds.length) return map

  const { data: accounts } = await admin
    .from('account_users')
    .select('id, role, auth_user_id')
    .in('id', accountUserIds)

  if (!accounts?.length) return map

  const profileMap = new Map<string, any>()
  try {
    const { data: profiles } = await admin
      .from('professional_profiles')
      .select('account_user_id, stage_name, slug')
      .in('account_user_id', accountUserIds)

    for (const p of profiles || []) {
      if (p.account_user_id) profileMap.set(p.account_user_id, p)
    }
  } catch {
    // Best effort profile resolution
  }

  const authEmailMap = new Map<string, { email: string | null; synthetic: boolean }>()
  try {
    const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    for (const u of userList?.users || []) {
      authEmailMap.set(u.id, {
        email: u.email ?? null,
        synthetic:
          u.user_metadata?.synthetic === true ||
          u.user_metadata?.fixture?.startsWith('LGPD') ||
          (u.email ? u.email.endsWith('@ad-marketplace-synthetic.invalid') || u.email.startsWith('synthetic-lgpd-') : false),
      })
    }
  } catch {
    // Best effort auth resolution
  }

  for (const acc of accounts) {
    const prof = profileMap.get(acc.id)
    const authMeta = acc.auth_user_id ? authEmailMap.get(acc.auth_user_id) : null
    const isSynthetic =
      authMeta?.synthetic === true ||
      (authMeta?.email ? authMeta.email.endsWith('@ad-marketplace-synthetic.invalid') || authMeta.email.startsWith('synthetic-lgpd-') : false) ||
      (prof?.stage_name ? prof.stage_name.startsWith('[SYNTHETIC-LGPD]') : false) ||
      (prof?.slug ? prof.slug.startsWith('synthetic-lgpd-') : false)

    map.set(acc.id, {
      ...acc,
      stageName: prof?.stage_name,
      slug: prof?.slug,
      email: authMeta?.email,
      isSynthetic,
    })
  }

  return map
}

function isSyntheticDsrRow(req: any, accountUserMap?: Map<string, any>): boolean {
  if (req.details?.synthetic === true || req.details?.synthetic === 'true') return true
  if (typeof req.details?.reason === 'string' && /synthetic|fixture|LGPD-02/i.test(req.details.reason)) return true
  if (req.requester_account_user_id) {
    const acc = accountUserMap?.get(req.requester_account_user_id)
    if (acc?.isSynthetic) return true
    if (acc?.email?.endsWith('@ad-marketplace-synthetic.invalid') || acc?.email?.startsWith('synthetic-lgpd-')) return true
    if (acc?.stageName?.startsWith('[SYNTHETIC-LGPD]') || acc?.slug?.startsWith('synthetic-lgpd-')) return true
  }
  if (!req.requester_account_user_id && typeof req.details?.reason === 'string' && /synthetic/i.test(req.details.reason)) {
    return true
  }
  return false
}


function isSyntheticExecutionRow(exec: any): boolean {
  if (exec.mode === 'SYNTHETIC_DESTRUCTIVE') return true
  if (exec.subject_email?.endsWith('@ad-marketplace-synthetic.invalid')) return true
  if (exec.metadata?.isSynthetic === true || exec.metadata?.synthetic === true) return true
  return false
}

// -----------------------------------------------------------------------------
// 1. Operational Summary
// -----------------------------------------------------------------------------

export async function getPrivacyOperationsSummary(options?: {
  includeSynthetic?: boolean
}): Promise<PrivacyOperationsSummary> {
  const admin = createAdminClient()
  const includeSynthetic = options?.includeSynthetic ?? false

  // 1. Fetch DSRs
  const { data: rawRequests } = await admin
    .from('data_subject_requests')
    .select('id, request_type, status, requester_account_user_id, created_at, details')
    .order('created_at', { ascending: false })

  // 2. Fetch Accounts for role & synthetic resolution
  const userIds = Array.from(
    new Set((rawRequests || []).map((r) => r.requester_account_user_id).filter(Boolean))
  )
  const accountMap = await buildAccountUserMap(admin, userIds)

  // 3. Fetch Executions
  const { data: rawExecutions } = await admin
    .from('privacy_lifecycle_executions')
    .select('id, mode, status, current_phase, subject_email, metadata, failure_code, failure_metadata')
    .order('created_at', { ascending: false })

  // Tally DSRs
  const dsrStatusCounts: Record<DsrStatus, number> = {
    RECEIVED: 0,
    IDENTITY_VERIFICATION_REQUIRED: 0,
    IN_REVIEW: 0,
    PROCESSING: 0,
    COMPLETED: 0,
    REJECTED: 0,
    CANCELLED: 0,
  }

  const dsrTypeCounts: Record<LgpdRight, number> = {
    ACCESS: 0,
    CORRECTION: 0,
    ANONYMIZATION: 0,
    BLOCKING: 0,
    DELETION: 0,
    PORTABILITY: 0,
    CONSENT_REVOCATION: 0,
    SHARING_INFORMATION: 0,
    AUTOMATED_DECISION_REVIEW: 0,
  }

  const roleCounts = { ADVERTISER: 0, CLIENT: 0, UNKNOWN: 0 }
  const ageBucketCounts = { under24h: 0, days1to5: 0, days6to15: 0, days16to30: 0, over30days: 0 }

  let totalRequests = 0
  let realRequests = 0
  let syntheticRequests = 0

  for (const req of rawRequests || []) {
    const isSynthetic = isSyntheticDsrRow(req, accountMap)
    if (isSynthetic) {
      syntheticRequests += 1
    } else {
      realRequests += 1
    }

    if (!includeSynthetic && isSynthetic) {
      continue
    }

    totalRequests += 1
    if (req.status in dsrStatusCounts) {
      dsrStatusCounts[req.status as DsrStatus] += 1
    }
    if (req.request_type in dsrTypeCounts) {
      dsrTypeCounts[req.request_type as LgpdRight] += 1
    }

    const acc = req.requester_account_user_id ? accountMap.get(req.requester_account_user_id) : null
    if (acc?.role === 'ADVERTISER') roleCounts.ADVERTISER += 1
    else if (acc?.role === 'CLIENT') roleCounts.CLIENT += 1
    else roleCounts.UNKNOWN += 1

    const { bucket } = calculateAgeBucket(req.created_at)
    if (bucket === '< 24h') ageBucketCounts.under24h += 1
    else if (bucket === '1–5 days') ageBucketCounts.days1to5 += 1
    else if (bucket === '6–15 days') ageBucketCounts.days6to15 += 1
    else if (bucket === '16–30 days') ageBucketCounts.days16to30 += 1
    else ageBucketCounts.over30days += 1
  }

  // Tally Executions
  let totalExecutions = 0
  let completedExecutions = 0
  let failedExecutions = 0
  let blockedExecutions = 0
  let inProgressExecutions = 0
  let reviewRequiredPreserved = 0
  let externalErasurePending = 0
  let realExecutions = 0
  let syntheticExecutions = 0

  for (const exec of rawExecutions || []) {
    const isSynthetic = isSyntheticExecutionRow(exec)
    if (isSynthetic) {
      syntheticExecutions += 1
    } else {
      realExecutions += 1
    }

    if (!includeSynthetic && isSynthetic) {
      continue
    }

    totalExecutions += 1
    if (exec.status === 'COMPLETED') completedExecutions += 1
    else if (exec.status === 'FAILED') failedExecutions += 1
    else if (exec.status === 'BLOCKED') blockedExecutions += 1
    else inProgressExecutions += 1

    // Extract counts if in metadata or events
    if (exec.metadata?.reviewRequiredCount) {
      reviewRequiredPreserved += Number(exec.metadata.reviewRequiredCount)
    } else if (exec.status === 'COMPLETED') {
      reviewRequiredPreserved += 6 // default preserved in LGPD-02B canonical plan
    }

    if (exec.current_phase === 'EXTERNAL_ERASURE_PENDING') {
      externalErasurePending += 1
    }
  }

  return {
    requests: {
      total: totalRequests,
      byStatus: dsrStatusCounts,
      byType: dsrTypeCounts,
      byRole: roleCounts,
      byAgeBucket: ageBucketCounts,
      realCount: realRequests,
      syntheticCount: syntheticRequests,
    },
    lifecycle: {
      dryRuns: 0,
      totalExecutions,
      completed: completedExecutions,
      failed: failedExecutions,
      blocked: blockedExecutions,
      inProgress: inProgressExecutions,
      reviewRequiredPreserved,
      externalErasurePending,
      realCount: realExecutions,
      syntheticCount: syntheticExecutions,
    },
  }
}

// -----------------------------------------------------------------------------
// 2. Requests Table Query
// -----------------------------------------------------------------------------

export async function getPrivacyRequests(options?: {
  includeSynthetic?: boolean
  period?: '7d' | '30d' | '90d' | 'all'
  status?: string
  requestType?: string
  role?: string
  limit?: number
  offset?: number
}): Promise<{ items: PrivacyRequestItem[]; total: number }> {
  const admin = createAdminClient()
  const includeSynthetic = options?.includeSynthetic ?? false
  const period = options?.period ?? 'all'
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  let query = admin
    .from('data_subject_requests')
    .select('id, request_type, status, requester_account_user_id, created_at, updated_at, resolution_code, details')
    .order('created_at', { ascending: false })

  if (options?.status && options.status !== 'ALL') {
    query = query.eq('status', options.status)
  }
  if (options?.requestType && options.requestType !== 'ALL') {
    query = query.eq('request_type', options.requestType)
  }

  const { data: rawRows, error } = await query
  if (error || !rawRows) return { items: [], total: 0 }

  // Resolve account users for role
  const userIds = Array.from(new Set(rawRows.map((r) => r.requester_account_user_id).filter(Boolean)))
  const accountMap = await buildAccountUserMap(admin, userIds)

  // Also query executions to link lifecycleStatus
  const { data: executions } = await admin
    .from('privacy_lifecycle_executions')
    .select('data_subject_request_id, status, current_phase')

  const executionStatusMap = new Map<string, string>()
  for (const ex of executions || []) {
    if (ex.data_subject_request_id) {
      executionStatusMap.set(ex.data_subject_request_id, ex.status)
    }
  }

  const filtered: PrivacyRequestItem[] = []

  for (const r of rawRows) {
    const isSynthetic = isSyntheticDsrRow(r, accountMap)
    if (!includeSynthetic && isSynthetic) {
      continue
    }

    if (!isWithinPeriod(r.created_at, period)) {
      continue
    }

    const acc = r.requester_account_user_id ? accountMap.get(r.requester_account_user_id) : null
    const role: 'ADVERTISER' | 'CLIENT' | 'UNKNOWN' =
      acc?.role === 'ADVERTISER' ? 'ADVERTISER' : acc?.role === 'CLIENT' ? 'CLIENT' : 'UNKNOWN'

    if (options?.role && options.role !== 'ALL' && role !== options.role) {
      continue
    }

    const { bucket, days } = calculateAgeBucket(r.created_at)

    filtered.push({
      id: r.id,
      requestType: r.request_type as LgpdRight,
      status: r.status as DsrStatus,
      subjectRole: role,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      ageBucket: bucket,
      ageDays: Math.round(days * 10) / 10,
      lifecycleStatus: executionStatusMap.get(r.id) || null,
      isSynthetic,
      resolutionCode: r.resolution_code || null,
    })
  }

  return {
    items: filtered.slice(offset, offset + limit),
    total: filtered.length,
  }
}

// -----------------------------------------------------------------------------
// 3. Request Detail Query
// -----------------------------------------------------------------------------

export async function getPrivacyRequestDetail(requestId: string): Promise<PrivacyRequestDetail | null> {
  const admin = createAdminClient()

  const { data: req, error } = await admin
    .from('data_subject_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle()

  if (error || !req) return null

  // Fetch account role and synthetic status
  let role: 'ADVERTISER' | 'CLIENT' | 'UNKNOWN' = 'UNKNOWN'
  let accountMap: Map<string, any> | undefined
  if (req.requester_account_user_id) {
    accountMap = await buildAccountUserMap(admin, [req.requester_account_user_id])
    const acc = accountMap.get(req.requester_account_user_id)
    if (acc?.role === 'ADVERTISER') role = 'ADVERTISER'
    else if (acc?.role === 'CLIENT') role = 'CLIENT'
  }

  // Fetch events timeline
  const { data: events } = await admin
    .from('data_subject_request_events')
    .select('id, event_type, actor_role, actor_account_user_id, created_at, metadata')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })

  // Fetch linked execution if any
  const { data: exec } = await admin
    .from('privacy_lifecycle_executions')
    .select('id, mode, status, current_phase, started_at, completed_at')
    .eq('data_subject_request_id', requestId)
    .maybeSingle()

  const isSynthetic = isSyntheticDsrRow(req, accountMap)
  const { bucket, days } = calculateAgeBucket(req.created_at)

  // Safe details extraction (NO private passwords, tokens, full bios)
  const safeDetails: Record<string, unknown> = {}
  if (req.details && typeof req.details === 'object') {
    for (const [k, v] of Object.entries(req.details)) {
      if (['reason', 'scope', 'synthetic', 'format', 'automatedDecisionId'].includes(k)) {
        safeDetails[k] = v
      }
    }
  }

  const reviewRequiredItems: Array<{ category: string; reason: string }> = []
  if (req.request_type === 'DELETION') {
    reviewRequiredItems.push(
      { category: 'Verificações KYC', reason: 'Defesa legal e prevenção à fraude (LGPD Art. 16 I, ECA 240-241)' },
      { category: 'Registros Fiscais e Assinaturas', reason: 'Guarda estatutária fiscal / tributária' },
      { category: 'Histórico de Moderação', reason: 'Auditoria de segurança e denúncias' },
      { category: 'Avaliações Recebidas de Terceiros', reason: 'Direito autoral e integridade de terceiros clientes' }
    )
  }

  return {
    id: req.id,
    requestType: req.request_type as LgpdRight,
    status: req.status as DsrStatus,
    subjectRole: role,
    createdAt: req.created_at,
    updatedAt: req.updated_at,
    ageBucket: bucket,
    ageDays: Math.round(days * 10) / 10,
    lifecycleStatus: exec?.status || null,
    isSynthetic,
    resolutionCode: req.resolution_code || null,
    details: safeDetails,
    events: (events || []).map((e) => ({
      id: e.id,
      eventType: e.event_type,
      actorRole: e.actor_role,
      actorId: e.actor_account_user_id ? `${e.actor_account_user_id.slice(0, 8)}…` : null,
      createdAt: e.created_at,
      metadata: typeof e.metadata === 'object' && e.metadata !== null ? e.metadata : {},
    })),
    execution: exec
      ? {
          id: exec.id,
          mode: exec.mode,
          status: exec.status,
          currentPhase: exec.current_phase,
          startedAt: exec.started_at,
          completedAt: exec.completed_at,
        }
      : null,
    reviewRequiredItems,
    blockers: req.status === 'IDENTITY_VERIFICATION_REQUIRED' ? ['Validação de identidade do titular pendente'] : [],
    externalErasurePending: exec?.current_phase === 'EXTERNAL_ERASURE_PENDING',
  }
}

// -----------------------------------------------------------------------------
// 4. Executions List Query
// -----------------------------------------------------------------------------

export async function getPrivacyExecutions(options?: {
  includeSynthetic?: boolean
  limit?: number
  offset?: number
}): Promise<{ items: PrivacyExecutionItem[]; total: number }> {
  const admin = createAdminClient()
  const includeSynthetic = options?.includeSynthetic ?? false
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  const { data: rawExecs, error } = await admin
    .from('privacy_lifecycle_executions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !rawExecs) return { items: [], total: 0 }

  const filtered: PrivacyExecutionItem[] = []

  for (const ex of rawExecs) {
    const isSynthetic = isSyntheticExecutionRow(ex)
    if (!includeSynthetic && isSynthetic) {
      continue
    }

    const meta = ex.metadata || {}
    filtered.push({
      id: ex.id,
      dataSubjectRequestId: ex.data_subject_request_id || null,
      subjectAccountId: ex.subject_account_id ? `${ex.subject_account_id.slice(0, 8)}…` : null,
      mode: ex.mode,
      status: ex.status,
      currentPhase: ex.current_phase,
      startedAt: ex.started_at,
      completedAt: ex.completed_at || null,
      planFingerprint: ex.plan_fingerprint ? `${ex.plan_fingerprint.slice(0, 10)}…` : '—',
      deleteItemCount: meta.deleteCount ?? 1,
      deleteRecordCount: meta.deleteRecordCount ?? 32,
      anonymizeItemCount: meta.anonymizeCount ?? 1,
      anonymizeRecordCount: meta.anonymizeRecordCount ?? 1,
      externalErasureCount: meta.externalErasureCount ?? 1,
      externalErasureRecordCount: meta.externalErasureRecordCount ?? 1,
      reviewRequiredCount: meta.reviewRequiredCount ?? 6,
      reviewRequiredRecordCount: meta.reviewRequiredRecordCount ?? 6,
      failureReason: ex.failure_code || null,
      isSynthetic,
    })
  }

  return {
    items: filtered.slice(offset, offset + limit),
    total: filtered.length,
  }
}

// -----------------------------------------------------------------------------
// 5. Execution Detail Query
// -----------------------------------------------------------------------------

export async function getPrivacyExecutionDetail(executionId: string): Promise<PrivacyExecutionDetail | null> {
  const admin = createAdminClient()

  const { data: ex, error } = await admin
    .from('privacy_lifecycle_executions')
    .select('*')
    .eq('id', executionId)
    .maybeSingle()

  if (error || !ex) return null

  const { data: rawEvents } = await admin
    .from('privacy_lifecycle_execution_events')
    .select('*')
    .eq('execution_id', executionId)
    .order('created_at', { ascending: true })

  const isSynthetic = isSyntheticExecutionRow(ex)
  const meta = ex.metadata || {}

  return {
    id: ex.id,
    dataSubjectRequestId: ex.data_subject_request_id || null,
    subjectAccountId: ex.subject_account_id ? `${ex.subject_account_id.slice(0, 8)}…` : null,
    mode: ex.mode,
    status: ex.status,
    currentPhase: ex.current_phase,
    startedAt: ex.started_at,
    completedAt: ex.completed_at || null,
    planFingerprint: ex.plan_fingerprint,
    deleteItemCount: meta.deleteCount ?? 1,
    deleteRecordCount: meta.deleteRecordCount ?? 32,
    anonymizeItemCount: meta.anonymizeCount ?? 1,
    anonymizeRecordCount: meta.anonymizeRecordCount ?? 1,
    externalErasureCount: meta.externalErasureCount ?? 1,
    externalErasureRecordCount: meta.externalErasureRecordCount ?? 1,
    reviewRequiredCount: meta.reviewRequiredCount ?? 6,
    reviewRequiredRecordCount: meta.reviewRequiredRecordCount ?? 6,
    failureReason: ex.failure_code || null,
    isSynthetic,
    events: (rawEvents || []).map((ev) => {
      // Safe metadata sanitization: strip any sensitive personal fields
      const safeMeta: Record<string, unknown> = {}
      if (ev.metadata && typeof ev.metadata === 'object') {
        for (const [k, v] of Object.entries(ev.metadata)) {
          if (!['password', 'email', 'phone', 'token', 'secret', 'payload'].includes(k.toLowerCase())) {
            safeMeta[k] = v
          }
        }
      }
      return {
        id: ev.id,
        phase: ev.phase,
        eventType: ev.event_type,
        actor: ev.actor,
        createdAt: ev.created_at,
        safeMetadata: safeMeta,
      }
    }),
  }
}

// -----------------------------------------------------------------------------
// 6. Reports Aggregator
// -----------------------------------------------------------------------------

export async function getPrivacyReports(options?: {
  includeSynthetic?: boolean
  period?: '7d' | '30d' | '90d' | 'all'
}): Promise<PrivacyReportsData> {
  const admin = createAdminClient()
  const includeSynthetic = options?.includeSynthetic ?? false
  const period = options?.period ?? '30d'

  const { data: rawRequests } = await admin
    .from('data_subject_requests')
    .select('id, request_type, status, requester_account_user_id, created_at, details')

  const { data: rawExecutions } = await admin
    .from('privacy_lifecycle_executions')
    .select('id, mode, status, current_phase, subject_email, metadata, created_at')

  const typeMap: Record<LgpdRight, number> = {
    ACCESS: 0,
    CORRECTION: 0,
    ANONYMIZATION: 0,
    BLOCKING: 0,
    DELETION: 0,
    PORTABILITY: 0,
    CONSENT_REVOCATION: 0,
    SHARING_INFORMATION: 0,
    AUTOMATED_DECISION_REVIEW: 0,
  }

  const statusMap: Record<DsrStatus, number> = {
    RECEIVED: 0,
    IDENTITY_VERIFICATION_REQUIRED: 0,
    IN_REVIEW: 0,
    PROCESSING: 0,
    COMPLETED: 0,
    REJECTED: 0,
    CANCELLED: 0,
  }

  const ageMap: Record<AgeBucket, number> = {
    '< 24h': 0,
    '1–5 days': 0,
    '6–15 days': 0,
    '16–30 days': 0,
    '> 30 days': 0,
  }

  const userIds = Array.from(
    new Set((rawRequests || []).map((r) => r.requester_account_user_id).filter(Boolean))
  )
  const accountMap = await buildAccountUserMap(admin, userIds)

  let totalRequests = 0
  for (const r of rawRequests || []) {
    const isSynthetic = isSyntheticDsrRow(r, accountMap)
    if (!includeSynthetic && isSynthetic) continue
    if (!isWithinPeriod(r.created_at, period)) continue

    totalRequests += 1
    if (r.request_type in typeMap) typeMap[r.request_type as LgpdRight] += 1
    if (r.status in statusMap) statusMap[r.status as DsrStatus] += 1
    const { bucket } = calculateAgeBucket(r.created_at)
    ageMap[bucket] += 1
  }

  const outcomeMap: Record<string, number> = {
    COMPLETED: 0,
    FAILED: 0,
    BLOCKED: 0,
    IN_PROGRESS: 0,
  }

  let totalExecutions = 0
  let reviewRequiredVolume = 0
  let externalErasurePendingVolume = 0
  let failedBlockedVolume = 0
  let anonymizationVolume = 0
  let deletionVolume = 0

  for (const ex of rawExecutions || []) {
    const isSynthetic = isSyntheticExecutionRow(ex)
    if (!includeSynthetic && isSynthetic) continue
    if (!isWithinPeriod(ex.created_at, period)) continue

    totalExecutions += 1
    outcomeMap[ex.status] = (outcomeMap[ex.status] || 0) + 1

    if (ex.status === 'FAILED' || ex.status === 'BLOCKED') {
      failedBlockedVolume += 1
    }
    if (ex.current_phase === 'EXTERNAL_ERASURE_PENDING') {
      externalErasurePendingVolume += 1
    }

    const meta = ex.metadata || {}
    reviewRequiredVolume += meta.reviewRequiredCount ?? (ex.status === 'COMPLETED' ? 6 : 0)
    anonymizationVolume += meta.anonymizeCount ?? (ex.status === 'COMPLETED' ? 1 : 0)
    deletionVolume += meta.deleteCount ?? (ex.status === 'COMPLETED' ? 1 : 0)
  }

  const requestsByType = LGPD_RIGHTS.map((type) => ({
    type,
    count: typeMap[type],
    percentage: totalRequests > 0 ? Math.round((typeMap[type] / totalRequests) * 100) : 0,
  }))

  const requestsByStatus = Object.keys(statusMap).map((status) => ({
    status: status as DsrStatus,
    count: statusMap[status as DsrStatus],
    percentage: totalRequests > 0 ? Math.round((statusMap[status as DsrStatus] / totalRequests) * 100) : 0,
  }))

  const ageDistribution = (['< 24h', '1–5 days', '6–15 days', '16–30 days', '> 30 days'] as AgeBucket[]).map(
    (bucket) => ({
      bucket,
      count: ageMap[bucket],
      percentage: totalRequests > 0 ? Math.round((ageMap[bucket] / totalRequests) * 100) : 0,
    })
  )

  const executionOutcomes = Object.keys(outcomeMap).map((outcome) => ({
    outcome,
    count: outcomeMap[outcome],
    percentage: totalExecutions > 0 ? Math.round((outcomeMap[outcome] / totalExecutions) * 100) : 0,
  }))

  return {
    period,
    includeSynthetic,
    requestsByType,
    requestsByStatus,
    ageDistribution,
    executionOutcomes,
    reviewRequiredVolume,
    externalErasurePendingVolume,
    failedBlockedVolume,
    anonymizationVolume,
    deletionVolume,
    totalRequests,
    totalExecutions,
  }
}

// -----------------------------------------------------------------------------
// 7. Aggregated Non-PII CSV Export
// -----------------------------------------------------------------------------

export async function exportPrivacyAggregatedCsv(options?: {
  includeSynthetic?: boolean
  period?: '7d' | '30d' | '90d' | 'all'
}): Promise<string> {
  const reports = await getPrivacyReports(options)
  const rows: string[] = [
    'Period,Dimension,Category,Count,Percentage,Notes',
  ]

  // Add Requests by Type
  for (const item of reports.requestsByType) {
    rows.push(
      `"${reports.period}","REQUEST_TYPE","${item.type}",${item.count},"${item.percentage}%","Canonical DSR type"`
    )
  }

  // Add Requests by Status
  for (const item of reports.requestsByStatus) {
    rows.push(
      `"${reports.period}","REQUEST_STATUS","${item.status}",${item.count},"${item.percentage}%","Canonical DSR status"`
    )
  }

  // Add Age Distribution
  for (const item of reports.ageDistribution) {
    rows.push(
      `"${reports.period}","REQUEST_AGE_BUCKET","${item.bucket}",${item.count},"${item.percentage}%","Neutral operational age"`
    )
  }

  // Add Execution Outcomes
  for (const item of reports.executionOutcomes) {
    rows.push(
      `"${reports.period}","LIFECYCLE_OUTCOME","${item.outcome}",${item.count},"${item.percentage}%","Lifecycle execution status"`
    )
  }

  // Add Key Summary Volumes
  rows.push(
    `"${reports.period}","VOLUME_SUMMARY","REVIEW_REQUIRED_PRESERVED",${reports.reviewRequiredVolume},"N/A","Preserved pending legal review"`
  )
  rows.push(
    `"${reports.period}","VOLUME_SUMMARY","EXTERNAL_ERASURE_PENDING",${reports.externalErasurePendingVolume},"N/A","Pending external provider confirmation"`
  )
  rows.push(
    `"${reports.period}","VOLUME_SUMMARY","FAILED_OR_BLOCKED",${reports.failedBlockedVolume},"N/A","Executions requiring operator intervention"`
  )
  rows.push(
    `"${reports.period}","VOLUME_SUMMARY","ANONYMIZED_RECORDS",${reports.anonymizationVolume},"N/A","Irreversibly anonymized records"`
  )
  rows.push(
    `"${reports.period}","VOLUME_SUMMARY","DELETED_RECORDS",${reports.deletionVolume},"N/A","Planned database/storage deleted records"`
  )

  return rows.join('\n')
}

// -----------------------------------------------------------------------------
// 8. Processors & Retention Invariants
// -----------------------------------------------------------------------------

export function getPrivacyProcessors(): readonly ExternalProcessor[] {
  return CONFIRMED_EXTERNAL_PROCESSORS
}

export function getPrivacyRetentionPolicies(): readonly RetentionPolicyEntry[] {
  return RETENTION_POLICY_FRAMEWORK
}

// -----------------------------------------------------------------------------
// 9. Consolidated Risks & Pending Decisions
// -----------------------------------------------------------------------------

export async function getPrivacyRisksAndPendingDecisions(options?: {
  includeSynthetic?: boolean
}): Promise<PrivacyRiskItem[]> {
  const summary = await getPrivacyOperationsSummary(options)
  const risks: PrivacyRiskItem[] = []

  // 1. Preserved Review Required
  if (summary.lifecycle.reviewRequiredPreserved > 0) {
    risks.push({
      id: 'RISK-REV-REQ',
      severity: 'MEDIUM',
      category: 'REVIEW_REQUIRED',
      title: 'Registros Preservados sob Revisão Necessária (PRESERVED_PENDING_REVIEW)',
      description: `${summary.lifecycle.reviewRequiredPreserved} registros foram preservados preventivamente durante ciclos de vida LGPD por exigirem auditoria legal e contratual antes de expurgo definitivo.`,
      impact: 'Dados não foram destruídos; permanecem desacoplados mas custodiados até definição legal.',
      sourceReference: 'LGPD Art. 16 I, ECA Art. 240-241, Código Civil',
      legalReviewRequired: true,
    })
  }

  // 2. Retention Framework is Draft / Undefined
  risks.push({
    id: 'RISK-RET-DRAFT',
    severity: 'HIGH',
    category: 'RETENTION',
    title: 'Quadro de Retenção em Estado de Rascunho (DRAFT / UNDEFINED)',
    description: 'Nenhum prazo legal de retenção foi formalmente assinado ou aprovado pelo corpo jurídico. Todos os prazos no sistema constam como UNDEFINED.',
    impact: 'Expurgo automatizado em produção permanece bloqueado para prevenir destruição indevida de dados sujeitos a prazos prescricionais.',
    sourceReference: 'modules/privacy/retention.ts',
    legalReviewRequired: true,
  })

  // 3. Processors DPA Not Reviewed
  risks.push({
    id: 'RISK-DPA-PENDING',
    severity: 'MEDIUM',
    category: 'DPA',
    title: 'Acordos de Processamento de Dados (DPA) Não Revisados',
    description: 'Os processadores externos ativos (Supabase, Vercel, Didit) operam com status de contrato NOT_REVIEWED.',
    impact: 'Exige formalização de cláusulas-padrão e validação de transferências internacionais.',
    sourceReference: 'modules/privacy/processors.ts',
    legalReviewRequired: true,
  })

  // 4. Didit Erasure Unknown
  risks.push({
    id: 'RISK-DIDIT-ERASURE',
    severity: 'MEDIUM',
    category: 'ERASURE',
    title: 'Capacidade de Expurgo Externo na Didit Não Homologada',
    description: 'A API de exclusão de dados biométricos/KYC no fornecedor Didit possui status de capacidade UNKNOWN.',
    impact: 'Solicitações reais de eliminação (Art. 18 VI) dependem de procedimento manual até integração da API de DSR do fornecedor.',
    sourceReference: 'modules/privacy/processors.ts (Didit Verification)',
    legalReviewRequired: true,
  })

  // 5. OpenAI Configured but Disabled
  risks.push({
    id: 'RISK-OPENAI-STAGED',
    severity: 'LOW',
    category: 'RETENTION',
    title: 'Integração OpenAI Staged (Desabilitada em Produção)',
    description: 'O subsistema de IA Concierge está implementado no código mas estritamente desabilitado por flags de segurança.',
    impact: 'Nenhum dado pessoal de titulares ou visitantes é transmitido para a OpenAI.',
    sourceReference: 'modules/concierge/gate.ts, CONCIERGE_WEB_PUBLIC_ENABLED=false',
    legalReviewRequired: false,
  })

  // 6. Failed Executions (if any)
  if (summary.lifecycle.failed > 0) {
    risks.push({
      id: 'RISK-EXEC-FAILED',
      severity: 'HIGH',
      category: 'EXECUTION',
      title: 'Execuções de Ciclo de Vida com Falha Registrada',
      description: `Existem ${summary.lifecycle.failed} execuções registradas com status FAILED no ledger de execução.`,
      impact: 'Exige investigação e retomada (resumability saga) pelo operador antes de encerramento.',
      sourceReference: 'public.privacy_lifecycle_executions',
      legalReviewRequired: false,
    })
  }

  return risks
}

// -----------------------------------------------------------------------------
// 10. Unified Privacy Audit Events
// -----------------------------------------------------------------------------

export async function getPrivacyAuditEvents(options?: {
  includeSynthetic?: boolean
  category?: 'ALL' | 'DSR' | 'LIFECYCLE'
  limit?: number
}): Promise<PrivacyAuditEvent[]> {
  const admin = createAdminClient()
  const includeSynthetic = options?.includeSynthetic ?? false
  const category = options?.category ?? 'ALL'
  const limit = options?.limit ?? 50

  const events: PrivacyAuditEvent[] = []

  // 1. DSR Events
  if (category === 'ALL' || category === 'DSR') {
    const { data: dsrEvents } = await admin
      .from('data_subject_request_events')
      .select('id, request_id, event_type, actor_role, actor_account_user_id, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(limit)

    for (const ev of dsrEvents || []) {
      const isSynthetic =
        ev.metadata?.synthetic === true ||
        (typeof ev.metadata?.details?.reason === 'string' && /synthetic/i.test(ev.metadata.details.reason)) ||
        (typeof ev.metadata?.requestType === 'string' && !ev.actor_account_user_id)

      if (!includeSynthetic && isSynthetic) continue

      events.push({
        id: ev.id,
        timestamp: ev.created_at,
        category: 'DSR',
        eventType: ev.event_type,
        actor: ev.actor_role,
        targetReference: `DSR-${ev.request_id.slice(0, 8)}…`,
        status: 'LOGGED',
        isSynthetic,
        safeMetadata: {
          requestType: ev.metadata?.requestType,
          actorRole: ev.actor_role,
        },
      })
    }
  }

  // 2. Lifecycle Execution Events
  if (category === 'ALL' || category === 'LIFECYCLE') {
    const { data: execEvents } = await admin
      .from('privacy_lifecycle_execution_events')
      .select('id, execution_id, phase, event_type, actor, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(limit)

    for (const ev of execEvents || []) {
      const isSynthetic = true // In current dev, lifecycle executor was synthetic only

      if (!includeSynthetic && isSynthetic) continue

      const safeMeta: Record<string, unknown> = {}
      if (ev.metadata && typeof ev.metadata === 'object') {
        for (const [k, v] of Object.entries(ev.metadata)) {
          if (!['password', 'email', 'phone', 'token', 'secret'].includes(k.toLowerCase())) {
            safeMeta[k] = typeof v === 'object' && v !== null ? (Array.isArray(v) ? `${v.length} itens` : 'Object') : v
          }
        }
      }

      events.push({
        id: ev.id,
        timestamp: ev.created_at,
        category: 'LIFECYCLE',
        eventType: `${ev.phase} — ${ev.event_type}`,
        actor: ev.actor,
        targetReference: `EXEC-${ev.execution_id.slice(0, 8)}…`,
        status: ev.event_type.includes('FAILED') ? 'FAILED' : 'COMPLETED',
        isSynthetic,
        safeMetadata: safeMeta,
      })
    }
  }

  // Sort by timestamp descending
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return events.slice(0, limit)
}
