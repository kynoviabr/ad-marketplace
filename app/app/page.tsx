/**
 * Role-Aware Installed App Launcher — PX4.7 Velvet App Experience
 *
 * Canonical entry point when Velvet is launched from the home screen (start_url: /app).
 *
 * Security & Routing Invariants:
 * 1. SERVER-AUTHORITATIVE: Derives routing strictly from authenticated session
 *    and account_users record. Ignores all client query parameters (e.g., ?role=ADMIN).
 * 2. ANONYMOUS USERS: Redirected to public marketplace home ('/') for seamless discovery.
 * 3. CLIENT ROLE: Redirected to canonical client area ('/cliente').
 * 4. ADVERTISER ROLE: Redirected to studio ('/dashboard') or active onboarding step.
 * 5. ADMIN ROLE: Redirected to operations portal ('/admin').
 * 6. NETWORK-ONLY: Must never be cached in Cache Storage (enforced by public/sw.js).
 */

import { redirect } from 'next/navigation'
import { getAccount } from '@/modules/auth/dal'
import { resolveAdvertiserDestination } from '@/modules/moderation/guards'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Velvet',
  robots: 'noindex, nofollow',
}

export default async function AppLauncherPage() {
  const account = await getAccount()

  // 1. Anonymous visitor launching installed app -> explore marketplace
  if (!account) {
    redirect('/')
  }

  // 2. Suspended or deleted account status
  if (account.status === 'SUSPENDED') {
    redirect('/suspended')
  }
  if (account.status === 'DELETED') {
    redirect('/login')
  }

  // 3. Safe incomplete state check
  if (!account.terms_version || !account.privacy_version) {
    redirect('/complete-signup')
  }

  // 4. Role-authoritative routing
  if (account.role === 'ADMIN') {
    redirect('/admin')
  }

  if (account.role === 'CLIENT') {
    redirect('/cliente')
  }

  if (account.role === 'ADVERTISER') {
    if (account.onboarding_status === 'COMPLETED') {
      redirect('/dashboard')
    }
    const destination = await resolveAdvertiserDestination(account)
    redirect(destination)
  }

  // Fallback for safety
  redirect('/')
}
