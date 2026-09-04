import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveClientVipEntitlement } from '@/modules/clients/dal'
import { getApprovedMediaDeliveryUrl } from '@/modules/media/delivery'
import { getApprovedVideoPosterDeliveryUrl } from '@/modules/videos/dal'

export async function getNewProfessionals(accountId: string | null, limit = 8) {
  const admin = createAdminClient()
  const { canAccessVipProfiles } = await resolveClientVipEntitlement(accountId)
  const audienceSettingFilter = canAccessVipProfiles ? ['PUBLIC', 'VIP_ONLY'] : ['PUBLIC']

  // Eligible profiles (view enforces status=ACTIVE and gates)
  const { data: eligible } = await admin
    .from('v_publication_eligible_profiles')
    .select('profile_id')

  if (!eligible?.length) return []
  const ids = eligible.map(e => e.profile_id)

  const { data } = await admin
    .from('professional_profiles')
    .select('id, slug, stage_name, headline, public_age, show_age, audience_setting, published_at')
    .in('id', ids)
    .in('audience_setting', audienceSettingFilter)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(limit)
  
  if (!data?.length) return []
  
  // Database ordering above uses the immutable first-publication timestamp.
  const sortedData = data

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
  const audienceSettingFilter = canAccessVipProfiles && canAccessVipMedia ? ['PUBLIC', 'VIP_ONLY'] : ['PUBLIC']

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
    .select('id, profile_id, storage_path, status, width, height, is_primary, approved_at')
    .eq('status', 'APPROVED')
    .is('deleted_at', null)
    .in('profile_id', allowedProfileIds)
    .not('approved_at', 'is', null)
    .order('approved_at', { ascending: false })
    .limit(limit)

  const { data: videos } = await admin.from('profile_videos')
    .select('id, profile_id, storage_path, poster_storage_path, status, approved_at')
    .eq('status', 'APPROVED')
    .is('deleted_at', null)
    .in('profile_id', allowedProfileIds)
    .not('approved_at', 'is', null)
    .order('approved_at', { ascending: false })
    .limit(limit)

  let combined = [
    ...(media?.map(m => ({ type: 'PHOTO', ...m })) ?? []),
    ...(videos?.map(v => ({ type: 'VIDEO', ...v })) ?? [])
  ]

  combined = combined.sort((a, b) => new Date(b.approved_at!).getTime() - new Date(a.approved_at!).getTime()).slice(0, limit)

  const resolved = await Promise.all(combined.map(async item => {
    let url: string | null = null
    if (item.type === 'PHOTO') {
      url = await getApprovedMediaDeliveryUrl({ status: 'APPROVED', storage_path: item.storage_path })
    } else if (item.type === 'VIDEO' && 'poster_storage_path' in item && item.poster_storage_path) {
      url = await getApprovedVideoPosterDeliveryUrl(item.poster_storage_path)
    }
    const profileSlug = eligibleMap.get(item.profile_id)
    if (!url || !profileSlug) return null
    return { ...item, mediaUrl: url, profileSlug }
  }))

  return resolved.filter((item): item is NonNullable<typeof item> => item !== null).slice(0, limit)
}
