import { createAdminClient } from '@/lib/supabase/admin'

/**
 * CLIENT Provisioning & Domain Consistency Helpers — Guardrail I
 *
 * NOTE: Production CLIENT membership creation is database-owned via
 * `trg_ensure_client_membership` on `public.account_users`. Whenever
 * an account enters role = 'CLIENT', the canonical FREE membership is
 * created atomically within the same PostgreSQL transaction.
 *
 * `ensureClientMembership`: Maintained as an operational repair / idempotency
 * helper for out-of-band data maintenance, diagnostic scripts, or backfills.
 *
 * `assertClientProvisioningInvariant`: Verifies that an account with role = 'CLIENT'
 * has a valid client_memberships record (used in diagnostics, audits, and tests).
 */

export interface EnsureClientMembershipResult {
  success: boolean
  error?: string
}

export interface ClientProvisioningStatus {
  isConsistent: boolean
  role: string | null
  hasMembership: boolean
  membershipType?: string | null
  error?: string
}

/**
 * Ensures that the given account has a valid client_memberships record.
 * Accepts either an explicit admin Supabase client and accountId, or just accountId.
 *
 * Uses upsert with onConflict: 'account_id' so that repeat invocations
 * are strictly idempotent and retry-safe.
 */
export async function ensureClientMembership(
  adminOrAccountId: any,
  maybeAccountId?: string
): Promise<EnsureClientMembershipResult> {
  let admin: any
  let accountId: string

  if (typeof adminOrAccountId === 'string') {
    accountId = adminOrAccountId
    admin = createAdminClient()
  } else {
    admin = adminOrAccountId
    accountId = maybeAccountId!
  }

  if (!accountId) {
    return {
      success: false,
      error: 'Account ID is required for client membership provisioning',
    }
  }

  const { error } = await admin
    .from('client_memberships')
    .upsert(
      {
        account_id: accountId,
        membership_type: 'FREE',
      },
      { onConflict: 'account_id' }
    )

  if (error) {
    return {
      success: false,
      error: error.message || 'Failed to provision client membership',
    }
  }

  return { success: true }
}

/**
 * Validates domain consistency for a client account.
 * Asserts that if account_users.role === 'CLIENT', a valid client_memberships
 * record exists. Returns isConsistent: false if partially provisioned.
 */
export async function assertClientProvisioningInvariant(
  adminOrAccountId: any,
  maybeAccountId?: string
): Promise<ClientProvisioningStatus> {
  let admin: any
  let accountId: string

  if (typeof adminOrAccountId === 'string') {
    accountId = adminOrAccountId
    admin = createAdminClient()
  } else {
    admin = adminOrAccountId
    accountId = maybeAccountId!
  }

  if (!accountId) {
    return {
      isConsistent: false,
      role: null,
      hasMembership: false,
      error: 'Account ID is required',
    }
  }

  const { data: account, error: accountError } = await admin
    .from('account_users')
    .select('id, role, status')
    .eq('id', accountId)
    .maybeSingle()

  if (accountError || !account) {
    return {
      isConsistent: false,
      role: null,
      hasMembership: false,
      error: accountError?.message || 'Account not found',
    }
  }

  if (account.role !== 'CLIENT') {
    // Non-client accounts (ADVERTISER, ADMIN) do not require client_memberships
    return {
      isConsistent: true,
      role: account.role,
      hasMembership: false,
    }
  }

  const { data: membership, error: membershipError } = await admin
    .from('client_memberships')
    .select('account_id, membership_type, valid_until')
    .eq('account_id', accountId)
    .maybeSingle()

  if (membershipError) {
    return {
      isConsistent: false,
      role: 'CLIENT',
      hasMembership: false,
      error: membershipError.message,
    }
  }

  if (!membership) {
    return {
      isConsistent: false,
      role: 'CLIENT',
      hasMembership: false,
      error: 'CLIENT account is missing client_memberships record (partial provisioning detected)',
    }
  }

  return {
    isConsistent: true,
    role: 'CLIENT',
    hasMembership: true,
    membershipType: membership.membership_type,
  }
}
