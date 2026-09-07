import 'server-only'
import { requireAccount } from '@/modules/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Canonical Server-Side Profile Ownership Guard (PX7 Consolidation)
 *
 * Verifies that the authenticated caller owns the target professional profile,
 * or possesses the ADMIN role.
 * Throws an unauthorized error otherwise.
 * Never trusts client-supplied account or profile IDs.
 */
export async function assertProfileOwnership(
  profileId: string
): Promise<{ accountId: string; isAdmin: boolean }> {
  const account = await requireAccount()
  const isAdmin = account.role === 'ADMIN'

  if (isAdmin) {
    return { accountId: account.id, isAdmin: true }
  }

  const admin = createAdminClient()
  const { data: profile, error } = await admin
    .from('professional_profiles')
    .select('id, account_user_id')
    .eq('id', profileId)
    .maybeSingle()

  if (error || !profile || profile.account_user_id !== account.id) {
    throw new Error('Não autorizado: você não possui permissão para gerenciar este perfil.')
  }

  return { accountId: account.id, isAdmin: false }
}
