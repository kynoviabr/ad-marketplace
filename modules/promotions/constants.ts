/**
 * Promotions domain constants — FASE 08
 */

import type { BoostCampaignStatus, BoostScopeType } from './types'

/**
 * Maximum number of sponsored inventory slots on a single search result page.
 * Configurable MVP threshold (nominal 4 of 20 results).
 */
export const MAX_SPONSORED_SLOTS_PER_PAGE = 4

/**
 * Default marketplace currency.
 */
export const DEFAULT_CURRENCY = 'BRL'

/**
 * Duration of a single rotation time bucket in minutes.
 * Advertisers within the same scope receive deterministic rotation that updates each hour.
 */
export const ROTATION_BUCKET_MINUTES = 60

/**
 * Canonical campaign statuses.
 */
export const BOOST_STATUSES: readonly BoostCampaignStatus[] = [
  'PENDING_PAYMENT',
  'SCHEDULED',
  'ACTIVE',
  'COMPLETED',
  'CANCELED',
  'FAILED',
] as const

/**
 * Scope types.
 */
export const BOOST_SCOPES: readonly BoostScopeType[] = [
  'CITY',
  'MARKETPLACE_LOCATION',
] as const
