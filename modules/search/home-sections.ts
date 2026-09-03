import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveClientVipEntitlement } from '@/modules/clients/dal'
import { getApprovedMediaDeliveryUrl } from '@/modules/media/delivery'

export async function getNewProfessionals(accountId: string | null, limit = 8) {
  const admin = createAdminClient()
  const { canAccessVipProfiles } = await resolveClientVipEntitlement(accountId)
  const audienceSettingFilter = canAccessVipProfiles ? ['PUBLIC', 'VIP_ONLY'] : ['PUBLIC']

  // Eligible profiles (view enforces status=ACTIVE and gates)
  const { data: eligible } = await admin
    .from('v_publication_eligible_profiles')
    .select('profile_id, updated_at')
    .order('updated_at', { ascending: false })

  if (!eligible?.length) return []
  const ids = eligible.map(e => e.profile_id)

  const { data } = await admin
    .from('professional_profiles')
    .select('id, slug, stage_name, headline, public_age, show_age, audience_setting, updated_at')
    .in('id', ids)
    .in('audience_setting', audienceSettingFilter)
  
  if (!data?.length) return []
  
  // Sort data based on the view's updated_at (which is the authoritative publication recency)
  const sortedData = data.sort((a, b) => {
    const aDate = eligible.find(e => e.profile_id === a.id)?.updated_at || ''
    const bDate = eligible.find(e => e.profile_id === b.id)?.updated_at || ''
    return new Date(bDate).getTime() - new Date(aDate).getTime()
  }).slice(0, limit)

  if (!sortedData.length) return []
  
  // Get primary media
  const { data: media } = await admin.from('profile_media')
    .select('profile_id, storage_path, status, width, height, is_primary')
    .eq('status', 'APPROVED')
    .eq('is_primary', true)
    .is('deleted_at', null)
    .in('profile_id', sortedData.map(p => p.id))

  return Promise.all(sortedData.map(async p => {
    const m = media?.find(m => m.profile_id === p.id)
    const url = m ? await getApprovedMediaDeliveryUrl(m) : null
    return { ...p, mediaUrl: url, mediaWidth: m?.width, mediaHeight: m?.height }
  }))
}

export async function getNewContent(accountId: string | null, limit = 8) {
  const admin = createAdminClient()
  const { canAccessVipMedia, canAccessVipProfiles } = await resolveClientVipEntitlement(accountId)
  const audienceSettingFilter = canAccessVipProfiles ? ['PUBLIC', 'VIP_ONLY'] : ['PUBLIC']

  // Get eligible profile IDs first
  const { data: eligible } = await admin.from('v_publication_eligible_profiles').select('profile_id, profile_slug')
  if (!eligible?.length) return []
  const eligibleMap = new Map(eligible.map(e => [e.profile_id, e.profile_slug]))
  const eligibleIds = eligible.map(e => e.profile_id)
  
  // Filter eligible IDs by audience setting
  const { data: profiles } = await admin.from('professional_profiles')
    .select('id')
    .in('id', eligibleIds)
    .in('audience_setting', audienceSettingFilter)
  if (!profiles?.length) return []
  const allowedProfileIds = profiles.map(p => p.id)

  const { data: media } = await admin.from('profile_media')
    .select('id, profile_id, storage_path, status, width, height, is_primary, updated_at')
    .eq('status', 'APPROVED')
    .is('deleted_at', null)
    .in('profile_id', allowedProfileIds)
    .order('updated_at', { ascending: false })
    .limit(limit)

  const { data: videos } = await admin.from('profile_videos')
    .select('id, profile_id, storage_path, poster_path, status, updated_at')
    .eq('status', 'APPROVED')
    .in('profile_id', allowedProfileIds)
    .order('updated_at', { ascending: false })
    .limit(limit)

  let combined = [
    ...(media?.map(m => ({ type: 'PHOTO', ...m })) ?? []),
    ...(videos?.map(v => ({ type: 'VIDEO', ...v })) ?? [])
  ]

  // Apply VIP media filter if there's any logic. 
  // Wait, the instructions didn't specify a VIP flag on media itself, only VIP profiles.
  // Actually, wait, maybe the content can just be returned as is.
  combined = combined.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, limit)

  return Promise.all(combined.map(async item => {
    let url = null
    if (item.type === 'PHOTO') {
      url = await getApprovedMediaDeliveryUrl({ status: 'APPROVED', storage_path: item.storage_path })
    } else if (item.type === 'VIDEO' && 'poster_path' in item && item.poster_path) {
      url = await getApprovedMediaDeliveryUrl({ status: 'APPROVED', storage_path: item.poster_path as string })
    }
    return { ...item, mediaUrl: url, profileSlug: eligibleMap.get(item.profile_id) }
  }))
}
