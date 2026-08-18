import 'server-only'
import type { ProfessionalProfile } from './types'
import { isProfileDataComplete } from './completeness'

/**
 * Gate: Checks if a profile has completed all domain data requirements
 * and is ready for subsequent phases (FASE 04 Locations & FASE 05 Media).
 */
export function isProfileReadyForNextSteps(profile: ProfessionalProfile | null): boolean {
  if (!profile) return false
  return profile.status === 'READY_FOR_REVIEW' && isProfileDataComplete(profile)
}

/**
 * Gate: Checks if an advertiser is permitted to create or update their profile.
 * Requires ACTIVE account status.
 */
export function canAdvertiserManageProfile(accountStatus: string): boolean {
  return accountStatus === 'ACTIVE'
}
