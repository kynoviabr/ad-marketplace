/**
 * Billing constants — FASE 07
 *
 * Centralized configuration for billing domain.
 * All numeric/string literals used by billing are defined here.
 */

/** Default currency for all billing operations. ISO 4217. */
export const DEFAULT_CURRENCY = 'BRL' as const

/** Supported billing intervals. */
export const BILLING_INTERVALS = ['MONTH', 'YEAR'] as const

/**
 * Grace period in days after provider payment retries are exhausted.
 * Profile remains visible during this window.
 * HUMAN DECISION: Approved at 7 days.
 */
export const GRACE_PERIOD_DAYS = 7

/**
 * MVP quota defaults for backward compatibility with FASE 04–05.
 *
 * These provide operational limits (MAX_PHOTOS, MAX_SERVICE_AREAS)
 * when no subscription exists or entitlement is not configured.
 *
 * IMPORTANT: These NEVER grant publication rights.
 * Publication eligibility is determined ONLY by hasPublicationEntitlement().
 */
export const MVP_QUOTA_DEFAULTS: Record<string, number> = {
  MAX_PHOTOS: 10,
  MAX_VIDEOS: 3,
  MAX_SERVICE_AREAS: 5,
} as const

export const ENTITLEMENT_CODES = {
  PROFILE_PUBLICATION: 'PROFILE_PUBLICATION',
  MAX_PHOTOS: 'MAX_PHOTOS',
  MAX_VIDEOS: 'MAX_VIDEOS',
  MAX_SERVICE_AREAS: 'MAX_SERVICE_AREAS',
  REVIEWS_ACCESS: 'REVIEWS_ACCESS',
  PREMIUM_FEATURES: 'PREMIUM_FEATURES',
  WHATSAPP_AI: 'WHATSAPP_AI',
  FOUNDER_STATUS: 'FOUNDER_STATUS',
} as const

/**
 * Subscription statuses that grant publication entitlement.
 * Time-aware checks are still required — see isSubscriptionPublicationEligible().
 */
export const PUBLICATION_ELIGIBLE_STATUSES = [
  'ACTIVE',
  'PAST_DUE',
  'GRACE_PERIOD',
] as const

/** Valid subscription status values. */
export const SUBSCRIPTION_STATUSES = [
  'ACTIVE',
  'PAST_DUE',
  'GRACE_PERIOD',
  'INCOMPLETE',
  'EXPIRED',
] as const
