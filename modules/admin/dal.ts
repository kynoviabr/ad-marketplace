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
} from './types'
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
