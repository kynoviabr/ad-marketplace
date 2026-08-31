/**
 * Module: billing — FASE 07
 *
 * Monetization, Subscriptions & Payment Gateway Foundation.
 *
 * Two distinct entitlement concepts:
 * - hasPublicationEntitlement(): Security-critical. FAIL-CLOSED. No fallback.
 * - getPlanEntitlement(): Operational quotas. MVP fallback for backward compat.
 *
 * Provider: UNDECIDED. MockPaymentProvider only.
 * Real integration requires written underwriting approval (EXTERNAL BLOCKER).
 *
 * @see docs/09_BILLING.md
 */

export {
  hasPublicationEntitlement,
  isSubscriptionPublicationEligible,
  getPlanEntitlement,
} from './entitlements'

export type {
  SubscriptionStatus,
  BillingInterval,
  SubscriptionPlan,
  PlanPrice,
  PlanEntitlement,
  Subscription,
  BillingOverride,
  BillingWebhookEvent,
  BillingDTO,
  PlanDTO,
  PlanPriceDTO,
  BillingActionResult,
  AdminFounderEntitlementSummary,
} from './types'

export {
  DEFAULT_CURRENCY,
  GRACE_PERIOD_DAYS,
  MVP_QUOTA_DEFAULTS,
  BILLING_INTERVALS,
  PUBLICATION_ELIGIBLE_STATUSES,
  SUBSCRIPTION_STATUSES,
} from './constants'
