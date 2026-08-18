import type { VerificationStatus } from '../../types'

/**
 * Calculates whether a person is >= 18 years old given an ISO date string (YYYY-MM-DD).
 * Date of birth is evaluated in memory and NEVER persisted.
 */
export function isAdultFromBirthDate(dobString: string): boolean {
  try {
    const dob = new Date(dobString)
    if (Number.isNaN(dob.getTime())) return false

    const today = new Date()
    let age = today.getUTCFullYear() - dob.getUTCFullYear()
    const monthDiff = today.getUTCMonth() - dob.getUTCMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < dob.getUTCDate())) {
      age--
    }

    return age >= 18
  } catch {
    return false
  }
}

/**
 * Evaluates whether the decision report satisfies the strict age >= 18 threshold.
 */
export function extractAgeVerifiedThreshold(idVerificationReport?: {
  age?: number
  date_of_birth?: string
}): boolean {
  if (!idVerificationReport) return false

  // 1. Direct age field if provided by provider
  if (typeof idVerificationReport.age === 'number') {
    return idVerificationReport.age >= 18
  }

  // 2. Evaluate from date_of_birth if available
  if (idVerificationReport.date_of_birth) {
    return isAdultFromBirthDate(idVerificationReport.date_of_birth)
  }

  return false
}

/**
 * Normalizes Didit provider status string to domain VerificationStatus.
 * Fails closed if status is unknown or if 'Approved' does not meet the age requirement.
 */
export function normalizeDiditStatus(
  providerStatus: string,
  ageVerified: boolean
): VerificationStatus {
  const normalized = providerStatus.trim().toLowerCase()

  switch (normalized) {
    case 'approved':
      // CRITICAL INVARIANT: 'Approved' only maps to 'VERIFIED' if age >= 18 is confirmed
      return ageVerified ? 'VERIFIED' : 'REJECTED'

    case 'declined':
      return 'REJECTED'

    case 'in review':
      return 'IN_REVIEW'

    case 'in progress':
    case 'resubmitted':
      return 'IN_PROGRESS'

    case 'expired':
    case 'kyc expired':
    case 'abandoned':
      return 'EXPIRED'

    case 'awaiting user':
    case 'not started':
      return 'PENDING'

    default:
      // Fail closed
      return 'REJECTED'
  }
}
