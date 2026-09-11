import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export interface ResolvedSubject {
  accountId: string
  role: 'ADVERTISER' | 'CLIENT' | 'ADMIN'
  email: string | null
  phone: string | null
  status: string
  profileId: string | null
  stageName: string | null
  clientMembershipType: string | null
}

/**
 * Resolves a subject deterministically from account ID.
 * Fail-closed: returns null if the account does not exist or database query fails.
 */
export async function resolveSubject(accountId: string): Promise<ResolvedSubject | null> {
  if (!accountId || typeof accountId !== 'string') {
    return null
  }

  const admin = createAdminClient()

  const { data: account, error: accountError } = await admin
    .from('account_users')
    .select('id, auth_user_id, role, status')
    .eq('id', accountId)
    .maybeSingle()

  if (accountError || !account) {
    return null
  }

  let email: string | null = null
  let phone: string | null = null
  if (account.auth_user_id) {
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(account.auth_user_id)
      if (authUser?.user) {
        email = authUser.user.email ?? null
        phone = authUser.user.phone ?? null
      }
    } catch {
      // Best effort auth resolution
    }
  }


  let profileId: string | null = null
  let stageName: string | null = null
  let clientMembershipType: string | null = null

  if (account.role === 'ADVERTISER') {
    const { data: profile } = await admin
      .from('professional_profiles')
      .select('id, stage_name')
      .eq('account_user_id', account.id)
      .maybeSingle()

    if (profile) {
      profileId = profile.id
      stageName = profile.stage_name
    }
  } else if (account.role === 'CLIENT') {
    const { data: membership } = await admin
      .from('client_memberships')
      .select('membership_type')
      .eq('account_id', account.id)
      .maybeSingle()

    if (membership) {
      clientMembershipType = membership.membership_type
    }
  }

  return {
    accountId: account.id,
    role: account.role as 'ADVERTISER' | 'CLIENT' | 'ADMIN',
    email,
    phone,
    status: account.status,

    profileId,
    stageName,
    clientMembershipType,
  }
}
