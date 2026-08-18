import type { ProfessionalProfile } from './types'

export interface ProfileCompletenessResult {
  isComplete: boolean
  missingFields: string[]
}

/**
 * Evaluates whether a professional profile has all minimum required fields
 * filled to transition from DRAFT to READY_FOR_REVIEW.
 *
 * Rules:
 * 1. stage_name: length >= 2
 * 2. headline: length >= 5
 * 3. bio: length >= 20
 * 4. At least one public contact channel enabled with valid value.
 */
export function evaluateProfileCompleteness(
  profile: Partial<ProfessionalProfile> | null
): ProfileCompletenessResult {
  const missingFields: string[] = []

  if (!profile) {
    return { isComplete: false, missingFields: ['profile_not_created'] }
  }

  // 1. Stage Name
  if (!profile.stage_name || profile.stage_name.trim().length < 2) {
    missingFields.push('stage_name')
  }

  // 2. Headline
  if (!profile.headline || profile.headline.trim().length < 5) {
    missingFields.push('headline')
  }

  // 3. Bio
  if (!profile.bio || profile.bio.trim().length < 20) {
    missingFields.push('bio')
  }

  // 4. Contact
  const hasWhatsapp = Boolean(profile.show_whatsapp && profile.whatsapp_phone?.trim())
  const hasPhone = Boolean(profile.show_phone && profile.direct_phone?.trim())
  const hasTelegram = Boolean(profile.show_telegram && profile.telegram_username?.trim())

  if (!hasWhatsapp && !hasPhone && !hasTelegram) {
    missingFields.push('contact_channel')
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  }
}

/**
 * Boolean helper for profile completeness.
 */
export function isProfileDataComplete(profile: Partial<ProfessionalProfile> | null): boolean {
  return evaluateProfileCompleteness(profile).isComplete
}
