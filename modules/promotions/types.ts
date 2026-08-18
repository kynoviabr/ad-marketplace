/**
 * Promotions / Boosts domain types — FASE 08
 *
 * Canonical TypeScript types for boost products, prices,
 * profile boost campaigns, sponsored placement candidates, and DTOs.
 */

export type BoostScopeType = 'CITY' | 'MARKETPLACE_LOCATION'

export type BoostCampaignStatus =
  | 'PENDING_PAYMENT'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELED'
  | 'FAILED'

// ---------------------------------------------------------------------------
// Product & Price Catalog
// ---------------------------------------------------------------------------

export interface BoostProduct {
  id: string
  code: string
  name: string
  description: string | null
  scope_type: BoostScopeType
  duration_hours: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface BoostPrice {
  id: string
  boost_product_id: string
  price_code: string
  currency: string
  amount_minor: number
  is_active: boolean
  is_promotional: boolean
  valid_from: string | null
  valid_until: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Campaign Domain Model
// ---------------------------------------------------------------------------

export interface ProfileBoost {
  id: string
  profile_id: string
  boost_product_id: string
  boost_price_id: string
  scope_type: BoostScopeType
  city_id: string
  location_id: string | null
  starts_at: string
  ends_at: string
  status: BoostCampaignStatus
  provider: string | null
  provider_payment_id: string | null
  canceled_at: string | null
  canceled_by: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// DTOs (Client-Safe)
// ---------------------------------------------------------------------------

export interface BoostPriceDTO {
  id: string
  priceCode: string
  amountMinor: number
  currency: string
  isPromotional: boolean
}

export interface BoostProductDTO {
  id: string
  code: string
  name: string
  description: string | null
  scopeType: BoostScopeType
  durationHours: number
  prices: BoostPriceDTO[]
}

export interface ProfileBoostDTO {
  id: string
  profileId: string
  productName: string
  productCode: string
  scopeType: BoostScopeType
  cityName: string
  locationName: string | null
  startsAt: string
  endsAt: string
  status: BoostCampaignStatus
  amountMinor: number
  currency: string
  createdAt: string
}

export interface SponsoredPlacementCandidate {
  profileId: string
  campaignId: string
  scopeType: BoostScopeType
  cityId: string
  locationId: string | null
  startsAt: string
  endsAt: string
}

// ---------------------------------------------------------------------------
// Action Results
// ---------------------------------------------------------------------------

export type PromotionActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
