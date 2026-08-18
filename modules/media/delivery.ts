import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ProfileMedia } from './types'

/**
 * Centralized Media Delivery Abstraction.
 *
 * Exclusively provides access URLs for media in APPROVED status.
 * Returns null for any media in non-approved states (PENDING, REJECTED, QUARANTINED, UPLOADING, etc.).
 *
 * This layer encapsulates the current Supabase signed URL generation and allows
 * future migration to CDN, AWS CloudFront, or an image proxy without modifying
 * consuming domain components.
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
