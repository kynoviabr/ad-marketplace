/**
 * Promotions Eligibility Evaluator — FASE 08 (Fail-Closed)
 *
 * Implements centralized placement eligibility rules for boosted profiles.
 * Invariant: Boost NEVER bypasses any of the 8 public search publication gates.
 */

import { isPublicSearchEligible } from '@/modules/search/eligibility'
import type { ProfessionalProfile } from '@/modules/profiles/types'
import type { AccountUser } from '@/modules/auth/types'
import type { IdentityVerification } from '@/modules/verification/types'
import type { ProfileBoost, BoostProduct, BoostPrice } from './types'

/**
 * Pure evaluation of campaign time and lifecycle state.
 * Time-aware: does NOT rely solely on cron/webhook status updates.
 */
export function isBoostTimeEligible(
  boost: Pick<ProfileBoost, 'status' | 'starts_at' | 'ends_at'> | null,
  now: Date = new Date()
): boolean {
  if (!boost) return false
  if (boost.status !== 'ACTIVE') return false

  const startsAt = new Date(boost.starts_at)
  const endsAt = new Date(boost.ends_at)

  // Fail-closed timestamp check
  if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) return false
  if (startsAt > now) return false
  if (endsAt <= now) return false

  return true
}

/**
 * Comprehensive Placement Eligibility Evaluator.
 *
 * Checks all preconditions for a boosted profile to appear in sponsored inventory:
 * 1. Campaign is currently ACTIVE and within valid time bounds (isBoostTimeEligible).
 * 2. Product and Price catalog definitions are active.
 * 3. Profile satisfies ALL 8 publication gates (isPublicSearchEligible).
 */
export function isBoostPlacementEligible(params: {
  boost: Pick<ProfileBoost, 'status' | 'starts_at' | 'ends_at'> | null
  product?: Pick<BoostProduct, 'is_active'> | null
  price?: Pick<BoostPrice, 'is_active'> | null
  profile: Pick<ProfessionalProfile, 'status' | 'content_moderation_status'> | null
  account: Pick<AccountUser, 'status'> | null
  verification: Pick<IdentityVerification, 'status' | 'identity_verified' | 'age_verified'> | null
  locationsCount: number
  approvedPhotosCount: number
  publicationEntitlement: boolean
  now?: Date
}): boolean {
  // 1. Time & status eligibility
  if (!isBoostTimeEligible(params.boost, params.now)) {
    return false
  }

  // 2. Product / Price active check (if provided)
  if (params.product && !params.product.is_active) {
    return false
  }
  if (params.price && !params.price.is_active) {
    return false
  }

  // 3. Centralized 8-Gate Public Search Publication Eligibility (FASE 06/07)
  const isPublic = isPublicSearchEligible(
    params.profile,
    params.account,
    params.verification,
    params.locationsCount,
    params.approvedPhotosCount,
    params.publicationEntitlement
  )

  return isPublic === true
}
