import 'server-only'
import type { IdentityVerification, VerificationSafeDTO } from './types'

type VerificationRecordOrDTO = IdentityVerification | VerificationSafeDTO | null

/**
 * Checks if the verification record satisfies all criteria to proceed to the Professional Profile phase (FASE 03).
 *
 * Invariant Rules:
 * 1. Verification record must exist.
 * 2. status must be 'VERIFIED'.
 * 3. identity_verified (or identityVerified) must be TRUE.
 * 4. age_verified (or ageVerified) must be TRUE (strictly document-confirmed age >= 18).
 * 5. expires_at (or expiresAt) must not be in the past.
 */
export function canProceedToProfessionalProfile(v: VerificationRecordOrDTO): boolean {
  if (!v) return false

  const status = 'status' in v ? v.status : null
  if (status !== 'VERIFIED') return false

  const identityVerified = 'identity_verified' in v ? v.identity_verified : v.identityVerified
  if (identityVerified !== true) return false

  const ageVerified = 'age_verified' in v ? v.age_verified : v.ageVerified
  if (ageVerified !== true) return false

  const expiresAt = 'expires_at' in v ? v.expires_at : v.expiresAt
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    return false
  }

  return true
}

/**
 * Gate: Upload Adult Media (Invariant DEC-006).
 * Adult media upload is strictly forbidden unless identity and age (>= 18) are fully verified.
 */
export function canUploadAdultMedia(v: VerificationRecordOrDTO): boolean {
  return canProceedToProfessionalProfile(v)
}

/**
 * Gate: Public Profile Publication.
 * Public profiles cannot be published without complete identity & age verification.
 */
export function canPublishProfile(v: VerificationRecordOrDTO): boolean {
  return canProceedToProfessionalProfile(v)
}

/**
 * Helper: Confirms identity is verified.
 */
export function isIdentityVerified(v: VerificationRecordOrDTO): boolean {
  if (!v || v.status !== 'VERIFIED') return false
  const idVerified = 'identity_verified' in v ? v.identity_verified : v.identityVerified
  return idVerified === true
}

/**
 * Helper: Confirms age >= 18 is document-verified.
 */
export function isAgeVerified(v: VerificationRecordOrDTO): boolean {
  if (!v || v.status !== 'VERIFIED') return false
  const ageVerified = 'age_verified' in v ? v.age_verified : v.ageVerified
  const idVerified = 'identity_verified' in v ? v.identity_verified : v.identityVerified
  return ageVerified === true && idVerified === true
}

/**
 * Helper: Alias for isAgeVerified.
 */
export function isVerifiedAdult(v: VerificationRecordOrDTO): boolean {
  return isAgeVerified(v)
}
