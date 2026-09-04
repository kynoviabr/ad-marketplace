'use server'

/**
 * Supabase Passwordless Email OTP Actions — R11.5C1
 *
 * Security & Role Invariants:
 * 1. Role is immutable: Existing accounts NEVER change role on email OTP login.
 * 2. Fail-closed on ambiguous LOGIN: New users signing in via LOGIN intent fail closed
 *    and require intent selection (ADVERTISER vs CLIENT).
 * 3. Explicit intent on signup:
 *    - /signup -> ADVERTISER
 *    - /signup-client -> CLIENT
 * 4. Invariant: Plaintext OTP codes are NEVER logged, printed, or saved.
 * 5. Server-side only: zero service-role leakage to client code.
 * 6. Rate limited via IP-derived HMAC keys.
 */

import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deriveAuthRateLimitKey, isAuthRateLimited } from '@/modules/auth/rate-limiter'
import {
  normalizeEmail,
  validateEmailOtpCode,
  type RequestEmailOtpResult,
  type VerifyEmailOtpResult,
} from './email-otp'
import type { OAuthIntent } from './oauth'
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '@/lib/config/legal-versions'

/**
 * Derives a rate-limit key from IP address for Email OTP actions.
 */
async function getEmailOtpRateLimitKey(): Promise<string | null> {
  const secret = process.env.ANALYTICS_RATE_LIMIT_SECRET || process.env.AUTH_INTENT_SECRET
  if (!secret) return null
  const headersList = await headers()
  const forwarded = headersList.get('x-forwarded-for')
  const rawIp = forwarded ? forwarded.split(',')[0].trim() : headersList.get('x-real-ip')
  return deriveAuthRateLimitKey(rawIp, secret)
}

/**
 * Server Action: Requests a 6-digit Email OTP from Supabase Auth.
 */
export async function requestEmailOtpAction(
  rawEmail: string,
  intent: OAuthIntent
): Promise<RequestEmailOtpResult> {
  // 1. Validate intent
  if (intent !== 'ADVERTISER' && intent !== 'CLIENT' && intent !== 'LOGIN') {
    return { success: false, error: 'Intenção de autenticação inválida.' }
  }

  // 2. Validate and normalize email
  const normalized = normalizeEmail(rawEmail)
  if (!normalized.valid || !normalized.email) {
    return { success: false, error: normalized.error || 'Informe um endereço de e-mail válido.' }
  }

  // 3. Check rate limits
  const rlKey = await getEmailOtpRateLimitKey()
  if (rlKey && isAuthRateLimited(rlKey, 'OTP_REQUEST')) {
    return {
      success: false,
      error: 'Muitas tentativas de envio. Aguarde alguns minutos antes de tentar novamente.',
    }
  }

  // 4. Request OTP via Supabase Auth
  try {
    const supabase = await createServerClient()
    const shouldCreateUser = intent !== 'LOGIN'

    const { error } = await supabase.auth.signInWithOtp({
      email: normalized.email,
      options: {
        shouldCreateUser,
      },
    })

    if (error) {
      // If intent is LOGIN and account does not exist in Supabase Auth, fail closed:
      // user must choose their role explicitly (ADVERTISER vs CLIENT)
      if (intent === 'LOGIN') {
        return {
          success: false,
          requiresIntentSelection: true,
          error: 'signup_intent_required',
        }
      }
      return {
        success: false,
        error: 'Não foi possível enviar o código por e-mail. Tente novamente.',
      }
    }

    return {
      success: true,
      email: normalized.email,
      retryAfterSeconds: 60,
    }
  } catch {
    return {
      success: false,
      error: 'Não foi possível enviar o código por e-mail. Tente novamente.',
    }
  }
}

/**
 * Server Action: Verifies the 6-digit Email OTP and enforces authoritative role routing.
 */
export async function verifyEmailOtpAction(
  rawEmail: string,
  code: string,
  intent: OAuthIntent
): Promise<VerifyEmailOtpResult> {
  // 1. Validate intent
  if (intent !== 'ADVERTISER' && intent !== 'CLIENT' && intent !== 'LOGIN') {
    return { success: false, error: 'Intenção de autenticação inválida.' }
  }

  // 2. Validate code format (strict 6 numeric digits)
  const codeValidation = validateEmailOtpCode(code)
  if (!codeValidation.valid || !codeValidation.code) {
    return {
      success: false,
      error: codeValidation.error || 'Código inválido. Digite os 6 dígitos numéricos.',
    }
  }

  // 3. Validate and normalize email
  const normalized = normalizeEmail(rawEmail)
  if (!normalized.valid || !normalized.email) {
    return { success: false, error: normalized.error || 'Informe um endereço de e-mail válido.' }
  }

  // 4. Check rate limits
  const rlKey = await getEmailOtpRateLimitKey()
  if (rlKey && isAuthRateLimited(rlKey, 'OTP_VERIFY')) {
    return {
      success: false,
      error: 'Muitas tentativas de validação. Aguarde alguns minutos antes de tentar novamente.',
    }
  }

  // 5. Verify OTP via Supabase Auth
  // Invariant: Never log the raw OTP token
  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.verifyOtp({
    email: normalized.email,
    token: codeValidation.code,
    type: 'email',
  })

  if (error || !data.user) {
    return {
      success: false,
      error: 'Código inválido ou expirado. Verifique os 6 dígitos e tente novamente.',
    }
  }

  const user = data.user
  const admin = createAdminClient()

  // 6. Query account_users to check existing authoritative state
  const { data: account } = await admin
    .from('account_users')
    .select('id, role, status, onboarding_status, terms_version')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const isExistingAccount = Boolean(account && account.terms_version !== null)

  // 7. EXISTING ACCOUNT: Role is immutable!
  if (isExistingAccount && account) {
    if (account.status === 'SUSPENDED') {
      return { success: true, destination: '/suspended' }
    }

    if (account.role === 'CLIENT') {
      return { success: true, destination: '/cliente' }
    }

    if (account.role === 'ADMIN') {
      return { success: true, destination: '/admin' }
    }

    // ADVERTISER
    if (account.onboarding_status === 'COMPLETED') {
      return { success: true, destination: '/dashboard' }
    }

    return { success: true, destination: '/onboarding' }
  }

  // 8. NEW ACCOUNT WITH EXPLICIT ADVERTISER INTENT
  const now = new Date().toISOString()

  if (intent === 'ADVERTISER') {
    await admin
      .from('account_users')
      .upsert(
        {
          auth_user_id: user.id,
          role: 'ADVERTISER',
          status: 'ACTIVE',
          onboarding_status: 'NOT_STARTED',
          onboarding_step: 0,
          terms_version: CURRENT_TERMS_VERSION,
          terms_accepted_at: now,
          privacy_version: CURRENT_PRIVACY_VERSION,
          privacy_accepted_at: now,
        },
        { onConflict: 'auth_user_id' }
      )

    return { success: true, destination: '/onboarding' }
  }

  // 9. NEW ACCOUNT WITH EXPLICIT CLIENT INTENT
  if (intent === 'CLIENT') {
    const { data: updatedAccount } = await admin
      .from('account_users')
      .upsert(
        {
          auth_user_id: user.id,
          role: 'CLIENT',
          status: 'ACTIVE',
          onboarding_status: 'COMPLETED',
          onboarding_step: 0,
          terms_version: CURRENT_TERMS_VERSION,
          terms_accepted_at: now,
          privacy_version: CURRENT_PRIVACY_VERSION,
          privacy_accepted_at: now,
        },
        { onConflict: 'auth_user_id' }
      )
      .select('id')
      .single()

    if (updatedAccount) {
      await admin
        .from('client_memberships')
        .upsert(
          {
            account_id: updatedAccount.id,
            membership_type: 'FREE',
          },
          { onConflict: 'account_id' }
        )
    }

    return { success: true, destination: '/cliente' }
  }

  // 10. NEW ACCOUNT UNDER LOGIN INTENT (or missing intent): FAIL CLOSED!
  // Rollback ambiguous account to avoid creating wrong-role or orphaned accounts.
  try {
    await admin.from('account_users').delete().eq('auth_user_id', user.id)
    await admin.auth.admin.deleteUser(user.id)
    await supabase.auth.signOut()
  } catch (rollbackErr) {
    console.error('[Email OTP] Error during rollback of ambiguous signup:', rollbackErr)
  }

  return {
    success: false,
    requiresIntentSelection: true,
    error: 'signup_intent_required',
  }
}
