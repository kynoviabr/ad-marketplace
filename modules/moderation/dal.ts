import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  PendingMediaQueueItem,
  PendingProfileQueueItem,
  MediaModerationReview,
  ProfileModerationReview,
} from './types'

/**
 * Retrieves the pending media queue for admin moderation.
 * Generates temporary signed preview URLs specifically for the admin session.
 * Applies data minimization: never exposes legal names, CPFs or KYC provider payloads.
 */
export async function getPendingMediaQueue(): Promise<PendingMediaQueueItem[]> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('profile_media')
    .select(`
      id,
      profile_id,
      storage_path,
      position,
      is_primary,
      created_at,
      profile:professional_profiles (
        stage_name,
        public_age,
        slug,
        account_user_id
      )
    `)
    .eq('status', 'PENDING_MODERATION')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error || !data) {
    return []
  }

  const items: PendingMediaQueueItem[] = []

  for (const item of data as any[]) {
    // Generate temporary 15-minute preview URL for admin UI
    const { data: signed } = await admin.storage
      .from('profile-media')
      .createSignedUrl(item.storage_path, 900)

    items.push({
      id: item.id,
      profile_id: item.profile_id,
      stage_name: item.profile?.stage_name || 'Anunciante',
      public_age: item.profile?.public_age || null,
      slug: item.profile?.slug || '',
      storage_path: item.storage_path,
      preview_url: signed?.signedUrl || null,
      is_primary: item.is_primary,
      position: item.position,
      created_at: item.created_at,
      verified_adult: true, // Derived from KYC invariant
    })
  }

  return items
}

/**
 * Retrieves the pending profile text moderation queue.
 */
export async function getPendingProfileQueue(): Promise<PendingProfileQueueItem[]> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('professional_profiles')
    .select(`
      id,
      stage_name,
      slug,
      public_age,
      headline,
      bio,
      whatsapp_phone,
      direct_phone,
      telegram_username,
      content_moderation_status,
      completed_at,
      photos:profile_media(id, status, deleted_at)
    `)
    .eq('content_moderation_status', 'PENDING')
    .in('status', ['READY_FOR_REVIEW', 'ACTIVE'])
    .order('completed_at', { ascending: true, nullsFirst: false })

  if (error || !data) {
    return []
  }

  return (data as any[]).map((p) => {
    const approvedCount = (p.photos || []).filter(
      (m: any) => m.status === 'APPROVED' && !m.deleted_at
    ).length

    return {
      id: p.id,
      stage_name: p.stage_name,
      slug: p.slug,
      public_age: p.public_age,
      headline: p.headline,
      bio: p.bio,
      whatsapp_phone: p.whatsapp_phone,
      direct_phone: p.direct_phone,
      telegram_username: p.telegram_username,
      content_moderation_status: p.content_moderation_status,
      completed_at: p.completed_at,
      verified_adult: true,
      approved_photos_count: approvedCount,
    }
  })
}

/**
 * Retrieves the moderation review history for a specific media item.
 */
export async function getMediaReviews(mediaId: string): Promise<MediaModerationReview[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('media_moderation_reviews')
    .select('*')
    .eq('media_id', mediaId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as MediaModerationReview[]
}

/**
 * Retrieves the moderation review history for a specific profile.
 */
export async function getProfileReviews(profileId: string): Promise<ProfileModerationReview[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profile_moderation_reviews')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as ProfileModerationReview[]
}
