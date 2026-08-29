import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { getApprovedMediaDeliveryUrl } from '@/modules/media/delivery'
import type { ProfileMedia } from '@/modules/media/types'
import type { ProfileLocation } from '@/modules/locations/types'
import { getPublicProfileDTO } from './dal'
import type { PublicProfileDTO } from './types'

export interface PublicProfileMediaDTO { url: string; width: number | null; height: number | null; isPrimary: boolean }
export interface PublicProfileDetailDTO {
  profile: PublicProfileDTO
  city: { id: string; name: string; slug: string }
  locations: Array<{ name: string; slug: string; isPrimary: boolean }>
  media: PublicProfileMediaDTO[]
  verifiedIdentity: true
  verifiedAdult: true
}

/** Anonymous public-detail lookup. Absence from the canonical view always means unavailable. */
export async function getEligiblePublicProfileBySlug(slug: string): Promise<PublicProfileDetailDTO | null> {
  const normalizedSlug = slug.trim().toLowerCase()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) return null
  const admin = createAdminClient()
  const { data: eligible, error: eligibilityError } = await admin
    .from('v_publication_eligible_profiles')
    .select('profile_id, profile_slug, city_id')
    .eq('profile_slug', normalizedSlug)
    .limit(1)
    .maybeSingle()
  if (eligibilityError || !eligible) return null

  const [profile, cityResult, locationsResult, mediaResult] = await Promise.all([
    getPublicProfileDTO(normalizedSlug),
    admin.from('cities').select('id, name, slug').eq('id', eligible.city_id).eq('active', true).maybeSingle(),
    admin.from('professional_profile_locations').select('*, location:marketplace_locations(*)').eq('profile_id', eligible.profile_id).order('is_primary', { ascending: false }),
    admin.from('profile_media').select('*').eq('profile_id', eligible.profile_id).eq('status', 'APPROVED').is('deleted_at', null).order('position', { ascending: true }),
  ])
  if (!profile || cityResult.error || !cityResult.data || locationsResult.error || mediaResult.error) return null

  const canonicalLocations = ((locationsResult.data ?? []) as ProfileLocation[])
    .filter((item) => item.location?.active && item.location.city_id === eligible.city_id)
    .map((item) => ({ name: item.location!.name, slug: item.location!.slug, isPrimary: item.is_primary }))
  if (canonicalLocations.length === 0) return null

  const uniqueMedia = Array.from(new Map(((mediaResult.data ?? []) as ProfileMedia[]).map((item) => [item.storage_path, item])).values())
  const delivered = await Promise.all(uniqueMedia.map(async (item) => ({ item, url: await getApprovedMediaDeliveryUrl(item) })))
  const media = delivered.flatMap(({ item, url }) => url ? [{ url, width: item.width, height: item.height, isPrimary: item.is_primary }] : [])
  if (media.length === 0) return null

  return { profile, city: cityResult.data, locations: canonicalLocations, media, verifiedIdentity: true, verifiedAdult: true }
}
