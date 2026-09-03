/**
 * Billing webhook processing — FASE 07
 *
 * Handles incoming provider webhook events with:
 * - Idempotency (UNIQUE provider + event_id)
 * - Zero-trust reconciliation (server-to-server verification)
 * - Monotonic state transitions (stale-event protection)
 * - Minimal data storage (no raw payloads)
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { getPaymentProvider } from './providers/registry'
import {
  getSubscriptionByProviderRef,
  insertWebhookEvent,
  updateWebhookEventStatus,
} from './dal'
import type { SubscriptionStatus } from './types'
import { GRACE_PERIOD_DAYS } from './constants'

/**
 * Monotonic state ordering for stale-event protection.
 * Higher ordinal = further in lifecycle. Used to detect regressions.
 */
const STATE_ORDINAL: Record<SubscriptionStatus, number> = {
  INCOMPLETE: 0,
  ACTIVE: 1,
  PAST_DUE: 2,
  GRACE_PERIOD: 3,
  EXPIRED: 4,
}

/** Valid state transitions. */
const VALID_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  INCOMPLETE: ['ACTIVE', 'EXPIRED'],
  ACTIVE: ['PAST_DUE', 'EXPIRED'],
  PAST_DUE: ['ACTIVE', 'GRACE_PERIOD'],
  GRACE_PERIOD: ['ACTIVE', 'EXPIRED'],
  EXPIRED: [], // Terminal — new subscription row for re-subscribe
}

/**
 * Normalize provider-specific status to our canonical status.
 */
function normalizeProviderStatus(providerStatus: string): SubscriptionStatus {
  const mapping: Record<string, SubscriptionStatus> = {
    active: 'ACTIVE',
    paid: 'ACTIVE',
    past_due: 'PAST_DUE',
    unpaid: 'PAST_DUE',
    incomplete: 'INCOMPLETE',
    incomplete_expired: 'EXPIRED',
    canceled: 'EXPIRED',
    expired: 'EXPIRED',
  }
  return mapping[providerStatus.toLowerCase()] || 'EXPIRED'
}

/**
 * Validates whether a state transition is allowed.
 */
function isValidTransition(
  currentStatus: SubscriptionStatus,
  newStatus: SubscriptionStatus
): boolean {
  if (currentStatus === newStatus) return true // No-op is valid
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false
}

/**
 * Checks if a new state would be a regression (stale event).
 */
function isStaleEvent(
  currentStatus: SubscriptionStatus,
  newStatus: SubscriptionStatus
): boolean {
  return STATE_ORDINAL[newStatus] < STATE_ORDINAL[currentStatus]
}

/**
 * Apply a subscription state transition with validation.
 */
export async function applySubscriptionTransition(
  subscriptionId: string,
  newStatus: SubscriptionStatus,
  periodStart?: string,
  periodEnd?: string
): Promise<{ applied: boolean; reason?: string }> {
  const admin = createAdminClient()

  const { data: sub, error } = await admin
    .from('subscriptions')
    .select('status')
    .eq('id', subscriptionId)
    .single()

  if (error || !sub) {
    return { applied: false, reason: 'SUBSCRIPTION_NOT_FOUND' }
  }

  const currentStatus = sub.status as SubscriptionStatus

  if (isStaleEvent(currentStatus, newStatus)) {
    return { applied: false, reason: 'STALE_EVENT' }
  }

  if (!isValidTransition(currentStatus, newStatus)) {
    return { applied: false, reason: 'INVALID_TRANSITION' }
  }

  if (currentStatus === newStatus && !periodEnd) {
    return { applied: true, reason: 'NO_OP' }
  }

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    subscription_state: newStatus === 'INCOMPLETE' ? 'TRIAL' : newStatus === 'GRACE_PERIOD' ? 'PAST_DUE' : newStatus,
    updated_at: new Date().toISOString(),
  }

  if (periodStart) updatePayload.current_period_start = periodStart
  if (periodEnd) updatePayload.current_period_end = periodEnd

  if (newStatus === 'GRACE_PERIOD') {
    const graceEnd = new Date()
    graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS)
    updatePayload.grace_period_end = graceEnd.toISOString()
  }

  if (newStatus === 'ACTIVE') {
    updatePayload.grace_period_end = null
  }

  await admin
    .from('subscriptions')
    .update(updatePayload)
    .eq('id', subscriptionId)

  return { applied: true }
}

/**
 * Process an incoming billing webhook.
 *
 * 1. Verify signature
 * 2. Log to event ledger (idempotency)
 * 3. Zero-trust: fetch subscription from provider
 * 4. Apply monotonic state transition
 */
export async function processBillingWebhook(
  rawBody: Buffer,
  signature: string
): Promise<{ status: number; message: string }> {
  const provider = getPaymentProvider()

  // 1. Verify signature
  const validSig = await provider.verifyWebhookSignature(rawBody, signature)
  if (!validSig) {
    return { status: 401, message: 'Invalid webhook signature' }
  }

  // 2. Normalize event
  const event = await provider.normalizeWebhookEvent(rawBody)
  if (!event.isValid || !event.eventId) {
    return { status: 400, message: 'Invalid webhook event' }
  }

  // 3. Find subscription
  let subscriptionId: string | null = null
  if (event.providerSubscriptionId) {
    const sub = await getSubscriptionByProviderRef(
      provider.providerId,
      event.providerSubscriptionId
    )
    subscriptionId = sub?.id ?? null
  }

  // 4. Log to ledger (idempotency check)
  const { id: eventDbId, isDuplicate } = await insertWebhookEvent({
    provider: provider.providerId,
    provider_event_id: event.eventId,
    event_type: event.eventType,
    subscription_id: subscriptionId,
    processing_status: 'RECEIVED',
    error_code: null,
  })

  if (isDuplicate) {
    return { status: 200, message: 'Duplicate event — already processed' }
  }

  // 5. Zero-trust reconciliation
  if (!subscriptionId || !event.providerSubscriptionId) {
    await updateWebhookEventStatus(eventDbId, 'IGNORED', 'NO_SUBSCRIPTION_MATCH')
    return { status: 200, message: 'No matching subscription' }
  }

  try {
    const authoritative = await provider.getSubscription(event.providerSubscriptionId)
    const newStatus = normalizeProviderStatus(authoritative.status)

    const result = await applySubscriptionTransition(
      subscriptionId,
      newStatus,
      authoritative.currentPeriodStart,
      authoritative.currentPeriodEnd
    )

    if (result.applied) {
      await updateWebhookEventStatus(eventDbId, 'PROCESSED')
    } else {
      await updateWebhookEventStatus(eventDbId, 'IGNORED', result.reason)
    }

    return { status: 200, message: `Processed: ${result.reason || 'OK'}` }
  } catch (err) {
    const errorCode = err instanceof Error ? err.message.slice(0, 100) : 'UNKNOWN'
    await updateWebhookEventStatus(eventDbId, 'FAILED', errorCode)
    return { status: 500, message: 'Webhook processing failed' }
  }
}
