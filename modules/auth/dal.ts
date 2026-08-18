/**
 * Auth Data Access Layer (DAL)
 *
 * Server-only module — provides the authorization boundary for all
 * protected server-side operations.
 *
 * =============================================================================
 * AUTHORIZATION ARCHITECTURE:
 *
 * proxy.ts is NOT the authorization boundary. It only provides:
 *   - Supabase session cookie refresh
 *   - Coarse redirect UX (unauthenticated → /login)
 *
 * The real authorization boundary is HERE in the DAL:
 *   requireAuth()   → verifies authenticated user (Supabase session)
 *   requireAccount() → verifies: auth + account record + status + terms
 *
 * Every protected Server Component, Server Action, and Route Handler
 * must call requireAuth() or requireAccount() independently.
 *
 * SAFE INCOMPLETE STATE:
 *   If terms_version or privacy_version is NULL, the account was created
 *   but legal acceptance was not persistently recorded (e.g., admin client
 *   update failed after signUp). Such accounts are redirected to
 *   /complete-signup to resolve the incomplete state before any operational
 *   access is granted.
 *
 * ACCOUNT STATUS:
 *   ACTIVE    → access granted (subject to onboarding state)
 *   SUSPENDED → redirect to /suspended; no operational access
 *   DELETED   → redirect to /login; no operational access
 * =============================================================================
 */

import 'server-only'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import type { AccountUser } from '@/modules/auth/types'

/**
 * Returns the current Supabase authenticated user, or null if not authenticated.
 * Does NOT redirect. Use requireAuth() for redirect-on-failure behavior.
 */
export async function getSession() {
  const supabase = await createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null
  return user
}

/**
 * Returns the authenticated user or redirects to /login.
 * This is the base authentication check for all protected operations.
 *
 * NOTE: This does NOT check account status or terms acceptance.
 *       Use requireAccount() for full authorization checks.
 */
export async function requireAuth() {
  const user = await getSession()
  if (!user) redirect('/login')
  return user
}

/**
 * Returns the account_users record for the current authenticated user.
 * Returns null if: not authenticated, or no account record found.
 *
 * Uses RLS — user can only read their own record (enforced at DB level).
 */
export async function getAccount(): Promise<AccountUser | null> {
  const user = await getSession()
  if (!user) return null

  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('account_users')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (error || !data) return null
  return data as AccountUser
}

/**
 * Full authorization check for protected operational pages.
 *
 * Verifies in order:
 * 1. Authenticated user (session valid)
 * 2. Account record exists
 * 3. Terms and privacy acceptance recorded (safe incomplete state check)
 * 4. Account status (ACTIVE required; SUSPENDED/DELETED blocked)
 *
 * This is the primary server-side authorization barrier.
 * NEVER rely solely on proxy.ts for security.
 */
export async function requireAccount(): Promise<AccountUser> {
  // 1. Authentication check
  await requireAuth()

  // 2. Account record check
  const account = await getAccount()
  if (!account) {
    // Account record missing — should not happen after FASE 01.
    // Could indicate a trigger failure. Redirect safely.
    redirect('/login')
  }

  // 3. Safe incomplete state check
  // If terms/privacy were not persistently recorded (admin client write failed
  // after signUp), block operational access and redirect to resolve the state.
  if (!account.terms_version || !account.privacy_version) {
    redirect('/complete-signup')
  }

  // 4. Account status check
  if (account.status === 'SUSPENDED') {
    redirect('/suspended')
  }

  if (account.status === 'DELETED') {
    // Deleted accounts should not have valid sessions, but handle defensively
    redirect('/login')
  }

  return account
}
