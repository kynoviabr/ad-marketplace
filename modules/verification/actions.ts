'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAccount } from '@/modules/auth/dal'
import { getVerificationProvider } from './providers/factory'
import { getVerification, getVerificationSafe } from './dal'
import { canProceedToProfessionalProfile } from './gates'
import { redirect } from 'next/navigation'
import type { VerificationActionResult, VerificationSafeDTO } from './types'

interface CachedVerificationSession {
  verificationUrl: string
  providerSessionId: string
  cachedAt: number
}

// In-memory active session cache (per accountUserId) with 15-minute TTL
const activeSessionCache = new Map<string, CachedVerificationSession>()
const inFlightSessionPromises = new Map<string, Promise<VerificationActionResult<{ verificationUrl: string }>>>()
const SESSION_CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

export async function _resetVerificationSessionCache(): Promise<void> {
  activeSessionCache.clear()
  inFlightSessionPromises.clear()
}

/**
 * Server Action: Start or Resume Identity & Age Verification.
 *
 * Flow:
 * 1. Authorize current account via requireAccount().
 * 2. Check in-flight promise to prevent concurrent duplicate Didit calls.
 * 3. Check for existing active verification:
 *    - VERIFIED: reject (already verified).
 *    - IN_REVIEW: reject starting new session (analysis pending).
 *    - PENDING / IN_PROGRESS: reuse active cached session or issue a fresh valid session.
 *    - REJECTED / EXPIRED: issue fresh valid session and reset to PENDING.
 *    - NOT_STARTED / none: insert new session and advance onboarding_step.
 * 4. Return verificationUrl to client for redirection.
 */
export async function startVerificationAction(): Promise<
  VerificationActionResult<{ verificationUrl: string }>
> {
  try {
    const account = await requireAccount()

    // Deduplicate simultaneous requests for the same account
    const existingInFlight = inFlightSessionPromises.get(account.id)
    if (existingInFlight) {
      return await existingInFlight
    }

    const sessionPromise: Promise<
      VerificationActionResult<{ verificationUrl: string }>
    > = (async (): Promise<VerificationActionResult<{ verificationUrl: string }>> => {
      const admin = createAdminClient()
      const existing = await getVerification(account.id)

      if (existing && existing.status === 'VERIFIED') {
        return {
          success: false,
          error: 'Sua conta já possui verificação de identidade e idade confirmada.',
        }
      }

      if (existing && existing.status === 'IN_REVIEW') {
        return {
          success: false,
          error: 'Sua verificação está em análise. Atualize o status para acompanhar.',
        }
      }

      // Check if we have a valid, recent cached session for this account
      const cached = activeSessionCache.get(account.id)
      if (
        cached &&
        existing &&
        ['PENDING', 'IN_PROGRESS'].includes(existing.status) &&
        Date.now() - cached.cachedAt < SESSION_CACHE_TTL_MS
      ) {
        return {
          success: true,
          data: { verificationUrl: cached.verificationUrl },
        }
      }

      const provider = getVerificationProvider()
      const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL
      const providerSession = await provider.createSession({
        accountUserId: account.id,
        callbackUrl: `${configuredAppUrl || 'http://localhost:3000'}/onboarding/verificacao`,
        appUrlConfigured: Boolean(configuredAppUrl),
      })

      const now = new Date().toISOString()

      if (existing && ['REJECTED', 'EXPIRED'].includes(existing.status)) {
        // Re-verification attempt: update existing row with fresh session
        const { error: updateError } = await admin
          .from('identity_verifications')
          .update({
            provider: provider.providerName,
            provider_session_id: providerSession.providerSessionId,
            status: 'PENDING',
            identity_verified: false,
            age_verified: false,
            started_at: now,
            submitted_at: null,
            verified_at: null,
            updated_at: now,
          })
          .eq('id', existing.id)

        if (updateError) {
          console.error('[verification:start] DB update failed:', updateError.message)
          return { success: false, error: 'Não foi possível iniciar a verificação. Tente novamente.' }
        }
      } else if (existing && ['PENDING', 'IN_PROGRESS'].includes(existing.status)) {
        // Active/resumed attempt: update existing row with fresh session
        const { error: updateError } = await admin
          .from('identity_verifications')
          .update({
            provider: provider.providerName,
            provider_session_id: providerSession.providerSessionId,
            status: 'PENDING',
            started_at: now,
            updated_at: now,
          })
          .eq('id', existing.id)

        if (updateError) {
          console.error('[verification:resume] DB update failed:', updateError.message)
          return { success: false, error: 'Não foi possível retomar a verificação. Tente novamente.' }
        }
      } else if (!existing || existing.status === 'NOT_STARTED') {
        // Insert new session
        const { error: insertError } = await admin.from('identity_verifications').insert({
          account_user_id: account.id,
          provider: provider.providerName,
          provider_session_id: providerSession.providerSessionId,
          status: 'PENDING',
          identity_verified: false,
          age_verified: false,
          started_at: now,
        })

        if (insertError) {
          console.error('[verification:start] DB insert failed:', insertError.message)
          return { success: false, error: 'Não foi possível iniciar a verificação. Tente novamente.' }
        }
      }

      // Monotonically advance onboarding metadata to Step 04.
      if (account.onboarding_step < 4) {
        await admin
          .from('account_users')
          .update({ onboarding_step: 4, onboarding_status: 'IN_PROGRESS' })
          .eq('id', account.id)
      }

      // Cache the session for subsequent resumes / rapid re-entry
      activeSessionCache.set(account.id, {
        verificationUrl: providerSession.verificationUrl,
        providerSessionId: providerSession.providerSessionId,
        cachedAt: Date.now(),
      })

      return {
        success: true,
        data: { verificationUrl: providerSession.verificationUrl },
      }
    })()

    inFlightSessionPromises.set(account.id, sessionPromise)
    try {
      return await sessionPromise
    } finally {
      inFlightSessionPromises.delete(account.id)
    }
  } catch (err) {
    console.error('[verification:start] Unexpected error:', err instanceof Error ? err.message : err)
    return {
      success: false,
      error: 'Ocorreu um erro ao conectar ao serviço de verificação. Tente novamente mais tarde.',
    }
  }
}

/**
 * Server Action: Resume an existing verification session.
 * Delegates to startVerificationAction which inspects state and cached sessions.
 */
export async function resumeVerificationAction(): Promise<
  VerificationActionResult<{ verificationUrl: string }>
> {
  return startVerificationAction()
}

/** Advances only when the canonical verified-adult gate is satisfied. */
export async function continueAfterVerificationAction(): Promise<VerificationActionResult<void>> {
  const account = await requireAccount()
  const verification = await getVerificationSafe(account.id)

  if (!canProceedToProfessionalProfile(verification)) {
    return { success: false, error: 'A confirmação de identidade e maioridade ainda não foi concluída.' }
  }

  try {
    const admin = createAdminClient()
    await admin
      .from('account_users')
      .update({ onboarding_status: 'IN_PROGRESS', onboarding_step: 5 })
      .eq('id', account.id)
      .lt('onboarding_step', 5)
  } catch (error) {
    console.error('[verification:continue] Progress update failed:', error instanceof Error ? error.message : error)
    return { success: false, error: 'Não foi possível continuar agora. Tente novamente.' }
  }

  redirect('/onboarding/fotos')
}

/**
 * Server Action: Query current verification status for UI polling/refresh.
 * Returns only the sanitized DTO.
 */
export async function getVerificationStatusAction(): Promise<
  VerificationActionResult<VerificationSafeDTO | null>
> {
  try {
    const account = await requireAccount()
    const safeDTO = await getVerificationSafe(account.id)
    return { success: true, data: safeDTO }
  } catch {
    return { success: false, error: 'Não foi possível consultar o status da verificação.' }
  }
}
