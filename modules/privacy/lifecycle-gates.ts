/**
 * LGPD Lifecycle Gates & Fingerprinting — Velvet
 *
 * Phase: LGPD-02B (Synthetic Destructive Lifecycle Executor)
 * Environment: DEV ONLY
 *
 * Implements fail-closed gates that enforce:
 * 1. Multi-attribute synthetic subject validation (assertSyntheticLifecycleSubject)
 * 2. Strict kill switch & DEV environment verification (verifyEnvironmentKillSwitch)
 * 3. Deterministic lifecycle plan fingerprinting & staleness checks
 */

import { createHash } from 'node:crypto'
import type { LifecyclePlan } from './lifecycle-types'
import type { ResolvedSubject } from './subject-resolver'

export const EXPECTED_DEV_PROJECT_REF = 'mwzlunkkyigxzjpnybxj'
export const SYNTHETIC_EMAIL_DOMAIN = '@ad-marketplace-synthetic.invalid'
export const SYNTHETIC_EMAIL_PREFIX = 'synthetic-lgpd-'
export const SYNTHETIC_STAGE_PREFIX = '[SYNTHETIC-LGPD]'

export class SyntheticGateViolationError extends Error {
  public readonly code = 'NON_SYNTHETIC_SUBJECT'
  constructor(message: string) {
    super(`SYNTHETIC GATE REJECTED: ${message}`)
    this.name = 'SyntheticGateViolationError'
  }
}

export class KillSwitchViolationError extends Error {
  public readonly code = 'KILL_SWITCH_DISABLED'
  constructor(message: string) {
    super(`KILL SWITCH REJECTED: ${message}`)
    this.name = 'KillSwitchViolationError'
  }
}

export class EnvironmentViolationError extends Error {
  public readonly code = 'WRONG_ENVIRONMENT'
  constructor(message: string) {
    super(`ENVIRONMENT REJECTED: ${message}`)
    this.name = 'EnvironmentViolationError'
  }
}

export class PlanStaleError extends Error {
  public readonly code = 'PLAN_STALE'
  constructor(message: string) {
    super(`PLAN STALENESS DETECTED: ${message}`)
    this.name = 'PlanStaleError'
  }
}

/**
 * Checks and enforces the destructive execution kill switches and DEV environment.
 * Default is OFF. Fails closed on any discrepancy.
 */
export function verifyEnvironmentKillSwitch(options?: {
  supabaseUrl?: string
  overrideEnabled?: boolean
  overrideSyntheticOnly?: boolean
}): void {
  const enabled =
    options?.overrideEnabled ??
    (process.env.LGPD_DESTRUCTIVE_EXECUTION_ENABLED === 'true')
  const syntheticOnly =
    options?.overrideSyntheticOnly ??
    (process.env.LGPD_SYNTHETIC_EXECUTION_ONLY === 'true')

  if (!enabled) {
    throw new KillSwitchViolationError(
      'LGPD_DESTRUCTIVE_EXECUTION_ENABLED must be set to "true". Default is OFF.'
    )
  }

  if (!syntheticOnly) {
    throw new KillSwitchViolationError(
      'LGPD_SYNTHETIC_EXECUTION_ONLY must be set to "true". Destructive operations on non-synthetic data are strictly prohibited.'
    )
  }

  const url =
    options?.supabaseUrl ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''

  if (!url.includes(EXPECTED_DEV_PROJECT_REF)) {
    throw new EnvironmentViolationError(
      `Execution is only allowed on DEV project ${EXPECTED_DEV_PROJECT_REF}. Current URL does not match.`
    )
  }
}

export interface SyntheticValidationAttributes {
  email?: string | null
  role?: string | null
  stageName?: string | null
  metadata?: Record<string, unknown> | null
  authUserId?: string | null
  accountAuthUserId?: string | null
  accountUserId?: string | null
  profileAccountUserId?: string | null
}

/**
 * Validates that a subject candidate satisfies ALL synthetic attributes.
 * Gating on UUID alone is forbidden. Multi-attribute verification is mandatory.
 */
export function assertSyntheticLifecycleSubject(
  subject: SyntheticValidationAttributes
): void {
  // 1. Refuse null or missing data
  if (!subject) {
    throw new SyntheticGateViolationError('Subject is missing or null.')
  }

  // 2. Email verification
  const email = (subject.email || '').toLowerCase().trim()
  if (!email.endsWith(SYNTHETIC_EMAIL_DOMAIN)) {
    throw new SyntheticGateViolationError(
      `Email "${email}" does not end with canonical synthetic domain ${SYNTHETIC_EMAIL_DOMAIN}`
    )
  }
  if (!email.startsWith(SYNTHETIC_EMAIL_PREFIX)) {
    throw new SyntheticGateViolationError(
      `Email "${email}" does not start with prefix ${SYNTHETIC_EMAIL_PREFIX}`
    )
  }

  // 3. Role verification (only ADVERTISER is targeted by synthetic lifecycle fixture)
  if (subject.role !== 'ADVERTISER') {
    throw new SyntheticGateViolationError(
      `Role "${subject.role}" is not permitted. Only ADVERTISER synthetic fixtures can be processed.`
    )
  }

  // 4. Metadata verification (synthetic marker & fixture tag)
  const meta = subject.metadata || {}
  if (meta.synthetic !== true) {
    throw new SyntheticGateViolationError(
      'User metadata missing or synthetic !== true.'
    )
  }
  if (typeof meta.fixture !== 'string' || !meta.fixture.startsWith('LGPD-')) {
    throw new SyntheticGateViolationError(
      `User metadata fixture tag "${String(meta.fixture)}" is invalid or missing.`
    )
  }

  // 5. Stage name verification
  const stage = subject.stageName || ''
  if (!stage.startsWith(SYNTHETIC_STAGE_PREFIX)) {
    throw new SyntheticGateViolationError(
      `Profile stage name "${stage}" does not start with required marker ${SYNTHETIC_STAGE_PREFIX}`
    )
  }

  // 6. Relational consistency
  if (
    subject.authUserId &&
    subject.accountAuthUserId &&
    subject.authUserId !== subject.accountAuthUserId
  ) {
    throw new SyntheticGateViolationError(
      `Auth user ID (${subject.authUserId}) does not match Account auth_user_id (${subject.accountAuthUserId})`
    )
  }

  if (
    subject.accountUserId &&
    subject.profileAccountUserId &&
    subject.accountUserId !== subject.profileAccountUserId
  ) {
    throw new SyntheticGateViolationError(
      `Account user ID (${subject.accountUserId}) does not match Profile account_user_id (${subject.profileAccountUserId})`
    )
  }
}

/**
 * Computes a deterministic SHA-256 fingerprint over decision-relevant fields of a LifecyclePlan.
 */
export function calculatePlanFingerprint(plan: LifecyclePlan): string {
  const normalizedItems = (plan.items || [])
    .map((item) => ({
      id: item.id,
      system: item.system,
      target: item.target,
      action: item.action,
      recordCount: item.recordCount,
      identifiers: [...(item.identifiers || [])].sort(),
    }))
    .sort((a, b) => a.id.localeCompare(b.id))

  const payload = {
    subjectAccountId: plan.subjectAccountId,
    subjectRole: plan.subjectRole,
    summary: {
      totalItems: plan.summary.totalItems,
      totalRecords: plan.summary.totalRecords,
      byAction: plan.summary.byAction,
    },
    items: normalizedItems,
    storageDiscovered: {
      photoPaths: [...(plan.storageDiscovered?.photoPaths || [])].sort(),
      videoPaths: [...(plan.storageDiscovered?.videoPaths || [])].sort(),
    },
  }

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}
