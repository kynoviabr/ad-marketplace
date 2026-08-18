/**
 * Verification domain types — FASE 02
 *
 * Defines the canonical TypeScript types for identity & age verification,
 * event ledger, and safe DTO projections.
 */

export type VerificationStatus =
  | 'NOT_STARTED'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED'

export type WebhookProcessingStatus =
  | 'RECEIVED'
  | 'PROCESSED'
  | 'IGNORED'
  | 'FAILED'

/**
 * Full domain record of public.identity_verifications.
 * Used strictly server-side (service_role / admin client).
 * NEVER sent directly to browser.
 */
export interface IdentityVerification {
  id: string
  account_user_id: string
  provider: string
  provider_session_id: string | null
  status: VerificationStatus
  identity_verified: boolean
  age_verified: boolean
  cpf_verified: boolean | null
  verified_country: string | null
  started_at: string | null
  submitted_at: string | null
  verified_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Sanitized client-safe DTO returned to browser / UI.
 * Excludes internal IDs, provider references, and event audit keys.
 */
export interface VerificationSafeDTO {
  status: VerificationStatus
  identityVerified: boolean
  ageVerified: boolean
  verifiedAt: string | null
  expiresAt: string | null
}

/**
 * Webhook event ledger record.
 */
export interface VerificationWebhookEvent {
  id: string
  provider: string
  provider_event_id: string
  provider_session_id: string | null
  event_type: string
  processing_status: WebhookProcessingStatus
  error_message: string | null
  received_at: string
  processed_at: string | null
}

/** Result type for verification Server Actions */
export type VerificationActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
