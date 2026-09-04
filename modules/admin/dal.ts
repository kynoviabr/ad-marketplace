import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/modules/moderation/guards'
import type {
  AdminOperationsOverview,
  AdminProfessionalSummary,
  AdminAttentionProfile,
  AdminAttentionMedia,
  AdminSuspendedProfile,
  AdminRecentActivityItem,
  AdminProfileQueueFilter,
  AdminProfileQueueItem,
  AdminProfileQueueParams,
  AdminProfileQueueResult,
  AdminMediaQueueFilter,
  AdminMediaType,
  AdminMediaQueueItem,
  AdminMediaQueueParams,
  AdminMediaQueueResult,
} from './types'
import { classifyOperationalStatus } from './operational-status'
import type { ProfileStatus, ContentModerationStatus } from '@/modules/profiles/types'
import type { UserStatus } from '@/modules/auth/types'
import type { VerificationStatus } from '@/modules/verification/types'

/**
 * Pure projection helper that strictly guarantees only operational-safe fields
 * are included in the returned AdminProfessionalSummary.
 *
 * Privacy Invariant:
 * Strips all sensitive identity data (legal name, CPF, DOB, biometrics, documents, Didit payload).
 */
export function projectSafeProfessionalSummary(input: {
  profileId: string
  stageName: string
  profileStatus: ProfileStatus
  verificationStatus: VerificationStatus
  accountStatus: UserStatus
  publicationState: 'PUBLIC' | 'INELIGIBLE' | 'SUSPENDED' | 'BLOCKED'
  primaryLocation: string | null
  createdAt: string
  updatedAt: string
  [key: string]: unknown
}): AdminProfessionalSummary {
  return {
    profileId: String(input.profileId),
    stageName: String(input.stageName),
    profileStatus: input.profileStatus,
    verificationStatus: input.verificationStatus,
    accountStatus: input.accountStatus,
    publicationState: input.publicationState,
    primaryLocation: input.primaryLocation ? String(input.primaryLocation) : null,
    createdAt: String(input.createdAt),
    updatedAt: String(input.updatedAt),
  }
}

/**
 * Retrieves a reusable operational summary for a single professional profile.
 * Verifies admin authorization and projects only safe fields.
 */
export async function getAdminProfessionalSummary(
  profileId: string
): Promise<AdminProfessionalSummary | null> {
  await requireAdmin()

  const admin = createAdminClient()

  // 1. Fetch profile
  const { data: profile, error: profileError } = await admin
    .from('professional_profiles')
    .select('id, stage_name, status, content_moderation_status, account_user_id, created_at, updated_at')
    .eq('id', profileId)
    .maybeSingle()

  if (profileError || !profile) return null

  // 2. Fetch associated account and verification in parallel
  const [accountRes, verificationRes, locationRes, canonicalRes] = await Promise.all([
    admin
      .from('account_users')
      .select('id, status')
      .eq('id', profile.account_user_id)
      .maybeSingle(),
    admin
      .from('identity_verifications')
      .select('status')
      .eq('account_user_id', profile.account_user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('professional_profile_locations')
      .select('is_primary, location:marketplace_locations(name, city:cities(name))')
      .eq('profile_id', profile.id),
    admin
      .from('v_publication_eligible_profiles')
      .select('profile_id')
      .eq('profile_id', profile.id)
      .maybeSingle(),
  ])

  const accountStatus: UserStatus = accountRes.data?.status ?? 'ACTIVE'
  const verificationStatus: VerificationStatus = verificationRes.data?.status ?? 'NOT_STARTED'
  const profileStatus: ProfileStatus = profile.status

  // Derive primary location label
  let primaryLocation: string | null = null
  if (locationRes.data && locationRes.data.length > 0) {
    const primary = locationRes.data.find((l: any) => l.is_primary) ?? locationRes.data[0]
    const loc = primary.location as any
    if (loc?.name && loc?.city?.name) {
      primaryLocation = `${loc.city.name} — ${loc.name}`
    } else if (loc?.name) {
      primaryLocation = loc.name
    }
  }

  // Derive publication state
  let publicationState: 'PUBLIC' | 'INELIGIBLE' | 'SUSPENDED' | 'BLOCKED' = 'INELIGIBLE'
  if (accountStatus === 'SUSPENDED' || profileStatus === 'SUSPENDED') {
    publicationState = 'SUSPENDED'
  } else if (canonicalRes.data) {
    publicationState = 'PUBLIC'
  } else if (verificationStatus === 'REJECTED' || profile.content_moderation_status === 'REJECTED') {
    publicationState = 'BLOCKED'
  } else {
    publicationState = 'INELIGIBLE'
  }

  return projectSafeProfessionalSummary({
    profileId: profile.id,
    stageName: profile.stage_name,
    profileStatus,
    verificationStatus,
    accountStatus,
    publicationState,
    primaryLocation,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  })
}

/**
 * Retrieves the operational overview for the admin landing page.
 * Uses real database counts and queries only; does not invent metrics.
 */
export async function getAdminOperationsOverview(): Promise<AdminOperationsOverview> {
  await requireAdmin()

  const admin = createAdminClient()

  // 1. Fetch real counts & items requiring attention
  const [
    pendingProfilesCountRes,
    pendingProfilesItemsRes,
    pendingPhotosCountRes,
    pendingVideosCountRes,
    pendingPhotosItemsRes,
    pendingVideosItemsRes,
    suspendedProfilesCountRes,
    suspendedProfilesItemsRes,
    recentProfileReviewsRes,
    recentMediaReviewsRes,
    recentBillingAuditRes,
  ] = await Promise.all([
    // Profiles requiring attention count (content pending/flagged OR profile ready for review)
    admin
      .from('professional_profiles')
      .select('*', { count: 'exact', head: true })
      .or('content_moderation_status.in.(PENDING,FLAGGED),status.eq.READY_FOR_REVIEW'),

    // Profiles requiring attention items (top 5 by updated_at)
    admin
      .from('professional_profiles')
      .select('id, stage_name, status, content_moderation_status, account_user_id, updated_at')
      .or('content_moderation_status.in.(PENDING,FLAGGED),status.eq.READY_FOR_REVIEW')
      .order('updated_at', { ascending: false })
      .limit(5),

    // Pending photos count
    admin
      .from('profile_media')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING_MODERATION')
      .is('deleted_at', null),

    // Pending videos count
    admin
      .from('profile_videos')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING_MODERATION')
      .is('deleted_at', null),

    // Pending photos items (top 5)
    admin
      .from('profile_media')
      .select('id, profile_id, created_at')
      .eq('status', 'PENDING_MODERATION')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(5),

    // Pending videos items (top 5)
    admin
      .from('profile_videos')
      .select('id, profile_id, created_at')
      .eq('status', 'PENDING_MODERATION')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(5),

    // Suspended profiles count
    admin
      .from('professional_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'SUSPENDED'),

    // Suspended profiles items (top 5)
    admin
      .from('professional_profiles')
      .select('id, stage_name, status, account_user_id, updated_at')
      .eq('status', 'SUSPENDED')
      .order('updated_at', { ascending: false })
      .limit(5),

    // Recent profile moderation reviews
    admin
      .from('profile_moderation_reviews')
      .select('id, profile_id, reviewer_id, decision, notes, created_at, profile:professional_profiles(stage_name)')
      .order('created_at', { ascending: false })
      .limit(5),

    // Recent media moderation reviews
    admin
      .from('media_moderation_reviews')
      .select('id, media_id, reviewer_id, decision, notes, created_at')
      .order('created_at', { ascending: false })
      .limit(5),

    // Recent billing admin audit logs
    admin
      .from('billing_admin_audit_logs')
      .select('id, actor_account_user_id, target_account_user_id, action, subject_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Build profiles requiring attention
  const attentionProfiles: AdminAttentionProfile[] = (pendingProfilesItemsRes.data ?? []).map(
    (row: any) => ({
      profileId: row.id,
      stageName: row.stage_name || 'Sem nome artístico',
      profileStatus: row.status,
      contentModerationStatus: row.content_moderation_status,
      accountUserId: row.account_user_id,
      updatedAt: row.updated_at,
    })
  )

  // Build media requiring attention items
  const mediaItems: AdminAttentionMedia[] = [
    ...(pendingPhotosItemsRes.data ?? []).map((row: any) => ({
      id: row.id,
      profileId: row.profile_id,
      type: 'PHOTO' as const,
      createdAt: row.created_at,
    })),
    ...(pendingVideosItemsRes.data ?? []).map((row: any) => ({
      id: row.id,
      profileId: row.profile_id,
      type: 'VIDEO' as const,
      createdAt: row.created_at,
    })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  // Build suspended profiles items
  const suspendedProfiles: AdminSuspendedProfile[] = (suspendedProfilesItemsRes.data ?? []).map(
    (row: any) => ({
      profileId: row.id,
      stageName: row.stage_name || 'Perfil suspenso',
      profileStatus: row.status,
      accountStatus: 'SUSPENDED',
      accountUserId: row.account_user_id,
      updatedAt: row.updated_at,
    })
  )

  // Build recent administrative activity
  const recentActivities: AdminRecentActivityItem[] = [
    ...(recentProfileReviewsRes.data ?? []).map((r: any) => ({
      id: r.id,
      type: 'PROFILE_MODERATION' as const,
      actorId: r.reviewer_id,
      action: `Perfil: ${r.decision === 'APPROVE' ? 'Aprovado' : r.decision === 'REJECT' ? 'Rejeitado' : 'Sinalizado'}`,
      subject: r.profile?.stage_name ? `Perfil de ${r.profile.stage_name}` : `Perfil ${r.profile_id?.slice(0, 8)}`,
      timestamp: r.created_at,
      notes: r.notes ?? null,
    })),
    ...(recentMediaReviewsRes.data ?? []).map((r: any) => ({
      id: r.id,
      type: 'MEDIA_MODERATION' as const,
      actorId: r.reviewer_id,
      action: `Foto: ${r.decision === 'APPROVE' ? 'Aprovada' : r.decision === 'REJECT' ? 'Rejeitada' : 'Quarentena'}`,
      subject: `Mídia ${r.media_id?.slice(0, 8)}`,
      timestamp: r.created_at,
      notes: r.notes ?? null,
    })),
    ...(recentBillingAuditRes.data ?? []).map((r: any) => ({
      id: r.id,
      type: 'BILLING_ACTION' as const,
      actorId: r.actor_account_user_id,
      action: `Assinatura: ${r.action}`,
      subject: `Conta ${r.target_account_user_id?.slice(0, 8)}`,
      timestamp: r.created_at,
      notes: null,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10)

  const photosCount = pendingPhotosCountRes.count ?? 0
  const videosCount = pendingVideosCountRes.count ?? 0

  return {
    profilesRequiringAttention: {
      count: pendingProfilesCountRes.count ?? 0,
      items: attentionProfiles,
    },
    mediaRequiringAttention: {
      photosCount,
      videosCount,
      totalCount: photosCount + videosCount,
      items: mediaItems.slice(0, 5),
    },
    suspendedProfiles: {
      count: suspendedProfilesCountRes.count ?? 0,
      items: suspendedProfiles,
    },
    recentActivity: recentActivities,
  }
}

/**
 * Retrieves the paginated, filtered, and ordered profile review queue for administrative operations.
 *
 * Requirements:
 * - ADMIN authorization strictly required
 * - Shows real database profiles using canonical status and operational classification
 * - Projects operational-safe fields only (never exposes legal names, CPFs, DOB, documents, biometrics, Didit data)
 * - Supported filters: 'ALL', 'NEEDS_REVIEW', 'SUSPENDED', 'PAUSED', 'BLOCKED_OR_INELIGIBLE'
 * - Search: stage/display name only
 * - Ordering: needs review first, then oldest waiting/updated first, deterministic tie-breaker
 * - Bounded server-side pagination
 */
export async function getAdminProfileQueue(
  params: AdminProfileQueueParams = {}
): Promise<AdminProfileQueueResult> {
  await requireAdmin()

  const admin = createAdminClient()
  const filter = params.filter || 'ALL'
  const search = params.search?.trim() || ''
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(params.pageSize) || 10))

  let query = admin
    .from('professional_profiles')
    .select(`
      id,
      stage_name,
      status,
      content_moderation_status,
      account_user_id,
      created_at,
      updated_at,
      account_user:account_users(
        id,
        status,
        verifications:identity_verifications(status, created_at)
      ),
      locations:professional_profile_locations(
        is_primary,
        location:marketplace_locations(name, city:cities(name))
      )
    `)

  if (search) {
    query = query.ilike('stage_name', `%${search}%`)
  }

  const { data: rows, error } = await query

  if (error || !rows) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    }
  }

  // Pre-fetch canonical publication eligibility for this candidate set
  const profileIds = rows.map((r: any) => r.id)
  const eligibleSet = new Set<string>()
  if (profileIds.length > 0) {
    const { data: eligible } = await admin
      .from('v_publication_eligible_profiles')
      .select('profile_id')
      .in('profile_id', profileIds)
    for (const e of eligible ?? []) {
      eligibleSet.add(e.profile_id)
    }
  }

  // Map and project safe summaries
  const allItems: AdminProfileQueueItem[] = rows.map((row: any) => {
    const accountStatus: UserStatus = row.account_user?.status ?? 'ACTIVE'

    // Latest verification
    const sortedVerifs = (row.account_user?.verifications ?? []).sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const verificationStatus: VerificationStatus = sortedVerifs[0]?.status ?? 'NOT_STARTED'

    const isCanonicallyEligible = eligibleSet.has(row.id)

    // Primary location
    let primaryLocation: string | null = null
    const locations = row.locations ?? []
    if (locations.length > 0) {
      const primary = locations.find((l: any) => l.is_primary) ?? locations[0]
      const loc = primary.location
      if (loc?.name && loc?.city?.name) {
        primaryLocation = `${loc.city.name} — ${loc.name}`
      } else if (loc?.name) {
        primaryLocation = loc.name
      }
    }

    // Publication state
    let publicationState: 'PUBLIC' | 'INELIGIBLE' | 'SUSPENDED' | 'BLOCKED' = 'INELIGIBLE'
    if (accountStatus === 'SUSPENDED' || row.status === 'SUSPENDED') {
      publicationState = 'SUSPENDED'
    } else if (isCanonicallyEligible) {
      publicationState = 'PUBLIC'
    } else if (verificationStatus === 'REJECTED' || row.content_moderation_status === 'REJECTED') {
      publicationState = 'BLOCKED'
    } else {
      publicationState = 'INELIGIBLE'
    }

    const operationalClassification = classifyOperationalStatus({
      profileStatus: row.status,
      accountStatus,
      contentModerationStatus: row.content_moderation_status,
      verificationStatus,
      isCanonicallyEligible,
    })

    const summary = projectSafeProfessionalSummary({
      profileId: row.id,
      stageName: row.stage_name,
      profileStatus: row.status,
      verificationStatus,
      accountStatus,
      publicationState,
      primaryLocation,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })

    return {
      ...summary,
      operationalClassification,
    }
  })

  // Filter
  let filtered = allItems
  if (filter === 'NEEDS_REVIEW') {
    filtered = filtered.filter((i) => i.operationalClassification === 'NEEDS_REVIEW')
  } else if (filter === 'SUSPENDED') {
    filtered = filtered.filter((i) => i.operationalClassification === 'SUSPENDED')
  } else if (filter === 'PAUSED') {
    filtered = filtered.filter((i) => i.operationalClassification === 'PAUSED')
  } else if (filter === 'BLOCKED_OR_INELIGIBLE') {
    filtered = filtered.filter((i) => i.operationalClassification === 'BLOCKED_OR_INELIGIBLE')
  }

  // Ordering:
  // 1. Needs review first
  // 2. Oldest waiting/updated first
  // 3. Deterministic tie-breaker
  filtered.sort((a, b) => {
    const aNeeds = a.operationalClassification === 'NEEDS_REVIEW' ? 0 : 1
    const bNeeds = b.operationalClassification === 'NEEDS_REVIEW' ? 0 : 1
    if (aNeeds !== bNeeds) return aNeeds - bNeeds

    const aTime = new Date(a.updatedAt).getTime()
    const bTime = new Date(b.updatedAt).getTime()
    if (aTime !== bTime) return aTime - bTime

    return a.profileId.localeCompare(b.profileId)
  })

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const paginatedItems = filtered.slice((page - 1) * pageSize, page * pageSize)

  return {
    items: paginatedItems,
    total,
    page,
    pageSize,
    totalPages,
  }
}

/**
 * Retrieves the paginated, filtered, and ordered media moderation review queue (photos & videos).
 *
 * Requirements:
 * - ADMIN authorization strictly required
 * - Shows real database candidates from profile_media and profile_videos
 * - Reuses existing canonical MediaStatus enums (never invents duplicate status models)
 * - Projects operational-safe fields only (never exposes legal name, CPF, DOB, biometrics, documents, Didit data)
 * - Safe server-side signed URL generation (short-lived 900s, private buckets only)
 * - Supported filters: 'PENDING', 'PHOTOS', 'VIDEOS', 'APPROVED', 'REJECTED', 'ALL'
 * - Search: stage/display name only
 * - Ordering: pending review first, then oldest waiting item first, deterministic tie-breaker by media ID
 * - Bounded server-side pagination (default 12, max 50)
 */
export async function getAdminMediaQueue(
  params: AdminMediaQueueParams = {}
): Promise<AdminMediaQueueResult> {
  await requireAdmin()

  const admin = createAdminClient()
  const filter: AdminMediaQueueFilter = params.filter || 'PENDING'
  const search = params.search?.trim() || ''
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(params.pageSize) || 12))

  // 1. Stage name pre-filtering if search is provided
  let matchingProfileIds: string[] | null = null
  if (search) {
    const { data: matchedProfiles } = await admin
      .from('professional_profiles')
      .select('id')
      .ilike('stage_name', `%${search}%`)

    matchingProfileIds = (matchedProfiles ?? []).map((p: any) => p.id)
    if (matchingProfileIds.length === 0) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      }
    }
  }

  // 2. Query photo candidates (if not filtered strictly to VIDEOS)
  const queryPhotos = filter !== 'VIDEOS'
  const queryVideos = filter !== 'PHOTOS'

  const photoPromise = queryPhotos
    ? (async () => {
        let q = admin
          .from('profile_media')
          .select(
            'id, profile_id, storage_path, status, is_primary, width, height, file_size_bytes, mime_type, created_at, updated_at, approved_at, profile:professional_profiles(id, stage_name)'
          )
          .is('deleted_at', null)

        if (matchingProfileIds) {
          q = q.in('profile_id', matchingProfileIds)
        }

        if (filter === 'PENDING') {
          q = q.eq('status', 'PENDING_MODERATION')
        } else if (filter === 'APPROVED') {
          q = q.eq('status', 'APPROVED')
        } else if (filter === 'REJECTED') {
          q = q.in('status', ['REJECTED', 'QUARANTINED'])
        }

        const { data, error } = await q
        if (error || !data) return []

        return (data as any[]).map((row) => ({
          id: row.id,
          profileId: row.profile_id,
          mediaType: 'PHOTO' as const,
          stageName: row.profile?.stage_name || 'Profissional',
          status: row.status,
          isPrimary: Boolean(row.is_primary),
          storagePath: row.storage_path,
          posterStoragePath: null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          approvedAt: row.approved_at,
          mimeType: row.mime_type,
          fileSizeBytes: row.file_size_bytes,
          width: row.width,
          height: row.height,
          durationSeconds: null,
        }))
      })()
    : Promise.resolve([])

  const videoPromise = queryVideos
    ? (async () => {
        let q = admin
          .from('profile_videos')
          .select(
            'id, profile_id, storage_path, poster_storage_path, status, duration_seconds, file_size_bytes, mime_type, created_at, updated_at, approved_at, profile:professional_profiles(id, stage_name)'
          )
          .is('deleted_at', null)

        if (matchingProfileIds) {
          q = q.in('profile_id', matchingProfileIds)
        }

        if (filter === 'PENDING') {
          q = q.eq('status', 'PENDING_MODERATION')
        } else if (filter === 'APPROVED') {
          q = q.eq('status', 'APPROVED')
        } else if (filter === 'REJECTED') {
          q = q.in('status', ['REJECTED', 'QUARANTINED'])
        }

        const { data, error } = await q
        if (error || !data) return []

        return (data as any[]).map((row) => ({
          id: row.id,
          profileId: row.profile_id,
          mediaType: 'VIDEO' as const,
          stageName: row.profile?.stage_name || 'Profissional',
          status: row.status,
          isPrimary: false,
          storagePath: row.storage_path,
          posterStoragePath: row.poster_storage_path,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          approvedAt: row.approved_at,
          mimeType: row.mime_type,
          fileSizeBytes: row.file_size_bytes,
          width: null,
          height: null,
          durationSeconds: row.duration_seconds,
        }))
      })()
    : Promise.resolve([])

  const [photoCandidates, videoCandidates] = await Promise.all([photoPromise, videoPromise])
  const combined = [...photoCandidates, ...videoCandidates]

  // 3. Ordering:
  // - Pending review first
  // - Oldest waiting item first (createdAt ascending)
  // - Deterministic tie-breaker by media ID
  combined.sort((a, b) => {
    const aPending = a.status === 'PENDING_MODERATION' ? 0 : 1
    const bPending = b.status === 'PENDING_MODERATION' ? 0 : 1
    if (aPending !== bPending) return aPending - bPending

    const aTime = new Date(a.createdAt).getTime()
    const bTime = new Date(b.createdAt).getTime()
    if (aTime !== bTime) return aTime - bTime

    return a.id.localeCompare(b.id)
  })

  // 4. Bounded pagination (server-side slicing)
  const total = combined.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const paginatedSlice = combined.slice((page - 1) * pageSize, page * pageSize)

  // 5. Generate short-lived signed preview URLs strictly for the bounded page
  const items: AdminMediaQueueItem[] = await Promise.all(
    paginatedSlice.map(async (item) => {
      let previewUrl: string | null = null
      let posterUrl: string | null = null
      let videoUrl: string | null = null

      try {
        if (item.mediaType === 'PHOTO') {
          const { data: signed } = await admin.storage
            .from('profile-media')
            .createSignedUrl(item.storagePath, 900)
          previewUrl = signed?.signedUrl ?? null
        } else if (item.mediaType === 'VIDEO') {
          if (item.posterStoragePath) {
            const { data: signedPoster } = await admin.storage
              .from('profile-videos')
              .createSignedUrl(item.posterStoragePath, 900)
            posterUrl = signedPoster?.signedUrl ?? null
            previewUrl = posterUrl
          }
          const { data: signedVideo } = await admin.storage
            .from('profile-videos')
            .createSignedUrl(item.storagePath, 900)
          videoUrl = signedVideo?.signedUrl ?? null
          if (!previewUrl) {
            previewUrl = videoUrl
          }
        }
      } catch {
        // Fail-safe: null URL on preview generation error
      }

      return {
        id: item.id,
        profileId: item.profileId,
        mediaType: item.mediaType,
        stageName: item.stageName,
        status: item.status,
        isPrimary: item.isPrimary,
        previewUrl,
        posterUrl,
        videoUrl,
        storagePath: item.storagePath,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        approvedAt: item.approvedAt,
        mimeType: item.mimeType,
        fileSizeBytes: item.fileSizeBytes,
        durationSeconds: item.durationSeconds,
        width: item.width,
        height: item.height,
      }
    })
  )

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  }
}

/**
 * Retrieves the safe operational detail for a single media item (photo or video),
 * including its safe profile summary and short-lived private playback/preview URLs.
 */
export async function getAdminMediaDetail(
  mediaId: string,
  mediaType?: AdminMediaType
): Promise<{
  item: AdminMediaQueueItem
  profileSummary: AdminProfessionalSummary | null
} | null> {
  await requireAdmin()

  const admin = createAdminClient()

  // 1. Try fetching from profile_media
  let photoRow: any = null
  let videoRow: any = null

  if (!mediaType || mediaType === 'PHOTO') {
    const { data } = await admin
      .from('profile_media')
      .select('id, profile_id, storage_path, status, is_primary, width, height, file_size_bytes, mime_type, created_at, updated_at, approved_at, profile:professional_profiles(id, stage_name)')
      .eq('id', mediaId)
      .is('deleted_at', null)
      .maybeSingle()
    photoRow = data
  }

  // 2. If not found in photos or type is explicitly VIDEO, check profile_videos
  if (!photoRow && (!mediaType || mediaType === 'VIDEO')) {
    const { data } = await admin
      .from('profile_videos')
      .select('id, profile_id, storage_path, poster_storage_path, status, duration_seconds, file_size_bytes, mime_type, created_at, updated_at, approved_at, profile:professional_profiles(id, stage_name)')
      .eq('id', mediaId)
      .is('deleted_at', null)
      .maybeSingle()
    videoRow = data
  }

  if (!photoRow && !videoRow) {
    return null
  }

  const isPhoto = Boolean(photoRow)
  const row = photoRow || videoRow
  const resolvedMediaType: AdminMediaType = isPhoto ? 'PHOTO' : 'VIDEO'

  let previewUrl: string | null = null
  let posterUrl: string | null = null
  let videoUrl: string | null = null

  if (isPhoto) {
    const { data: signed } = await admin.storage
      .from('profile-media')
      .createSignedUrl(row.storage_path, 900)
    previewUrl = signed?.signedUrl ?? null
  } else {
    if (row.poster_storage_path) {
      const { data: signedPoster } = await admin.storage
        .from('profile-videos')
        .createSignedUrl(row.poster_storage_path, 900)
      posterUrl = signedPoster?.signedUrl ?? null
      previewUrl = posterUrl
    }
    const { data: signedVideo } = await admin.storage
      .from('profile-videos')
      .createSignedUrl(row.storage_path, 900)
    videoUrl = signedVideo?.signedUrl ?? null
    if (!previewUrl) {
      previewUrl = videoUrl
    }
  }

  const item: AdminMediaQueueItem = {
    id: row.id,
    profileId: row.profile_id,
    mediaType: resolvedMediaType,
    stageName: row.profile?.stage_name || 'Profissional',
    status: row.status,
    isPrimary: Boolean(row.is_primary),
    previewUrl,
    posterUrl,
    videoUrl,
    storagePath: row.storage_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    durationSeconds: row.duration_seconds || null,
    width: row.width || null,
    height: row.height || null,
  }

  const profileSummary = await getAdminProfessionalSummary(item.profileId)

  return {
    item,
    profileSummary,
  }
}
