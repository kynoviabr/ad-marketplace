import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  SubscriptionPlan,
  PlanPrice,
  PlanEntitlement,
  Subscription,
  BillingOverride,
  BillingWebhookEvent,
} from './types'

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export async function getPlanByCode(code: string): Promise<SubscriptionPlan | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('subscription_plans')
    .select('*')
    .eq('code', code)
    .maybeSingle()
  if (error || !data) return null
  return data as SubscriptionPlan
}

export async function getActivePlans(): Promise<SubscriptionPlan[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  return (data ?? []) as SubscriptionPlan[]
}

// ---------------------------------------------------------------------------
// Prices
// ---------------------------------------------------------------------------

export async function getPriceById(priceId: string): Promise<PlanPrice | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('plan_prices')
    .select('*')
    .eq('id', priceId)
    .maybeSingle()
  if (error || !data) return null
  return data as PlanPrice
}

export async function getActivePricesForPlan(planId: string): Promise<PlanPrice[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('plan_prices')
    .select('*')
    .eq('plan_id', planId)
    .eq('is_active', true)
  return (data ?? []) as PlanPrice[]
}

export async function getPriceByPlanAndCode(
  planId: string,
  priceCode: string
): Promise<PlanPrice | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('plan_prices')
    .select('*')
    .eq('plan_id', planId)
    .eq('price_code', priceCode)
    .maybeSingle()
  if (error || !data) return null
  return data as PlanPrice
}

// ---------------------------------------------------------------------------
// Entitlements
// ---------------------------------------------------------------------------

export async function getPlanEntitlementValue(
  planId: string,
  code: string
): Promise<number | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('plan_entitlements')
    .select('value_int')
    .eq('plan_id', planId)
    .eq('code', code)
    .maybeSingle()
  if (error || !data) return null
  return data.value_int
}

export async function getPlanEntitlements(planId: string): Promise<PlanEntitlement[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('plan_entitlements')
    .select('*')
    .eq('plan_id', planId)
  return (data ?? []) as PlanEntitlement[]
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

/**
 * Gets the active-family subscription for an account.
 * Returns ACTIVE, PAST_DUE, GRACE_PERIOD, or INCOMPLETE.
 * Does NOT return EXPIRED (those are historical).
 */
export async function getActiveSubscription(
  accountUserId: string
): Promise<Subscription | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('subscriptions')
    .select('*')
    .eq('account_user_id', accountUserId)
    .in('status', ['ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'INCOMPLETE'])
    .maybeSingle()
  if (error || !data) return null
  return data as Subscription
}

export async function getSubscriptionById(id: string): Promise<Subscription | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return data as Subscription
}

export async function getSubscriptionByProviderRef(
  provider: string,
  providerSubscriptionId: string
): Promise<Subscription | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('subscriptions')
    .select('*')
    .eq('provider', provider)
    .eq('provider_subscription_id', providerSubscriptionId)
    .maybeSingle()
  if (error || !data) return null
  return data as Subscription
}

/**
 * Gets subscription with joined plan and price info for billing DTO.
 */
export async function getSubscriptionWithPlan(
  accountUserId: string
): Promise<{ subscription: Subscription; plan: SubscriptionPlan; price: PlanPrice } | null> {
  const subscription = await getActiveSubscription(accountUserId)
  if (!subscription) return null

  const admin = createAdminClient()
  const [planRes, priceRes] = await Promise.all([
    admin.from('subscription_plans').select('*').eq('id', subscription.plan_id).single(),
    admin.from('plan_prices').select('*').eq('id', subscription.price_id).single(),
  ])

  if (planRes.error || !planRes.data || priceRes.error || !priceRes.data) return null

  return {
    subscription,
    plan: planRes.data as SubscriptionPlan,
    price: priceRes.data as PlanPrice,
  }
}

// ---------------------------------------------------------------------------
// Overrides
// ---------------------------------------------------------------------------

/**
 * Gets the active billing override for an account.
 * Active = not revoked AND (no expiry OR expiry in the future).
 */
export async function getActiveOverride(
  accountUserId: string
): Promise<BillingOverride | null> {
  const admin = createAdminClient()
  const now = new Date().toISOString()
  const { data, error } = await admin
    .from('billing_overrides')
    .select('*')
    .eq('account_user_id', accountUserId)
    .is('revoked_at', null)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return data as BillingOverride
}

// ---------------------------------------------------------------------------
// Webhook Events
// ---------------------------------------------------------------------------

export async function insertWebhookEvent(
  event: Omit<BillingWebhookEvent, 'id' | 'received_at' | 'processed_at'>
): Promise<{ id: string; isDuplicate: boolean }> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('billing_webhook_events')
    .insert({
      provider: event.provider,
      provider_event_id: event.provider_event_id,
      event_type: event.event_type,
      subscription_id: event.subscription_id,
      processing_status: event.processing_status,
      error_code: event.error_code,
    })
    .select('id')
    .single()

  if (error) {
    // Unique constraint violation = duplicate event
    if (error.code === '23505') {
      return { id: '', isDuplicate: true }
    }
    throw error
  }
  return { id: data.id, isDuplicate: false }
}

export async function updateWebhookEventStatus(
  eventId: string,
  status: 'PROCESSED' | 'IGNORED' | 'FAILED',
  errorCode?: string
): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('billing_webhook_events')
    .update({
      processing_status: status,
      processed_at: new Date().toISOString(),
      error_code: errorCode || null,
    })
    .eq('id', eventId)
}
