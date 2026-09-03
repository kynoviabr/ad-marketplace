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

import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { MVP_QUOTA_DEFAULTS } from './constants'
import { getActiveSubscription, getActiveOverride, getPlanByCode, getPlanEntitlementValue, getPlanEntitlements } from './dal'
import { isSubscriptionPublicationEligible } from './subscription-eligibility'
import type { EffectiveEntitlements, EntitlementValue, Subscription, SubscriptionState } from './types'
export { isSubscriptionPublicationEligible } from './subscription-eligibility'

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
  const subscription = await getActiveSubscription(accountUserId)
  if (subscription && isSubscriptionPublicationEligible(subscription)) {
    const flag = await getPlanEntitlementValue(subscription.plan_id, 'PROFILE_PUBLICATION')
    if (flag === true) return true
  }
  return Boolean(await getActiveOverride(accountUserId))
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
    if (typeof configured === 'number') return configured
  }

  // MVP fallback for backward compatibility (operational quotas ONLY)
  return MVP_QUOTA_DEFAULTS[entitlementCode] ?? 0
}

const boolean = (values: Record<string, EntitlementValue>, code: string) => values[code] === true
const integer = (values: Record<string, EntitlementValue>, code: string, fallback: number) => {
  const value = values[code]
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback
}

export function normalizeSubscriptionState(subscription: Subscription | null): SubscriptionState {
  if (!subscription) return 'FREE'
  if (subscription.subscription_state) return subscription.subscription_state
  if (subscription.status === 'INCOMPLETE') return 'TRIAL'
  if (subscription.status === 'GRACE_PERIOD') return 'PAST_DUE'
  return subscription.status
}

/** Single server-side source of truth for commercial capabilities and quotas. */
export async function resolveEntitlements(accountUserId: string): Promise<EffectiveEntitlements> {
  const admin = createAdminClient()
  const subscription = await getActiveSubscription(accountUserId)
  const plan = subscription
    ? (await admin.from('subscription_plans').select('*').eq('id', subscription.plan_id).maybeSingle()).data
    : await getPlanByCode('FREE')
  const planRows = plan ? await getPlanEntitlements(plan.id) : []
  const values: Record<string, EntitlementValue> = {}
  for (const row of planRows) {
    const value = row.value_bool ?? row.value_int ?? row.value_text
    if (value !== null && value !== undefined) values[row.code] = value
  }

  const now = new Date().toISOString()
  const { data: overrides } = await admin.from('entitlement_overrides')
    .select('entitlement_code, value_int, value_bool, value_text')
    .eq('account_user_id', accountUserId).is('revoked_at', null)
    .or(`expires_at.is.null,expires_at.gt.${now}`).order('created_at', { ascending: true })
  for (const row of overrides ?? []) {
    const value = row.value_bool ?? row.value_int ?? row.value_text
    if (value !== null && value !== undefined) values[row.entitlement_code] = value
  }

  const publicationOverride = await getActiveOverride(accountUserId)
  const commerciallyEligible = Boolean(subscription && isSubscriptionPublicationEligible(subscription))
  const founder = plan?.code === 'FOUNDER' && commerciallyEligible && boolean(values, 'FOUNDER_STATUS')
  return Object.freeze({
    accountUserId, planCode: plan?.code ?? 'FREE', planName: plan?.name ?? 'Gratuito',
    subscriptionState: normalizeSubscriptionState(subscription), founder,
    canPublishProfile: resolvePublicationEntitlement(commerciallyEligible, values.PROFILE_PUBLICATION, Boolean(publicationOverride)),
    maxPhotos: integer(values, 'MAX_PHOTOS', MVP_QUOTA_DEFAULTS.MAX_PHOTOS),
    maxVideos: integer(values, 'MAX_VIDEOS', MVP_QUOTA_DEFAULTS.MAX_VIDEOS),
    maxServiceAreas: integer(values, 'MAX_SERVICE_AREAS', MVP_QUOTA_DEFAULTS.MAX_SERVICE_AREAS),
    reviewsAccess: boolean(values, 'REVIEWS_ACCESS'), premiumFeatures: boolean(values, 'PREMIUM_FEATURES'),
    whatsappAi: boolean(values, 'WHATSAPP_AI'), values: Object.freeze(values),
  })
}

export function resolvePublicationEntitlement(commerciallyEligible: boolean, configured: EntitlementValue | undefined, hasOverride: boolean): boolean {
  return hasOverride || (commerciallyEligible && configured === true)
}
