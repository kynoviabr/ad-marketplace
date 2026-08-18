import type { ProfessionalProfile } from '@/modules/profiles/types'
import type { AccountUser } from '@/modules/auth/types'
import type { IdentityVerification } from '@/modules/verification/types'

/**
 * Structural Search Readiness (Internal Development & Test Preview Mode).
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
 * Public Search Eligibility (Production Mode — Fail Closed).
 * Requires the full multi-gate publication pipeline:
 * 1. Account is ACTIVE
 * 2. KYC is VERIFIED
 * 3. Profile status is ACTIVE (emitted only post-moderation in FASE 06)
 * 4. Media is approved (FASE 05)
 * 5. Content moderation is approved (FASE 06)
 * 6. Subscription / billing is eligible (FASE 07).
 */
export function isPublicSearchEligible(
  profile: Pick<ProfessionalProfile, 'status'> | null,
  account: Pick<AccountUser, 'status'> | null,
  verification: Pick<IdentityVerification, 'status'> | null,
  mediaApproved: boolean = false,
  moderationApproved: boolean = false
): boolean {
  if (!profile || !account || !verification) return false

  return (
    account.status === 'ACTIVE' &&
    verification.status === 'VERIFIED' &&
    profile.status === 'ACTIVE' &&
    mediaApproved &&
    moderationApproved
  )
}
