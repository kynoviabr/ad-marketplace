import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ProfileMedia } from './types'
import { getPrimaryMediaBatch } from './dal'

/**
 * Centralized Media Delivery Abstraction.
 *
 * Exclusively provides access URLs for media in APPROVED status.
 * Returns null for any media in non-approved states (PENDING, REJECTED, QUARANTINED, UPLOADING, etc.).
 */
export async function getApprovedMediaDeliveryUrl(
  media: Pick<ProfileMedia, 'status' | 'storage_path'> | null | undefined
): Promise<string | null> {
  if (!media || media.status !== 'APPROVED') {
    return null
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin.storage
      .from('profile-media')
      .createSignedUrl(media.storage_path, 3600) // 1 hour validity with CDN caching

    if (error || !data) {
      return null
    }

    return data.signedUrl
  } catch (err) {
    console.error('[media:delivery] Error generating signed delivery URL:', err)
    return null
  }
}

/**
 * Convenience method to resolve primary media URLs for a batch of profiles in a single pass.
 */
export async function resolveProfilesWithMedia<T extends { id: string }>(profiles: T[]): Promise<(T & { mediaUrl: string | null })[]> {
  if (profiles.length === 0) return []

  const profileIds = profiles.map(p => p.id)
  const primaryMediaList = await getPrimaryMediaBatch(profileIds)
  const mediaMap = new Map(primaryMediaList.map(m => [m.profile_id, m]))

  return Promise.all(
    profiles.map(async (profile) => {
      const media = mediaMap.get(profile.id) || null
      const mediaUrl = await getApprovedMediaDeliveryUrl(media)
      return {
        ...profile,
        mediaUrl,
      }
    })
  )
}
