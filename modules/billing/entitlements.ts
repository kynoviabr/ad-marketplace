/**
 * Billing Entitlements — FASE 07
 *
 * Two distinct entitlement concepts:
 *
 * 1. PUBLICATION ENTITLEMENT (hasPublicationEntitlement)
 *    Security/business-critical. FAIL-CLOSED. No fallback. No default.
 *    TRUE only when valid subscription OR valid admin override.
 *
 * 2. FEATURE/QUOTA ENTITLEMENT (getPlanEntitlement)
 *    Operational limits per plan. MAY use MVP fallback.
 *    NEVER grants publication rights.
 */

import type { Subscription } from './types'
import { MVP_QUOTA_DEFAULTS } from './constants'
import { getActiveSubscription, getActiveOverride, getPlanEntitlementValue } from './dal'

// ---------------------------------------------------------------------------
// PUBLICATION ENTITLEMENT — Security/Business Critical
// ---------------------------------------------------------------------------

/**
 * Determines if a subscription grants publication entitlement.
 *
 * TIME-AWARE: Does not rely solely on cron/webhook having transitioned
 * the status. Checks timestamps directly for fail-closed behavior.
 *
 * Rules:
 * - ACTIVE: Eligible, UNLESS current_period_end exists AND is in the past.
 *   (handles free-launch expiry before reconciliation job runs)
 * - PAST_DUE: Eligible (provider still retrying).
 * - GRACE_PERIOD: Eligible ONLY if grace_period_end exists AND is in the future.
 * - INCOMPLETE / EXPIRED: Never eligible.
 */
export function isSubscriptionPublicationEligible(
  subscription:
    | Pick<
        Subscription,
        'status' | 'current_period_end' | 'cancel_at_period_end' | 'grace_period_end'
      >
    | null
    | undefined
): boolean {
  if (!subscription) return false

  const now = new Date()

  switch (subscription.status) {
    case 'ACTIVE': {
      // If current_period_end exists and has passed, fail-closed even if
      // cron/webhook hasn't transitioned status to EXPIRED yet.
      if (subscription.current_period_end) {
        return new Date(subscription.current_period_end) > now
      }
      // No period end set (indefinite free launch) → eligible
      return true
    }

    case 'PAST_DUE':
      // Provider still retrying. Profile stays visible.
      return true

    case 'GRACE_PERIOD': {
      // Grace period MUST exist and be in the future.
      if (!subscription.grace_period_end) return false
      return new Date(subscription.grace_period_end) > now
    }

    case 'INCOMPLETE':
    case 'EXPIRED':
      return false

    default:
      // Fail-closed for unknown states
      return false
  }
}

/**
 * PUBLICATION ENTITLEMENT — Primary public API.
 *
 * Returns true ONLY when the account has:
 *   - A commercially eligible subscription (time-aware), OR
 *   - An active admin override (not expired, not revoked).
 *
 * FAIL-CLOSED: Returns false when no subscription exists,
 * when subscription is INCOMPLETE/EXPIRED, when subscription period
 * has ended (even if status hasn't been reconciled yet), and when
 * no active override exists.
 *
 * NEVER uses MVP fallback. NEVER defaults to true.
 */
export async function hasPublicationEntitlement(
  accountUserId: string
): Promise<boolean> {
  // 1. Check subscription eligibility (time-aware)
  const subscription = await getActiveSubscription(accountUserId)
  if (subscription && isSubscriptionPublicationEligible(subscription)) {
    return true
  }

  // 2. Check admin override
  const override = await getActiveOverride(accountUserId)
  if (override) {
    return true
  }

  // 3. FAIL CLOSED
  return false
}

// ---------------------------------------------------------------------------
// FEATURE / QUOTA ENTITLEMENTS — Operational Limits
// ---------------------------------------------------------------------------

/**
 * Returns plan-specific quota value if subscription exists,
 * or MVP default constant if no subscription.
 *
 * IMPORTANT: This NEVER grants publication rights.
 * MAX_PHOTOS = 10 does NOT mean the profile can be published.
 * Publication eligibility is determined ONLY by hasPublicationEntitlement().
 */
export async function getPlanEntitlement(
  accountUserId: string,
  entitlementCode: string
): Promise<number> {
  const subscription = await getActiveSubscription(accountUserId)
  if (subscription) {
    const configured = await getPlanEntitlementValue(
      subscription.plan_id,
      entitlementCode
    )
    if (configured !== null) return configured
  }

  // MVP fallback for backward compatibility (operational quotas ONLY)
  return MVP_QUOTA_DEFAULTS[entitlementCode] ?? 0
}
