import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ProfileMedia } from './types'
import { getPrimaryMediaBatch } from './dal'

export interface MediaDeliveryOptions {
  /** Optional profile ID to validate against media.profile_id or storage_path context. */
  profileId?: string
  /**
   * Pre-verified set or array of canonically publication-eligible profile IDs.
   * If provided, verifies that profileId is in this set without issuing a per-item DB query.
   */
  eligibleProfileIds?: Set<string> | string[]
  /**
   * Internal bypass flag for authenticated owner / admin private preview flows.
   */
  privateBypass?: boolean
}

function extractProfileIdFromStoragePath(path: string | undefined): string | null {
  if (!path) return null
  const match = path.match(/^profiles\/([^/]+)\//)
  return match ? match[1] : null
}

/**
 * Public Media Delivery Abstraction.
 *
 * PUBLIC MEDIA DELIVERY CONTRACT:
 * A media object can be signed for public delivery only when:
 * 1. Media exists;
 * 2. Media.status === 'APPROVED';
 * 3. Media belongs to the expected profile (no context/ownership mismatch);
 * 4. Owning profile is canonically publication-eligible via `v_publication_eligible_profiles`
 *    at the moment authorization is resolved.
 *
 * Fails closed otherwise.
 * Returns null for any non-approved media or media belonging to suspended, paused,
 * KYC-ineligible, commercially ineligible, or non-active profiles.
 *
 * URL Validity: 3600 seconds (1 hour) with CDN caching.
 */
export async function getApprovedMediaDeliveryUrl(
  media: (Pick<ProfileMedia, 'status' | 'storage_path'> & Partial<Pick<ProfileMedia, 'profile_id'>>) | null | undefined,
  options?: MediaDeliveryOptions
): Promise<string | null> {
  // 1. Media must exist and be in APPROVED status
  if (!media || media.status !== 'APPROVED') {
    return null
  }

  // 2. Resolve owning profile ID and enforce ownership consistency
  const mediaProfileId = ('profile_id' in media && media.profile_id) ? media.profile_id : null
  const contextProfileId = options?.profileId ?? null

  // CASE H: Profile / Media ownership mismatch
  if (mediaProfileId && contextProfileId && mediaProfileId !== contextProfileId) {
    return null
  }

  const storageProfileId = extractProfileIdFromStoragePath(media.storage_path)
  if (contextProfileId && storageProfileId && contextProfileId !== storageProfileId) {
    return null
  }
  if (mediaProfileId && storageProfileId && mediaProfileId !== storageProfileId) {
    return null
  }

  const resolvedProfileId = contextProfileId || mediaProfileId || storageProfileId

  // 3. For private bypass (owner preview in dashboard), skip public publication eligibility
  if (options?.privateBypass) {
    return signMediaUrl(media.storage_path, 900)
  }

  // 4. For PUBLIC delivery: Owning profile MUST exist and be canonically publication-eligible
  if (!resolvedProfileId) {
    return null
  }

  // 5. Check canonical publication eligibility
  if (options?.eligibleProfileIds) {
    const isEligible = options.eligibleProfileIds instanceof Set
      ? options.eligibleProfileIds.has(resolvedProfileId)
      : options.eligibleProfileIds.includes(resolvedProfileId)

    if (!isEligible) {
      return null
    }
  } else {
    try {
      const admin = createAdminClient()
      const { data: eligible, error } = await admin
        .from('v_publication_eligible_profiles')
        .select('profile_id')
        .eq('profile_id', resolvedProfileId)
        .maybeSingle()

      if (error || !eligible) {
        return null
      }
    } catch (err) {
      console.error('[media:delivery] Error checking publication eligibility:', err)
      return null
    }
  }

  // 6. Profile is confirmed canonically eligible and media is APPROVED: generate signed public URL (1 hour TTL)
  return signMediaUrl(media.storage_path, 3600)
}

/**
 * Privileged/Private Media Delivery.
 *
 * Exclusively for authenticated private contexts:
 * - Admin moderation previews
 * - Advertiser owner dashboard/onboarding previews
 *
 * Bypasses public publication eligibility (which is for PUBLIC marketplace exposure),
 * but STILL requires media.status === 'APPROVED'.
 * Uses a 15-minute TTL (900 seconds) for private previews.
 */
export async function getPrivateApprovedMediaDeliveryUrl(
  media: Pick<ProfileMedia, 'status' | 'storage_path'> | null | undefined
): Promise<string | null> {
  if (!media || media.status !== 'APPROVED') {
    return null
  }

  return signMediaUrl(media.storage_path, 900)
}

/**
 * Explicit public alias for getApprovedMediaDeliveryUrl.
 */
export const getPublicApprovedMediaDeliveryUrl = getApprovedMediaDeliveryUrl

async function signMediaUrl(storagePath: string, expiresIn: number): Promise<string | null> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.storage
      .from('profile-media')
      .createSignedUrl(storagePath, expiresIn)

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
 * Guarantees that only canonically publication-eligible profiles receive signed media delivery URLs.
 * Batch-resolves publication eligibility in parallel with primary media to prevent N+1 queries.
 */
export async function resolveProfilesWithMedia<T extends { id: string }>(
  profiles: T[]
): Promise<(T & { mediaUrl: string | null })[]> {
  if (profiles.length === 0) return []

  const profileIds = profiles.map((p) => p.id)
  const admin = createAdminClient()

  // Single parallel batch query: check canonical publication eligibility and primary media
  const [{ data: eligibleData }, primaryMediaList] = await Promise.all([
    admin
      .from('v_publication_eligible_profiles')
      .select('profile_id')
      .in('profile_id', profileIds),
    getPrimaryMediaBatch(profileIds),
  ])

  const eligibleSet = new Set((eligibleData || []).map((r: any) => r.profile_id))
  const mediaMap = new Map(primaryMediaList.map((m) => [m.profile_id, m]))

  return Promise.all(
    profiles.map(async (profile) => {
      // If the profile is not in the canonical publication eligible view, NEVER deliver public media
      if (!eligibleSet.has(profile.id)) {
        return {
          ...profile,
          mediaUrl: null,
        }
      }

      const media = mediaMap.get(profile.id) || null
      const mediaUrl = await getApprovedMediaDeliveryUrl(media, {
        profileId: profile.id,
        eligibleProfileIds: eligibleSet,
      })
      return {
        ...profile,
        mediaUrl,
      }
    })
  )
}
