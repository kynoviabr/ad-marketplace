import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ContentReport, ReportQueueItem } from './types'

/**
 * Retrieves the open content reports queue for admin oversight.
 */
export async function getOpenReportsQueue(): Promise<ReportQueueItem[]> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('content_reports')
    .select(`
      id,
      profile_id,
      media_id,
      reason_category,
      description,
      status,
      created_at,
      profile:professional_profiles (
        stage_name,
        slug
      ),
      media:profile_media (
        storage_path,
        profile:professional_profiles (
          stage_name,
          slug
        )
      )
    `)
    .in('status', ['OPEN', 'IN_REVIEW'])
    .order('created_at', { ascending: true })

  if (error || !data) {
    return []
  }

  const items: ReportQueueItem[] = []

  for (const item of data as any[]) {
    const isProfileTarget = Boolean(item.profile_id)
    const stageName = isProfileTarget
      ? item.profile?.stage_name || 'Perfil'
      : item.media?.profile?.stage_name || 'Foto de Perfil'
    const slug = isProfileTarget
      ? item.profile?.slug || ''
      : item.media?.profile?.slug || ''

    let mediaPreviewUrl: string | null = null
    if (!isProfileTarget && item.media?.storage_path) {
      const { data: signed } = await admin.storage
        .from('profile-media')
        .createSignedUrl(item.media.storage_path, 900)
      mediaPreviewUrl = signed?.signedUrl || null
    }

    items.push({
      id: item.id,
      profile_id: item.profile_id,
      media_id: item.media_id,
      target_type: isProfileTarget ? 'PROFILE' : 'MEDIA',
      stage_name: stageName,
      slug,
      reason_category: item.reason_category,
      description: item.description,
      status: item.status,
      created_at: item.created_at,
      media_preview_url: mediaPreviewUrl,
    })
  }

  return items
}

/**
 * Retrieves a single report with its details.
 */
export async function getReportById(reportId: string): Promise<ContentReport | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('content_reports')
    .select('*')
    .eq('id', reportId)
    .maybeSingle()

  if (error || !data) return null
  return data as ContentReport
}
