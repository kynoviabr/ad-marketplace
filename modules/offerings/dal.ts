import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { OFFERING_OPTIONS, createUnspecifiedOfferingMap, mapOfferingStatusesToAiContext, type AiOfferingContext, type OfferedOfferingGroups, type OfferingCode, type OfferingStatusMap, type ProfessionalOfferingRow } from './types'

export async function getProfileOfferingStatuses(profileId: string): Promise<OfferingStatusMap> {
  const statuses = createUnspecifiedOfferingMap()
  const admin = createAdminClient()
  const { data, error } = await admin.from('professional_profile_offerings').select('profile_id, option_code, status').eq('profile_id', profileId)
  if (error) throw new Error(`Unable to load profile offerings: ${error.message}`)
  for (const row of (data ?? []) as ProfessionalOfferingRow[]) statuses[row.option_code] = row.status
  return statuses
}

export async function getOfferedOfferingGroups(profileId: string): Promise<OfferedOfferingGroups> {
  const admin = createAdminClient()
  const { data, error } = await admin.from('professional_profile_offerings').select('option_code').eq('profile_id', profileId).eq('status', 'OFFERED')
  if (error) throw new Error(`Unable to load public offerings: ${error.message}`)
  const offered = new Set((data ?? []).map((row: { option_code: OfferingCode }) => row.option_code))
  const groups: OfferedOfferingGroups = {}
  for (const option of OFFERING_OPTIONS) if (offered.has(option.code)) (groups[option.group] ??= []).push(option.code)
  return groups
}

export async function getAiOfferingContext(profileId: string): Promise<AiOfferingContext> {
  return mapOfferingStatusesToAiContext(await getProfileOfferingStatuses(profileId))
}
