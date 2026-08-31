/**
 * Billing domain types — FASE 07
 *
 * Canonical TypeScript types for subscription plans, prices,
 * subscriptions, entitlements, overrides, and webhook events.
 */

// ---------------------------------------------------------------------------
// Subscription Status (Revised v1.1 — no TRIALING, no CANCELED)
// ---------------------------------------------------------------------------

export type SubscriptionStatus =
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'GRACE_PERIOD'
  | 'INCOMPLETE'
  | 'EXPIRED'

export type BillingInterval = 'MONTH' | 'YEAR'

export type WebhookProcessingStatus = 'RECEIVED' | 'PROCESSED' | 'IGNORED' | 'FAILED'

// ---------------------------------------------------------------------------
// Plan Domain
// ---------------------------------------------------------------------------

export interface SubscriptionPlan {
  id: string
  code: string
  name: string
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface PlanPrice {
  id: string
  plan_id: string
  price_code: string
  currency: string
  amount_minor: number
  billing_interval: BillingInterval
  is_active: boolean
  is_promotional: boolean
  valid_from: string | null
  valid_until: string | null
  created_at: string
  updated_at: string
}

export interface PlanEntitlement {
  id: string
  plan_id: string
  code: string
  value_int: number | null
  value_bool: boolean | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Subscription Domain
// ---------------------------------------------------------------------------

export interface Subscription {
  id: string
  account_user_id: string
  plan_id: string
  price_id: string
  provider: string | null
  provider_customer_id: string | null
  provider_subscription_id: string | null
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
  cancellation_reason: string | null
  grace_period_end: string | null
  created_at: string
  updated_at: string
  granted_by?: string | null
  grant_source?: string | null
}

export interface AdminFounderEntitlementSummary {
  profileId: string
  stageName: string
  publicationActive: boolean
  planCode: string | null
  planName: string | null
  priceCode: string | null
  subscriptionStatus: SubscriptionStatus | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  founderFreePeriod: 'ACTIVE' | 'EXPIRED' | 'NOT_GRANTED'
}

// ---------------------------------------------------------------------------
// Billing Override
// ---------------------------------------------------------------------------

export interface BillingOverride {
  id: string
  account_user_id: string
  reason: string
  granted_by: string
  expires_at: string | null
  revoked_at: string | null
  revoked_by: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Webhook Event Ledger
// ---------------------------------------------------------------------------

export interface BillingWebhookEvent {
  id: string
  provider: string
  provider_event_id: string
  event_type: string
  subscription_id: string | null
  processing_status: WebhookProcessingStatus
  error_code: string | null
  received_at: string
  processed_at: string | null
}

// ---------------------------------------------------------------------------
// DTOs (Client-Safe)
// ---------------------------------------------------------------------------

export interface BillingDTO {
  planName: string
  planCode: string
  status: SubscriptionStatus
  priceDisplay: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  gracePeriodEnd: string | null
  isFreeLaunch: boolean
}

export interface PlanDTO {
  code: string
  name: string
  description: string | null
  prices: PlanPriceDTO[]
}

export interface PlanPriceDTO {
  priceCode: string
  amountMinor: number
  currency: string
  billingInterval: BillingInterval
  isPromotional: boolean
}

// ---------------------------------------------------------------------------
// Action Results
// ---------------------------------------------------------------------------

export type BillingActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
