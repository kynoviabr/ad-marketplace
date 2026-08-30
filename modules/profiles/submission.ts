import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { evaluateProfileCompleteness } from './completeness'
import type { ProfessionalProfile, ProfileStatus } from './types'

export interface ProfileSubmissionResult {
  status: ProfileStatus
  isComplete: boolean
  missingFields: string[]
}

/**
 * Submits the authenticated account's complete profile for moderation.
 * Ownership is derived server-side and the DRAFT transition is conditional,
 * making repeated submissions safe.
 */
export async function submitOwnedProfileForReview(
  accountUserId: string
): Promise<ProfileSubmissionResult | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('professional_profiles')
    .select('*')
    .eq('account_user_id', accountUserId)
    .maybeSingle()

  if (error) throw new Error(`profile submission unavailable: ${error.message}`)
  if (!data) return null

  const profile = data as ProfessionalProfile
  const completeness = evaluateProfileCompleteness(profile)

  if (!completeness.isComplete || profile.status !== 'DRAFT') {
    return {
      status: profile.status,
      isComplete: completeness.isComplete,
      missingFields: completeness.missingFields,
    }
  }

  const now = new Date().toISOString()
  const { data: submitted, error: updateError } = await admin
    .from('professional_profiles')
    .update({
      status: 'READY_FOR_REVIEW',
      completed_at: profile.completed_at || now,
      updated_at: now,
    })
    .eq('id', profile.id)
    .eq('account_user_id', accountUserId)
    .eq('status', 'DRAFT')
    .select('status')
    .maybeSingle()

  if (updateError) throw new Error(`profile submission failed: ${updateError.message}`)

  // A concurrent/repeated submission may have already completed the transition.
  return {
    status: (submitted?.status as ProfileStatus | undefined) ?? 'READY_FOR_REVIEW',
    isComplete: true,
    missingFields: [],
  }
}
