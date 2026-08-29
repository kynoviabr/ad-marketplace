import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ManageableProfileMedia, ProfileMedia } from './types'

export const STALE_UPLOAD_AGE_MS = 60 * 60 * 1000

/**
 * Retrieves all active (non-deleted) media for a given profile ID ordered by position.
 */
export async function getProfileMedia(profileId: string): Promise<ProfileMedia[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profile_media')
    .select('*')
    .eq('profile_id', profileId)
    .is('deleted_at', null)
    .order('position', { ascending: true })

  if (error || !data) return []
  return data as ProfileMedia[]
}

/**
 * Retrieves the primary active photo for a given profile ID.
 */
export async function getPrimaryMedia(profileId: string): Promise<ProfileMedia | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profile_media')
    .select('*')
    .eq('profile_id', profileId)
    .eq('is_primary', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null
  return data as ProfileMedia
}

/**
 * Retrieves primary active photos for an array of profile IDs.
 * Mitigates N+1 query problem on search/home result grids.
 */
export async function getPrimaryMediaBatch(profileIds: string[]): Promise<ProfileMedia[]> {
  if (profileIds.length === 0) return []

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profile_media')
    .select('*')
    .in('profile_id', profileIds)
    .eq('is_primary', true)
    .is('deleted_at', null)

  if (error || !data) return []
  return data as ProfileMedia[]
}

/**
 * Retrieves a single media item by its ID.
 */
export async function getMediaById(mediaId: string): Promise<ProfileMedia | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profile_media')
    .select('*')
    .eq('id', mediaId)
    .maybeSingle()

  if (error || !data) return null
  return data as ProfileMedia
}

/**
 * Returns the count of active (non-deleted) photos for a profile.
 */
export async function getActivePhotoCount(profileId: string): Promise<number> {
  const admin = createAdminClient()
  const { count, error } = await admin
    .from('profile_media')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .is('deleted_at', null)

  if (error || count === null) return 0
  return count
}

/** Marks abandoned upload attempts as retryable without deleting their canonical record. */
export async function reconcileStaleUploadingMedia(profileId: string): Promise<void> {
  const admin = createAdminClient()
  const staleBefore = new Date(Date.now() - STALE_UPLOAD_AGE_MS).toISOString()
  await admin
    .from('profile_media')
    .update({ status: 'PROCESSING_FAILED', updated_at: new Date().toISOString() })
    .eq('profile_id', profileId)
    .eq('status', 'UPLOADING')
    .is('deleted_at', null)
    .lt('updated_at', staleBefore)
}

/** Owner-management previews are signed and remain separate from public APPROVED-only delivery. */
export async function getManageableProfileMedia(profileId: string): Promise<ManageableProfileMedia[]> {
  const media = await getProfileMedia(profileId)
  const admin = createAdminClient()
  return Promise.all(media.map(async (item) => {
    const { data } = await admin.storage.from('profile-media').createSignedUrl(item.storage_path, 900)
    return { ...item, previewUrl: data?.signedUrl ?? null }
  }))
}
