import 'server-only'
import { redirect } from 'next/navigation'
import { requireAccount } from '@/modules/auth/dal'
import type { AccountUser } from '@/modules/auth/types'

/**
 * Server-side Admin Authorization Boundary (FASE 06).
 *
 * Verifies in order:
 * 1. User is authenticated with active session
 * 2. User account exists with status = 'ACTIVE'
 * 3. User account has role = 'ADMIN'
 *
 * Redirects non-admins to /dashboard or denies execution.
 */
export async function requireAdmin(): Promise<AccountUser> {
  const account = await requireAccount()

  if (account.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  return account
}
