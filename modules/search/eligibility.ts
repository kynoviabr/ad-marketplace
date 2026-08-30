import type { ProfessionalProfile } from '@/modules/profiles/types'
import type { AccountUser } from '@/modules/auth/types'
import type { IdentityVerification } from '@/modules/verification/types'

/**
 * ============================================================
 * PUBLICATION ELIGIBILITY — AUTHORITY HIERARCHY (F11-SEC-011)
 * ============================================================
 *
 * CANONICAL AUTHORITY — DATABASE VIEW (query-level gating):
 *   The PostgreSQL VIEW `v_publication_eligible_profiles` (migration 20260819000010)
 *   is the single source of truth for determining which profiles may appear publicly.
 *   It encodes all 8 publication gates including billing entitlement time-awareness
 *   and is accessible only via the service_role client (admin). All search and SEO
 *   DAL functions MUST pre-filter using this view before querying profile data.
 *
 * APPLICATION LAYER — FUNCTIONS BELOW (non-query logic only):
 *   The functions in this file perform application-layer eligibility checks. They are
 *   NOT used to gate database queries in production search/SEO paths — the view handles
 *   that. These functions exist for:
 *     - Unit testing eligibility logic in isolation
 *     - Profile dashboard readiness indicators (non-public, server-side UI)
 *     - Adminstrative tools that operate on in-memory profile objects
 *
 *   DO NOT use these functions as the primary query filter for public search results.
 *   The view is always more authoritative — it reflects live billing state that
 *   in-memory objects cannot capture without an explicit billing lookup.
 * ============================================================
 */

/**
 * Structural Search Readiness (Internal Development & Test Preview Mode).
 *
 * APPLICATION-LAYER ONLY. For query-level gating use v_publication_eligible_profiles.
 *
 * Checks whether the profile satisfies the basic data requirements:
 * 1. Account is ACTIVE
 * 2. KYC verification is VERIFIED (with identity and age 18+ confirmed)
 * 3. Profile status is READY_FOR_REVIEW or ACTIVE
 * 4. At least one service location is configured.
 */
export function isProfileStructurallySearchReady(
  profile: Pick<ProfessionalProfile, 'status'> | null,
  account: Pick<AccountUser, 'status'> | null,
  verification: Pick<IdentityVerification, 'status' | 'identity_verified' | 'age_verified'> | null,
  locationsCount: number
): boolean {
  if (!profile || !account || !verification) return false

  return (
    account.status === 'ACTIVE' &&
    verification.status === 'VERIFIED' &&
    verification.identity_verified === true &&
    verification.age_verified === true &&
    (profile.status === 'READY_FOR_REVIEW' || profile.status === 'ACTIVE') &&
    locationsCount >= 1
  )
}

/**
 * Publication Readiness Evaluator (FASE 06 Domain Invariant).
 *
 * APPLICATION-LAYER ONLY. For query-level gating use v_publication_eligible_profiles.
 *
 * A profile is publication-ready when:
 * 1. Account is ACTIVE
 * 2. KYC is VERIFIED with confirmed adult age (18+)
 * 3. Profile data is complete (status is READY_FOR_REVIEW or ACTIVE; never DRAFT)
 * 4. Profile content moderation status is APPROVED (never PENDING, REJECTED, or FLAGGED)
 * 5. At least 1 service location area is configured
 * 6. At least 1 photo has status = 'APPROVED'
 */
export function isPublicationReady(
  profile: Pick<ProfessionalProfile, 'status' | 'content_moderation_status'> | null,
  account: Pick<AccountUser, 'status'> | null,
  verification: Pick<IdentityVerification, 'status' | 'identity_verified' | 'age_verified'> | null,
  locationsCount: number,
  approvedPhotosCount: number
): boolean {
  if (!profile || !account || !verification) return false

  return (
    account.status === 'ACTIVE' &&
    verification.status === 'VERIFIED' &&
    verification.identity_verified === true &&
    verification.age_verified === true &&
    (profile.status === 'READY_FOR_REVIEW' || profile.status === 'ACTIVE') &&
    profile.content_moderation_status === 'APPROVED' &&
    locationsCount >= 1 &&
    approvedPhotosCount >= 1
  )
}

/**
 * Public Search Eligibility (Production Mode — Fail Closed) — FASE 07.
 *
 * APPLICATION-LAYER ONLY. For query-level gating use v_publication_eligible_profiles.
 * Note: the VIEW also incorporates billing entitlement time-awareness (Gate 8), which
 * this function evaluates via the caller-supplied `publicationEntitlement` boolean.
 * In production DAL paths the view pre-empts this function entirely.
 *
 * ALL 8 gates must be satisfied. No single gate can override another.
 * Payment alone NEVER bypasses KYC, moderation, profile, media, or location gates.
 *
 * Gate 1: Account ACTIVE
 * Gate 2: KYC VERIFIED + identity_verified + age_verified (18+)
 * Gate 3: Profile explicitly ACTIVE
 * Gate 4: Content moderation APPROVED
 * Gate 5: At least 1 service location configured
 * Gate 6: At least 1 approved photo
 * Gate 7: Profile not PAUSED/SUSPENDED (covered by status check)
 * Gate 8: Publication entitlement ACTIVE (from hasPublicationEntitlement())
 *
 * publicationEntitlement MUST be resolved server-side via hasPublicationEntitlement().
 * The client NEVER sends this value.
 */
export function isPublicSearchEligible(
  profile: Pick<ProfessionalProfile, 'status' | 'content_moderation_status'> | null,
  account: Pick<AccountUser, 'status'> | null,
  verification: Pick<IdentityVerification, 'status' | 'identity_verified' | 'age_verified'> | null,
  locationsCount: number,
  approvedPhotosCount: number,
  publicationEntitlement: boolean
): boolean {
  if (!profile || !account || !verification) return false

  return (
    // Gate 1: Account
    account.status === 'ACTIVE' &&
    // Gate 2: KYC
    verification.status === 'VERIFIED' &&
    verification.identity_verified === true &&
    verification.age_verified === true &&
    // Gate 3: Explicit publication is required
    profile.status === 'ACTIVE' &&
    // Gate 4: Content moderation
    profile.content_moderation_status === 'APPROVED' &&
    // Gate 5: Locations
    locationsCount >= 1 &&
    // Gate 6: Approved media
    approvedPhotosCount >= 1 &&
    // Gate 8: Publication entitlement (FASE 07)
    publicationEntitlement === true
  )
}
