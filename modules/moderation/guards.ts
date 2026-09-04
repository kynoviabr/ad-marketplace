import 'server-only'
import { redirect } from 'next/navigation'
import { requireAccount } from '@/modules/auth/dal'
import type { AccountUser } from '@/modules/auth/types'
import { getVerificationSafe } from '@/modules/verification/dal'
import { canProceedToProfessionalProfile } from '@/modules/verification/gates'

/**
 * Resolves the destination route for an advertiser account based on their onboarding progression.
 * Completed onboarding → /dashboard
 * Incomplete onboarding → current onboarding step
 */
export async function resolveAdvertiserDestination(account: AccountUser): Promise<string> {
  if (account.onboarding_status === 'COMPLETED') {
    return '/dashboard'
  }

  if (account.onboarding_step >= 4) {
    const verification = await getVerificationSafe(account.id)
    if (!canProceedToProfessionalProfile(verification)) {
      return '/onboarding/verificacao'
    }
    return account.onboarding_step >= 6 ? '/onboarding/revisar' : '/onboarding/fotos'
  }

  if (account.onboarding_step >= 3) {
    return '/onboarding/onde-atende'
  }

  if (account.onboarding_step >= 2) {
    return '/onboarding/seu-perfil'
  }

  return '/onboarding/voce'
}

/**
 * Server-side Admin Authorization Boundary (FASE 06 / R12.1).
 *
 * Verifies in order:
 * 1. User is authenticated with active session
 * 2. User account exists with status = 'ACTIVE'
 * 3. User account has role = 'ADMIN'
 *
 * Unauthorized redirects:
 * - CLIENT: denied from /admin, redirected to /cliente
 * - ADVERTISER: denied from /admin, redirected to /dashboard (or onboarding step if incomplete)
 */
export async function requireAdmin(): Promise<AccountUser> {
  const account = await requireAccount()

  if (account.role === 'CLIENT') {
    redirect('/cliente')
  }

  if (account.role !== 'ADMIN') {
    const dest = await resolveAdvertiserDestination(account)
    redirect(dest)
  }

  return account
}

