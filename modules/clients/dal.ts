import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Resolves effective client VIP entitlements server-side.
 * Fail-closed: returns false on any missing/invalid state.
 * Rules:
 * - Account must have role = CLIENT
 * - client_membership row must exist with membership_type = VIP
 * - valid_until, if present, must be in the future
 * - ADVERTISER accounts with a membership row do NOT become VIP
 */
export async function resolveClientVipEntitlement(accountId: string | null): Promise<{
  canAccessVipProfiles: boolean
  canAccessVipMedia: boolean
}> {
  const DENIED = { canAccessVipProfiles: false, canAccessVipMedia: false }
  if (!accountId) return DENIED
  const admin = createAdminClient()
  const { data: account, error: accountError } = await admin
    .from('account_users')
    .select('id, role, status')
    .eq('id', accountId)
    .maybeSingle()
  if (accountError || !account || account.role !== 'CLIENT' || account.status !== 'ACTIVE') return DENIED
  const now = new Date().toISOString()
  const { data: membership, error: membershipError } = await admin
    .from('client_memberships')
    .select('membership_type, valid_until')
    .eq('account_id', accountId)
    .maybeSingle()
  if (membershipError || !membership || membership.membership_type !== 'VIP') return DENIED
  if (membership.valid_until && membership.valid_until < now) return DENIED
  return { canAccessVipProfiles: true, canAccessVipMedia: true }
}

export async function resolveCanAccessVipProfiles(accountId: string | null): Promise<boolean> {
  const { canAccessVipProfiles } = await resolveClientVipEntitlement(accountId)
  return canAccessVipProfiles
}
