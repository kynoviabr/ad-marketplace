/**
 * LGPD Lifecycle Execution Types — Velvet
 *
 * Phase: LGPD-02B (Synthetic Destructive Lifecycle Executor)
 * Environment: DEV ONLY
 *
 * Canonical types and state machine for destructive subject lifecycle execution.
 * Restricted strictly to canonical synthetic DEV fixtures.
 */

import type { LifecyclePlan } from './lifecycle-types'

export type LifecycleExecutionMode = 'SYNTHETIC_DESTRUCTIVE'

export type LifecycleExecutionStatus =
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED'

export const LIFECYCLE_EXECUTION_PHASES = [
  'PLANNED',
  'VALIDATED',
  'ACCESS_BLOCKED',
  'ANONYMIZATION_STARTED',
  'ANONYMIZATION_COMPLETED',
  'STORAGE_DELETION_STARTED',
  'STORAGE_DELETION_COMPLETED',
  'DATABASE_DELETION_STARTED',
  'DATABASE_DELETION_COMPLETED',
  'EXTERNAL_ERASURE_SIMULATED',
  'AUTH_DELETION_STARTED',
  'AUTH_DELETION_COMPLETED',
  'COMPLETED',
  'FAILED',
  'BLOCKED',
] as const

export type LifecycleExecutionPhase = typeof LIFECYCLE_EXECUTION_PHASES[number]

export interface PrivacyLifecycleExecution {
  id: string
  data_subject_request_id?: string | null
  subject_account_id?: string | null
  subject_email?: string | null
  plan_fingerprint: string
  mode: LifecycleExecutionMode
  status: LifecycleExecutionStatus
  current_phase: LifecycleExecutionPhase
  started_at: string
  completed_at?: string | null
  failure_code?: string | null
  failure_metadata?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface PrivacyLifecycleExecutionEvent {
  id: string
  execution_id: string
  phase: LifecycleExecutionPhase
  event_type: string
  actor: string
  metadata?: Record<string, unknown> | null
  created_at: string
}

export interface ExecutionOptions {
  requestId?: string | null
  allowResume?: boolean
  failureInjectionPoint?: LifecycleExecutionPhase | null
}

export interface StorageDeletionOutcome {
  bucket: string
  path: string
  existedBefore: boolean
  deleted: boolean
  verifiedAbsent: boolean
}

export interface DatabaseDeletionOutcome {
  target: string
  recordsDeleted: number
  preservedReviewRequired: number
}

export interface AnonymizationOutcome {
  target: string
  recordsAnonymized: number
  summary: string
}

export interface ExecutionReport {
  executionId: string
  mode: LifecycleExecutionMode
  status: LifecycleExecutionStatus
  currentPhase: LifecycleExecutionPhase
  subjectAccountId: string
  subjectEmail: string
  planFingerprint: string
  planItemCount: number
  planRecordCount: number
  storageDeleted: StorageDeletionOutcome[]
  databaseDeleted: DatabaseDeletionOutcome[]
  anonymized: AnonymizationOutcome[]
  reviewRequiredPreserved: {
    target: string
    recordCount: number
    action: string
  }[]
  externalProcessors: {
    openAiCalls: number
    diditCalls: number
    diditStatus: string
  }
  authDeletedLast: boolean
  authDeletedUserId?: string | null
  startedAt: string
  completedAt?: string | null
  error?: {
    code: string
    message: string
  } | null
}
