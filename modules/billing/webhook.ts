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

const VALID_SUBSCRIPTION_EVENT_TYPES = new Set([
  'subscription.created',
  'subscription.updated',
  'subscription.deleted',
])

/**
 * Normalize provider-specific status to our canonical status.
 */
function normalizeProviderStatus(providerStatus: string): SubscriptionStatus | null {
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
  return mapping[providerStatus.toLowerCase()] ?? null
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
  if (!event.isValid || !event.eventId || !VALID_SUBSCRIPTION_EVENT_TYPES.has(event.eventType)) {
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
  const { id: eventDbId, isDuplicate, status: eventStatus } = await insertWebhookEvent({
    provider: provider.providerId,
    provider_event_id: event.eventId,
    event_type: event.eventType,
    subscription_id: subscriptionId,
    processing_status: 'RECEIVED',
    error_code: null,
  })

  if (isDuplicate && (eventStatus === 'PROCESSED' || eventStatus === 'IGNORED')) {
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
    if (!newStatus || !authoritative.providerCustomerId || !authoritative.stateUpdatedAt ||
        authoritative.providerSubscriptionId !== event.providerSubscriptionId) {
      throw new Error('RECONCILIATION_MISMATCH')
    }

    const admin = createAdminClient()
    const { data, error } = await admin.rpc('finalize_billing_webhook_transition', {
      p_event_id: eventDbId,
      p_provider: provider.providerId,
      p_provider_event_id: event.eventId,
      p_subscription_id: subscriptionId,
      p_provider_subscription_id: event.providerSubscriptionId,
      p_provider_customer_id: authoritative.providerCustomerId,
      p_provider_state_updated_at: authoritative.stateUpdatedAt,
      p_new_status: newStatus,
      p_period_start: authoritative.currentPeriodStart || null,
      p_period_end: authoritative.currentPeriodEnd || null,
    })
    if (error || !data || typeof data !== 'object' || !('outcome' in data)) {
      throw new Error('ATOMIC_TRANSITION_FAILED')
    }
    const outcome = String(data.outcome)
    if (!['APPLIED', 'NO_OP', 'IGNORED', 'ALREADY_PROCESSED', 'ALREADY_IGNORED'].includes(outcome)) {
      throw new Error('INVALID_TRANSITION_RESULT')
    }
    return { status: 200, message: `Processed: ${outcome}` }
  } catch {
    try {
      await updateWebhookEventStatus(eventDbId, 'FAILED', 'PROCESSING_FAILED')
    } catch {
      // The atomic RPC may already have committed before a transport failure.
      // Never overwrite a terminal PROCESSED/IGNORED event.
    }
    return { status: 500, message: 'Webhook processing failed' }
  }
}
