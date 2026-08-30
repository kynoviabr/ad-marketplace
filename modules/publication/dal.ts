import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasPublicationEntitlement } from '@/modules/billing/entitlements'
import { getApprovedMediaDeliveryUrl } from '@/modules/media/delivery'
import type { ProfileMedia } from '@/modules/media/types'
import { getPublicProfileDTO } from '@/modules/profiles/dal'
import type { ProfessionalProfile } from '@/modules/profiles/types'
import type { AccountUser } from '@/modules/auth/types'
import type { ProfileLocation } from '@/modules/locations/types'
import type { VerificationSafeDTO } from '@/modules/verification/types'
import { buildPublicationReadiness } from './readiness'
import { evaluateProfileCompleteness } from '@/modules/profiles/completeness'
import type { PublicationReviewState } from './types'

export async function isProfileCanonicallyEligible(accountUserId: string, profileId?: string): Promise<boolean> {
  const admin = createAdminClient()
  let query = admin.from('v_publication_eligible_profiles').select('profile_id').eq('account_user_id', accountUserId)
  if (profileId) query = query.eq('profile_id', profileId)
  const { data, error } = await query.limit(1).maybeSingle()
  if (error) throw new Error(`canonical eligibility unavailable: ${error.message}`)
  return Boolean(data)
}

/** Server-only activation gate, separate from the ACTIVE-only public visibility view. */
export async function isProfileReadyForActivation(accountUserId: string, profileId: string): Promise<boolean> {
  const admin = createAdminClient()
  const [accountResult, profileResult, verificationResult, locationResult, mediaResult, entitlementResult] = await Promise.all([
    admin.from('account_users').select('status').eq('id', accountUserId).maybeSingle(),
    admin.from('professional_profiles').select('*').eq('id', profileId).eq('account_user_id', accountUserId).maybeSingle(),
    admin.from('identity_verifications').select('status, identity_verified, age_verified').eq('account_user_id', accountUserId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('professional_profile_locations').select('location:marketplace_locations!inner(active, city:cities!inner(active))').eq('profile_id', profileId).eq('location.active', true).eq('location.city.active', true).limit(1),
    admin.from('profile_media').select('id').eq('profile_id', profileId).eq('status', 'APPROVED').eq('is_primary', true).is('deleted_at', null).limit(1),
    hasPublicationEntitlement(accountUserId).then((value) => ({ value, error: null }), (error: unknown) => ({ value: false, error })),
  ])
  if (accountResult.error || profileResult.error || verificationResult.error || locationResult.error || mediaResult.error || entitlementResult.error) {
    throw new Error('activation eligibility unavailable')
  }
  const profile = (profileResult.data as ProfessionalProfile | null) ?? null
  return Boolean(
    accountResult.data?.status === 'ACTIVE' &&
    profile?.status === 'READY_FOR_REVIEW' &&
    evaluateProfileCompleteness(profile).isComplete &&
    profile.content_moderation_status === 'APPROVED' &&
    verificationResult.data?.status === 'VERIFIED' &&
    verificationResult.data.identity_verified === true &&
    verificationResult.data.age_verified === true &&
    (locationResult.data?.length ?? 0) > 0 &&
    (mediaResult.data?.length ?? 0) > 0 &&
    entitlementResult.value
  )
}

export async function getPublicationReviewState(account: AccountUser): Promise<PublicationReviewState> {
  const admin = createAdminClient()
  const { data: profileData, error: profileError } = await admin.from('professional_profiles').select('*').eq('account_user_id', account.id).maybeSingle()
  const profile = (profileData as ProfessionalProfile | null) ?? null
  if (profileError || !profile) {
    const readiness = buildPublicationReadiness({ account, profile: null, verification: null, locations: [], media: [], hasEntitlement: false, activationEligible: false, dataAvailable: !profileError })
    return { profileId: null, slug: null, preview: null, previewPhotoUrl: null, primaryLocation: null, serviceAreas: [], readiness: readiness.items, photos: { approved: 0, pending: 0, rejected: 0, blocked: 0, statuses: [] }, isCanonicallyEligible: false, onboardingCompleted: account.onboarding_status === 'COMPLETED', isPublic: false, blockingReasons: readiness.blockingReasons, hasDataError: Boolean(profileError) }
  }
  const [verificationResult, locationsResult, mediaResult, entitlementResult, activationResult, publicResult, preview] = await Promise.all([
    admin.from('identity_verifications').select('status, identity_verified, age_verified, verified_at, expires_at').eq('account_user_id', account.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('professional_profile_locations').select('*, location:marketplace_locations(*)').eq('profile_id', profile.id).order('is_primary', { ascending: false }),
    admin.from('profile_media').select('*').eq('profile_id', profile.id).is('deleted_at', null).order('position', { ascending: true }),
    hasPublicationEntitlement(account.id).then((value) => ({ value, error: null }), (error: unknown) => ({ value: false, error })),
    isProfileReadyForActivation(account.id, profile.id).then((value) => ({ value, error: null }), (error: unknown) => ({ value: false, error })),
    isProfileCanonicallyEligible(account.id, profile.id).then((value) => ({ value, error: null }), (error: unknown) => ({ value: false, error })),
    getPublicProfileDTO(profile.slug),
  ])
  const verification = verificationResult.data ? { status: verificationResult.data.status, identityVerified: verificationResult.data.identity_verified, ageVerified: verificationResult.data.age_verified, verifiedAt: verificationResult.data.verified_at, expiresAt: verificationResult.data.expires_at } as VerificationSafeDTO : null
  const locations = (locationsResult.data ?? []) as ProfileLocation[]
  const media = (mediaResult.data ?? []) as ProfileMedia[]
  const approvedMedia = media.filter((item) => item.status === 'APPROVED')
  const previewPhotoUrl = await getApprovedMediaDeliveryUrl(approvedMedia.find((item) => item.is_primary) ?? null)
  const hasDataError = Boolean(verificationResult.error || locationsResult.error || mediaResult.error || entitlementResult.error || activationResult.error || publicResult.error)
  const activationEligible = !hasDataError && activationResult.value
  const publiclyEligible = !hasDataError && publicResult.value
  const readiness = buildPublicationReadiness({ account, profile, verification, locations, media, hasEntitlement: entitlementResult.value, activationEligible, dataAvailable: !hasDataError })
  const serviceAreas = locations.flatMap((item) => item.location?.active ? [item.location.name] : [])
  return { profileId: profile.id, slug: profile.slug, preview, previewPhotoUrl, primaryLocation: locations.find((item) => item.is_primary && item.location?.active)?.location?.name ?? null, serviceAreas, readiness: readiness.items, photos: { approved: approvedMedia.length, pending: media.filter((item) => ['UPLOADING', 'PROCESSING', 'PENDING_MODERATION'].includes(item.status)).length, rejected: media.filter((item) => item.status === 'REJECTED').length, blocked: media.filter((item) => ['QUARANTINED', 'DELETED'].includes(item.status)).length, statuses: media.map((item) => item.status) }, isCanonicallyEligible: activationEligible, onboardingCompleted: account.onboarding_status === 'COMPLETED', isPublic: publiclyEligible && profile.status === 'ACTIVE', blockingReasons: readiness.blockingReasons, hasDataError }
}
