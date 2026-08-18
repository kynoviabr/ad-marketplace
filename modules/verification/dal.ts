import 'server-only'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAccount } from '@/modules/auth/dal'
import type { IdentityVerification, VerificationSafeDTO } from './types'
import { canProceedToProfessionalProfile } from './gates'

/**
 * Retrieves the full verification domain record for an account user.
 * Restricted to server-side operations (uses admin client).
 */
export async function getVerification(accountUserId: string): Promise<IdentityVerification | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('identity_verifications')
    .select('*')
    .eq('account_user_id', accountUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data as IdentityVerification
}

/**
 * Retrieves a sanitized client-safe DTO of the verification state.
 * Never exposes provider session IDs, internal tokens, or audit fields.
 */
export async function getVerificationSafe(accountUserId: string): Promise<VerificationSafeDTO | null> {
  const record = await getVerification(accountUserId)
  if (!record) return null

  return {
    status: record.status,
    identityVerified: record.identity_verified,
    ageVerified: record.age_verified,
    verifiedAt: record.verified_at,
    expiresAt: record.expires_at,
  }
}

/**
 * Primary server-side authorization barrier for Verified Advertiser features (FASE 03+).
 *
 * Enforces in order:
 * 1. requireAccount() — auth + ACTIVE account + terms acceptance
 * 2. canProceedToProfessionalProfile() — status VERIFIED + identity_verified + age_verified (>= 18)
 *
 * Redirects unverified advertisers to /onboarding/verification.
 */
export async function requireVerifiedAdvertiser() {
  const account = await requireAccount()
  const verification = await getVerificationSafe(account.id)

  if (!canProceedToProfessionalProfile(verification)) {
    redirect('/onboarding/verification')
  }

  return {
    account,
    verification: verification!,
  }
}

/**
 * Retrieves a verification record by its external provider session ID.
 * Used exclusively by webhook handlers and admin operations.
 */
export async function getVerificationBySessionId(sessionId: string): Promise<IdentityVerification | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('identity_verifications')
    .select('*')
    .eq('provider_session_id', sessionId)
    .maybeSingle()

  if (error || !data) return null
  return data as IdentityVerification
}
