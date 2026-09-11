/**
 * LGPD Privacy & Data Subject Rights — Type System
 *
 * Implements technical taxonomy for LGPD (Lei Geral de Proteção de Dados / Lei 13.709/2018).
 * Note: These are technical capabilities and classification models. They do not encode
 * final legal determinations or unapproved retention policies.
 */

// -----------------------------------------------------------------------------
// 1. DATA SUBJECT RIGHTS (Technical Capability Taxonomy)
// -----------------------------------------------------------------------------

export const LGPD_RIGHTS = [
  'ACCESS',
  'CORRECTION',
  'ANONYMIZATION',
  'BLOCKING',
  'DELETION',
  'PORTABILITY',
  'CONSENT_REVOCATION',
  'SHARING_INFORMATION',
  'AUTOMATED_DECISION_REVIEW',
] as const

export type LgpdRight = typeof LGPD_RIGHTS[number]

// -----------------------------------------------------------------------------
// 2. DSR WORKFLOW STATUSES & EVENT TYPES
// -----------------------------------------------------------------------------

export const DSR_STATUSES = [
  'RECEIVED',
  'IDENTITY_VERIFICATION_REQUIRED',
  'IN_REVIEW',
  'PROCESSING',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
] as const

export type DsrStatus = typeof DSR_STATUSES[number]

export const DSR_EVENT_TYPES = [
  'REQUEST_CREATED',
  'IDENTITY_VERIFIED',
  'REVIEW_STARTED',
  'PROCESSING_STARTED',
  'REQUEST_COMPLETED',
  'REQUEST_REJECTED',
  'REQUEST_CANCELLED',
] as const

export type DsrEventType = typeof DSR_EVENT_TYPES[number]

export const DSR_ACTOR_ROLES = ['SUBJECT', 'ADMIN', 'SYSTEM'] as const
export type DsrActorRole = typeof DSR_ACTOR_ROLES[number]

// -----------------------------------------------------------------------------
// 3. DATA CLASSIFICATION TAXONOMY
// -----------------------------------------------------------------------------

export const DATA_CLASSIFICATIONS = [
  'PUBLIC_PERSONAL',
  'PRIVATE_PERSONAL',
  'SENSITIVE_OR_HIGH_RISK',
  'AUTHENTICATION',
  'FINANCIAL_REFERENCE',
  'KYC_REFERENCE',
  'USER_GENERATED_CONTENT',
  'BEHAVIORAL_ANALYTICS',
  'OPERATIONAL_SECURITY',
  'AUDIT_RECORD',
  'ANONYMIZED_OR_AGGREGATED',
] as const

export type DataClassification = typeof DATA_CLASSIFICATIONS[number]

// -----------------------------------------------------------------------------
// 4. CONTROLLED STATUSES FOR INVENTORY & GOVERNANCE
// -----------------------------------------------------------------------------

export const LEGAL_BASIS_STATUSES = [
  'TO_BE_REVIEWED',
  'SOURCE_CONFIRMED',
  'LEGAL_APPROVAL_REQUIRED',
] as const

export type LegalBasisStatus = typeof LEGAL_BASIS_STATUSES[number]

export const RETENTION_STATUSES = [
  'UNDEFINED',
  'DRAFT',
  'APPROVED',
] as const

export type RetentionStatus = typeof RETENTION_STATUSES[number]

export const DELETION_STRATEGIES = [
  'DELETE',
  'ANONYMIZE',
  'RETAIN_IF_LEGALLY_REQUIRED',
  'EXTERNAL_ERASURE_REQUIRED',
  'REVIEW_REQUIRED',
  'NOT_APPLICABLE',
] as const

export type DeletionStrategy = typeof DELETION_STRATEGIES[number]

export const SUBJECT_ROLES = [
  'ADVERTISER',
  'CLIENT',
  'VISITOR',
  'ADMIN',
  'SYSTEM',
] as const

export type SubjectRole = typeof SUBJECT_ROLES[number]

export const SENSITIVITY_LEVELS = [
  'SENSITIVE_DATA_CONFIRMED',
  'POTENTIALLY_SENSITIVE_FREE_TEXT',
  'HIGH_RISK_BUT_NOT_CLASSIFIED_AS_SENSITIVE',
  'NOT_SENSITIVE',
] as const

export type SensitivityLevel = typeof SENSITIVITY_LEVELS[number]

export const PROCESSOR_STATUSES = [
  'ACTIVE',
  'CONFIGURED_BUT_DISABLED',
  'PLANNED',
  'MOCK_ONLY',
  'UNKNOWN',
] as const

export type ProcessorStatus = typeof PROCESSOR_STATUSES[number]

export const INTERNATIONAL_TRANSFER_STATUSES = [
  'YES',
  'NO',
  'POSSIBLE',
  'REVIEW_REQUIRED',
] as const

export type InternationalTransferStatus = typeof INTERNATIONAL_TRANSFER_STATUSES[number]

// -----------------------------------------------------------------------------
// 5. CANONICAL DATA INVENTORY ITEM
// -----------------------------------------------------------------------------

export interface DataInventoryItem {
  id: string
  system: 'SUPABASE_POSTGRES' | 'SUPABASE_STORAGE' | 'SUPABASE_AUTH' | 'CLIENT_STORAGE' | 'MEMORY_CACHE'
  storage_object: string
  subject_role: SubjectRole
  data_category: string
  classification: DataClassification
  sensitivity_level: SensitivityLevel
  source: 'USER_INPUT' | 'OBSERVED_TELEMETRY' | 'EXTERNAL_PROVIDER' | 'SYSTEM_DERIVED' | 'ADMINISTRATIVE_ACTION'
  purpose: string
  legal_basis_status: LegalBasisStatus
  retention_status: RetentionStatus
  deletion_strategy: DeletionStrategy
  external_processors: readonly string[]
  notes: string
}

// -----------------------------------------------------------------------------
// 6. DSR DOMAIN INTERFACES & DTOs
// -----------------------------------------------------------------------------

export interface DataSubjectRequest {
  id: string
  requester_account_user_id: string
  request_type: LgpdRight
  status: DsrStatus
  details: Record<string, unknown>
  resolution_code: string | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  cancelled_at: string | null
}

export interface DataSubjectRequestEvent {
  id: string
  request_id: string
  event_type: DsrEventType
  actor_account_user_id: string
  actor_role: DsrActorRole
  metadata: Record<string, unknown>
  created_at: string
}

/** Client-safe DTO without internal operator notes */
export interface DataSubjectRequestSafeDTO {
  id: string
  requestType: LgpdRight
  status: DsrStatus
  createdAt: string
  updatedAt: string
  completedAt: string | null
  cancelledAt: string | null
  resolutionCode: string | null
}
