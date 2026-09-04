/**
 * Admin Operational Status Model — R12.1
 *
 * Provides internal classification helpers that reuse existing enums/statuses
 * without inventing duplicate status models.
 *
 * Classifications:
 * - NEEDS_REVIEW: Profile or verification requires operator attention
 * - ACTIVE: Profile and account are active and eligible/approved
 * - PAUSED: Profile is temporarily paused by professional
 * - SUSPENDED: Account or profile is administratively suspended
 * - BLOCKED_OR_INELIGIBLE: Incomplete, rejected, or missing publication gates
 */

import type { ProfileStatus, ContentModerationStatus } from '@/modules/profiles/types'
import type { UserStatus } from '@/modules/auth/types'
import type { VerificationStatus } from '@/modules/verification/types'
import type { OperationalClassification } from './types'

export interface ClassifyOperationalStatusParams {
  profileStatus: ProfileStatus
  accountStatus: UserStatus
  contentModerationStatus?: ContentModerationStatus | null
  verificationStatus?: VerificationStatus | null
  isCanonicallyEligible?: boolean
}

/**
 * Classifies the operational status of a professional profile using canonical database states.
 * Evaluates priority: SUSPENDED > NEEDS_REVIEW > PAUSED > ACTIVE > BLOCKED_OR_INELIGIBLE.
 */
export function classifyOperationalStatus(params: ClassifyOperationalStatusParams): OperationalClassification {
  // 1. Suspension takes strict precedence
  if (params.accountStatus === 'SUSPENDED' || params.profileStatus === 'SUSPENDED') {
    return 'SUSPENDED'
  }

  // 2. Needs operator review: pending or flagged moderation, ready for review, or KYC in manual review
  if (
    params.contentModerationStatus === 'PENDING' ||
    params.contentModerationStatus === 'FLAGGED' ||
    params.profileStatus === 'READY_FOR_REVIEW' ||
    params.verificationStatus === 'IN_REVIEW'
  ) {
    return 'NEEDS_REVIEW'
  }

  // 3. Paused by professional
  if (params.profileStatus === 'PAUSED') {
    return 'PAUSED'
  }

  // 4. Active: profile active, account active, and canonically eligible or approved
  if (
    params.profileStatus === 'ACTIVE' &&
    params.accountStatus === 'ACTIVE' &&
    (params.isCanonicallyEligible || params.contentModerationStatus === 'APPROVED')
  ) {
    return 'ACTIVE'
  }

  // 5. Blocked or ineligible (draft, rejected kyc, rejected moderation, deleted account, missing gates)
  return 'BLOCKED_OR_INELIGIBLE'
}

/**
 * Returns a human-readable operational status label.
 */
export function getOperationalStatusLabel(
  classification: OperationalClassification,
  locale: string = 'pt-BR'
): string {
  const isPt = locale === 'pt-BR'
  switch (classification) {
    case 'NEEDS_REVIEW':
      return isPt ? 'Requer revisão' : 'Needs review'
    case 'ACTIVE':
      return isPt ? 'Ativo' : 'Active'
    case 'PAUSED':
      return isPt ? 'Pausado' : 'Paused'
    case 'SUSPENDED':
      return isPt ? 'Suspenso' : 'Suspended'
    case 'BLOCKED_OR_INELIGIBLE':
      return isPt ? 'Bloqueado / Inelegível' : 'Blocked / Ineligible'
  }
}
