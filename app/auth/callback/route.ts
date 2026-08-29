/**
 * /auth/callback — Supabase email confirmation and password reset callback
 *
 * Supabase sends users to this route after:
 * - Email confirmation (signup)
 * - Password reset
 *
 * The `next` query parameter determines where to redirect after exchange.
 *
 * SECURITY:
 * - The `next` parameter is validated to be a relative path only.
 *   External URLs are rejected to prevent open redirect attacks.
 * - The code is exchanged for a session via Supabase PKCE flow.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/** Validates that a redirect target is safe (relative path within our app). */
function isSafeRedirect(next: string | null): next is string {
  if (!next) return false
  // Only allow relative paths starting with /
  // Reject absolute URLs, protocol-relative URLs, and data URIs
  return /^\/[a-zA-Z0-9/_\-?#=&%]*$/.test(next)
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next')

  // Validate the redirect target
  const next = isSafeRedirect(nextParam) ? nextParam : '/onboarding'

  if (code) {
    const supabase = await createServerClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Successful exchange — redirect to validated destination
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If code is missing or exchange failed, redirect to login with error indicator
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
