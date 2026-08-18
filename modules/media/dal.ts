import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ProfileMedia } from './types'

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
