'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAccount } from '@/modules/auth/dal'
import { getVerificationProvider } from './providers/factory'
import { getVerification, getVerificationSafe } from './dal'
import { canProceedToProfessionalProfile } from './gates'
import { redirect } from 'next/navigation'
import type { VerificationActionResult, VerificationSafeDTO } from './types'

/**
 * Server Action: Start Identity & Age Verification.
 *
 * Flow:
 * 1. Authorize current account via requireAccount().
 * 2. Check if an active session already exists in DB.
 * 3. Invoke verification provider to create hosted session URL.
 * 4. Persist or update verification record atomically using admin client.
 * 5. Advance onboarding_step to Step 04 monotonically.
 * 6. Return verificationUrl to client for redirection.
 */
export async function startVerificationAction(): Promise<
  VerificationActionResult<{ verificationUrl: string }>
> {
  try {
    const account = await requireAccount()
    const admin = createAdminClient()

    // Check for existing active verification
    const existing = await getVerification(account.id)
    if (existing && existing.status === 'VERIFIED') {
      return {
        success: false,
        error: 'Sua conta já possui verificação de identidade e idade confirmada.',
      }
    }

    if (existing && ['PENDING', 'IN_PROGRESS', 'IN_REVIEW'].includes(existing.status)) {
      return { success: false, error: 'Sua verificação já está em andamento. Atualize o status para acompanhar.' }
    }

    const provider = getVerificationProvider()

    // Create session in provider first (compensatory pattern: avoid dangling DB records if provider fails)
    const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL
    const providerSession = await provider.createSession({
      accountUserId: account.id,
      callbackUrl: `${configuredAppUrl || 'http://localhost:3000'}/onboarding/verificacao`,
      appUrlConfigured: Boolean(configuredAppUrl),
    })

    const now = new Date().toISOString()

    if (existing && ['REJECTED', 'EXPIRED'].includes(existing.status)) {
      // Re-verification attempt: update existing row or create a new session
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

    return {
      success: true,
      data: { verificationUrl: providerSession.verificationUrl },
    }
  } catch (err) {
    console.error('[verification:start] Unexpected error:', err instanceof Error ? err.message : err)
    return {
      success: false,
      error: 'Ocorreu um erro ao conectar ao serviço de verificação. Tente novamente mais tarde.',
    }
  }
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
