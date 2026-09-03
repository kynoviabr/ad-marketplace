/**
 * Auth & Account domain types — FASE 01
 *
 * These types mirror the PostgreSQL enums and table schema defined in the migration.
 * They are the canonical TypeScript representation for the account domain.
 */

/** Account roles. ADVERTISER is the only role assignable at public signup. */
export type UserRole = 'ADVERTISER' | 'ADMIN' | 'CLIENT'

/** Account status. Admin-managed only — users cannot self-modify. */
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED'

/** Onboarding progression state. */
export type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'

/**
 * Full account_users domain record as returned from the database.
 *
 * terms_version and privacy_version are nullable:
 *   NULL = safe incomplete state (admin client write failed after signUp).
 *   The DAL's requireAccount() blocks operational access when NULL.
 */
export interface AccountUser {
  id: string
  auth_user_id: string
  role: UserRole
  status: UserStatus
  onboarding_status: OnboardingStatus
  onboarding_step: number
  terms_version: string | null       // null = safe incomplete state
  terms_accepted_at: string | null   // null = safe incomplete state
  privacy_version: string | null     // null = safe incomplete state
  privacy_accepted_at: string | null // null = safe incomplete state
  created_at: string
  updated_at: string
}

/** Result type for Server Actions. */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
