import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  SubscriptionPlan,
  PlanPrice,
  PlanEntitlement,
  Subscription,
  BillingOverride,
  BillingWebhookEvent,
  AdminFounderEntitlementSummary,
} from './types'
import { isSubscriptionPublicationEligible } from './subscription-eligibility'

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
): Promise<number | boolean | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('plan_entitlements')
    .select('value_int, value_bool')
    .eq('plan_id', planId)
    .eq('code', code)
    .maybeSingle()
  if (error || !data) return null
  return data.value_bool ?? data.value_int
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

/** Safe admin list: excludes provider/customer/payment identifiers. */
export async function getAdminFounderEntitlementSummaries(): Promise<AdminFounderEntitlementSummary[]> {
  const admin = createAdminClient()
  const now = new Date().toISOString()
  const [{ data: profiles }, { data: subscriptions }, { data: publicationPlans }, { data: overrides }] = await Promise.all([
    admin.from('professional_profiles').select('id, account_user_id, stage_name').order('created_at', { ascending: false }),
    admin.from('subscriptions').select(`
      account_user_id,
      status,
      current_period_start,
      current_period_end,
      grace_period_end,
      cancel_at_period_end,
      created_at,
      plan:subscription_plans(code, name),
      price:plan_prices(price_code)
    `).order('created_at', { ascending: false }),
    admin.from('plan_entitlements').select('plan_id').eq('code', 'PROFILE_PUBLICATION').eq('value_bool', true),
    admin.from('billing_overrides').select('account_user_id').is('revoked_at', null).or(`expires_at.is.null,expires_at.gt.${now}`),
  ])

  const publicationPlanIds = new Set((publicationPlans ?? []).map((item) => item.plan_id))
  const planIdsByCode = new Map<string, string>()
  const { data: plans } = await admin.from('subscription_plans').select('id, code')
  for (const plan of plans ?? []) planIdsByCode.set(plan.code, plan.id)

  return (profiles ?? []).map((profile) => {
    const accountSubscriptions = (subscriptions ?? []).filter((item) => item.account_user_id === profile.account_user_id) as any[]
    const current = accountSubscriptions.find((item) => ['ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'INCOMPLETE'].includes(item.status)) ?? accountSubscriptions[0] ?? null
    const plan = Array.isArray(current?.plan) ? current.plan[0] : current?.plan
    const price = Array.isArray(current?.price) ? current.price[0] : current?.price
    const planAllowsPublication = plan?.code ? publicationPlanIds.has(planIdsByCode.get(plan.code) ?? '') : false
    const hasActiveOverride = (overrides ?? []).some((item) => item.account_user_id === profile.account_user_id)
    const publicationActive = hasActiveOverride || Boolean(current && planAllowsPublication && isSubscriptionPublicationEligible(current))
    const founderGrant = accountSubscriptions.find((item) => {
      const itemPlan = Array.isArray(item.plan) ? item.plan[0] : item.plan
      const itemPrice = Array.isArray(item.price) ? item.price[0] : item.price
      return itemPlan?.code === 'FOUNDER' && itemPrice?.price_code === 'LAUNCH_FREE'
    })
    const founderFreePeriod = !founderGrant
      ? 'NOT_GRANTED'
      : isSubscriptionPublicationEligible(founderGrant) ? 'ACTIVE' : 'EXPIRED'

    return {
      profileId: profile.id,
      stageName: profile.stage_name,
      publicationActive,
      planCode: plan?.code ?? null,
      planName: plan?.name ?? null,
      priceCode: price?.price_code ?? null,
      subscriptionStatus: current?.status ?? null,
      currentPeriodStart: current?.current_period_start ?? null,
      currentPeriodEnd: current?.current_period_end ?? null,
      founderFreePeriod,
    }
  })
}

// ---------------------------------------------------------------------------
// Webhook Events
// ---------------------------------------------------------------------------

export async function insertWebhookEvent(
  event: Omit<BillingWebhookEvent, 'id' | 'received_at' | 'processed_at'>
): Promise<{ id: string; isDuplicate: boolean; status: BillingWebhookEvent['processing_status'] }> {
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
      const { data: existing, error: existingError } = await admin
        .from('billing_webhook_events')
        .select('id, processing_status')
        .eq('provider', event.provider)
        .eq('provider_event_id', event.provider_event_id)
        .single()
      if (existingError || !existing) throw existingError ?? new Error('WEBHOOK_EVENT_LOOKUP_FAILED')
      return { id: existing.id, isDuplicate: true, status: existing.processing_status }
    }
    throw error
  }
  return { id: data.id, isDuplicate: false, status: 'RECEIVED' }
}

export async function updateWebhookEventStatus(
  eventId: string,
  status: 'PROCESSED' | 'IGNORED' | 'FAILED',
  errorCode?: string
): Promise<void> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('billing_webhook_events')
    .update({
      processing_status: status,
      processed_at: new Date().toISOString(),
      error_code: errorCode || null,
    })
    .eq('id', eventId)
    .in('processing_status', ['RECEIVED', 'FAILED'])
    .select('id')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('WEBHOOK_EVENT_STATUS_NOT_UPDATED')
}
