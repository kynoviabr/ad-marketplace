/**
 * LGPD Lifecycle Execution Engine & Export Types — Velvet
 *
 * Phase: LGPD-02A (Lifecycle Planner, Safe Export & Deletion Dry-Run)
 * Environment: DEV ONLY
 *
 * Canonical action taxonomy and data structures for subject lifecycle planning.
 * Guarantees zero destructive mutation in LGPD-02A.
 */

// -----------------------------------------------------------------------------
// 1. CANONICAL ACTION TAXONOMY
// -----------------------------------------------------------------------------

export const LIFECYCLE_ACTIONS = [
  'DELETE',
  'ANONYMIZE',
  'DETACH',
  'RETAIN',
  'EXTERNAL_ERASURE',
  'REVIEW_REQUIRED',
] as const

export type LifecycleAction = typeof LIFECYCLE_ACTIONS[number]

export type LifecycleSystem =
  | 'SUPABASE_POSTGRES'
  | 'SUPABASE_STORAGE'
  | 'SUPABASE_AUTH'
  | 'EXTERNAL_PROCESSOR'

export interface LifecyclePlanItem {
  id: string
  system: LifecycleSystem
  target: string // Table name, bucket name, or external service
  recordCount: number
  identifiers: string[]
  action: LifecycleAction
  rationale: string
  legalBasisStatus: string
  retentionStatus: string
  isAuthLast?: boolean
  orphanRiskPrevented?: boolean
  auditSafeguarded?: boolean
  externalProcessor?: string
  dependencies?: string[]
}

export interface LifecycleActionCount {
  itemCount: number
  recordCount: number
}

export interface LifecycleActionSummary {
  DELETE: number
  ANONYMIZE: number
  DETACH: number
  RETAIN: number
  EXTERNAL_ERASURE: number
  REVIEW_REQUIRED: number
  byAction: Record<LifecycleAction, LifecycleActionCount>
  totalItems: number
  totalRecords: number
}

export interface LifecyclePlan {
  subjectAccountId: string
  subjectRole: string
  subjectEmail?: string | null
  profileId?: string | null
  stageName?: string | null
  generatedAt: string
  mode: 'DRY_RUN'
  executionAllowed: false // Hard invariant: LGPD-02A never allows destructive execution
  summary: LifecycleActionSummary
  items: LifecyclePlanItem[]
  storageDiscovered: {
    photoCount: number
    videoCount: number
    photoPaths: string[]
    videoPaths: string[]
  }
  warnings: string[]
  auditStatement: string
}

// -----------------------------------------------------------------------------
// 2. DATA EXPORT PACKAGE STRUCTURE
// -----------------------------------------------------------------------------

export interface SubjectExportManifest {
  exportId: string
  subjectAccountId: string
  subjectRole: string
  generatedAt: string
  schemaVersion: '1.0.0-lgpd'
  totalDatasets: number
  includedDatasets: string[]
  excludedFieldsCount: number
  files: string[]
  checksumSha256: string
  securityNotice: string
}

export interface SubjectExportBundle {
  manifest: SubjectExportManifest
  files: Record<string, unknown> // dataset filename -> parsed JSON object
}
