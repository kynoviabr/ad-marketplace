/**
 * /auth/callback — Supabase OAuth & Confirmation Callback
 *
 * Handles:
 * - Email confirmation & password reset PKCE exchange
 * - Google OAuth exchange with strict intent preservation
 *
 * SECURITY & ROLE SAFETY (R11.5A):
 * - Never infers role from query parameters.
 * - Preserves existing account roles immutably (no role escalation or alteration).
 * - For new Google accounts: requires explicit 'ADVERTISER' or 'CLIENT' intent
 *   verified from a signed HttpOnly cookie.
 * - Ambiguous new users (intent 'LOGIN' or missing/tampered) FAIL CLOSED:
 *   account is cleaned up, session signed out, and user redirected to /login?error=signup_intent_required.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyOAuthIntentCookie } from '@/modules/auth/oauth'
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '@/lib/config/legal-versions'

function isSafeRedirect(next: string | null): next is string {
  if (!next) return false
  return /^\/[a-zA-Z0-9/_\-?#=&%]*$/.test(next)
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next')
  const errorParam = searchParams.get('error')

  const redirectWithClearedCookie = (url: string) => {
    const res = NextResponse.redirect(url)
    res.cookies.set('velvet_oauth_intent', '', { maxAge: 0, path: '/' })
    return res
  }

  // 1. Check for provider-level OAuth errors
  if (errorParam) {
    return redirectWithClearedCookie(`${origin}/login?error=oauth_error`)
  }

  // 2. Missing authorization code
  if (!code) {
    return redirectWithClearedCookie(`${origin}/login?error=confirmation_failed`)
  }

  // 3. Read signed intent from HttpOnly cookie
  const intentCookie = request.cookies.get('velvet_oauth_intent')?.value
  const verifiedIntent = verifyOAuthIntentCookie(intentCookie)

  // 4. Exchange code for session via PKCE
  const supabase = await createServerClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return redirectWithClearedCookie(`${origin}/login?error=oauth_failed`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirectWithClearedCookie(`${origin}/login?error=oauth_failed`)
  }

  const admin = createAdminClient()

  // 5. Query account_users for this auth user
  const { data: account } = await admin
    .from('account_users')
    .select('id, role, status, onboarding_status, terms_version')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const isExistingAccount = Boolean(account && account.terms_version !== null)

  // 6. EXISTING ACCOUNT: Immutable role preservation
  if (isExistingAccount && account) {
    if (account.status === 'SUSPENDED') {
      return redirectWithClearedCookie(`${origin}/suspended`)
    }

    // Role-safe destination routing
    if (account.role === 'CLIENT') {
      if (isSafeRedirect(nextParam) && !nextParam.startsWith('/admin') && !nextParam.startsWith('/dashboard') && !nextParam.startsWith('/onboarding')) {
        return redirectWithClearedCookie(`${origin}${nextParam}`)
      }
      return redirectWithClearedCookie(`${origin}/cliente`)
    }

    if (account.role === 'ADMIN') {
      if (isSafeRedirect(nextParam)) {
        return redirectWithClearedCookie(`${origin}${nextParam}`)
      }
      return redirectWithClearedCookie(`${origin}/admin`)
    }

    // ADVERTISER routing
    if (isSafeRedirect(nextParam) && !nextParam.startsWith('/admin') && !nextParam.startsWith('/cliente')) {
      return redirectWithClearedCookie(`${origin}${nextParam}`)
    }

    if (account.onboarding_status === 'COMPLETED') {
      return redirectWithClearedCookie(`${origin}/dashboard`)
    }

    return redirectWithClearedCookie(`${origin}/onboarding`)
  }

  // 7. NEW ACCOUNT WITH EXPLICIT INTENT: Set up authoritative role
  const now = new Date().toISOString()

  if (verifiedIntent === 'ADVERTISER') {
    await admin
      .from('account_users')
      .update({
        role: 'ADVERTISER',
        status: 'ACTIVE',
        onboarding_status: 'NOT_STARTED',
        onboarding_step: 0,
        terms_version: CURRENT_TERMS_VERSION,
        terms_accepted_at: now,
        privacy_version: CURRENT_PRIVACY_VERSION,
        privacy_accepted_at: now,
      })
      .eq('auth_user_id', user.id)

    return redirectWithClearedCookie(`${origin}/onboarding`)
  }

  if (verifiedIntent === 'CLIENT') {
    const { data: updatedAccount } = await admin
      .from('account_users')
      .update({
        role: 'CLIENT',
        status: 'ACTIVE',
        onboarding_status: 'COMPLETED',
        onboarding_step: 0,
        terms_version: CURRENT_TERMS_VERSION,
        terms_accepted_at: now,
        privacy_version: CURRENT_PRIVACY_VERSION,
        privacy_accepted_at: now,
      })
      .eq('auth_user_id', user.id)
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

    return redirectWithClearedCookie(`${origin}/cliente`)
  }

  // 8. NEW ACCOUNT WITHOUT EXPLICIT SIGNUP INTENT (or intent === 'LOGIN'):
  // FAIL CLOSED — roll back to avoid creating wrong-role or ambiguous accounts.
  try {
    await admin.from('account_users').delete().eq('auth_user_id', user.id)
    await admin.auth.admin.deleteUser(user.id)
    await supabase.auth.signOut()
  } catch (rollbackErr) {
    console.error('[OAuth Callback] Error during rollback of ambiguous signup:', rollbackErr)
  }

  return redirectWithClearedCookie(`${origin}/login?error=signup_intent_required`)
}
