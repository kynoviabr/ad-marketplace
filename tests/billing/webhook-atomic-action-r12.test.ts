import { beforeEach, describe, expect, it, vi } from 'vitest'
import { processBillingWebhook } from '@/modules/billing/webhook'

const verifyWebhookSignature = vi.fn()
const normalizeWebhookEvent = vi.fn()
const getSubscription = vi.fn()
const provider = {
  providerId: 'MOCK',
  verifyWebhookSignature,
  normalizeWebhookEvent,
  getSubscription,
}
vi.mock('@/modules/billing/providers/registry', () => ({ getPaymentProvider: () => provider }))

const getSubscriptionByProviderRef = vi.fn()
const insertWebhookEvent = vi.fn()
const updateWebhookEventStatus = vi.fn()
vi.mock('@/modules/billing/dal', () => ({
  getSubscriptionByProviderRef: (...args: unknown[]) => getSubscriptionByProviderRef(...args),
  insertWebhookEvent: (...args: unknown[]) => insertWebhookEvent(...args),
  updateWebhookEventStatus: (...args: unknown[]) => updateWebhookEventStatus(...args),
}))

const rpc = vi.fn()
const from = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ rpc, from }) }))

const rawBody = Buffer.from('{"event":"synthetic"}')
const normalizedEvent = {
  isValid: true,
  eventId: 'evt_1',
  eventType: 'subscription.updated',
  providerSubscriptionId: 'provider_sub_1',
  normalizedData: {},
}
const authoritative = {
  providerSubscriptionId: 'provider_sub_1',
  providerCustomerId: 'provider_customer_1',
  stateUpdatedAt: '2026-09-01T00:00:01.000Z',
  status: 'active',
  currentPeriodStart: '2026-09-01T00:00:00.000Z',
  currentPeriodEnd: '2026-10-01T00:00:00.000Z',
  cancelAtPeriodEnd: false,
}

describe('R12 P1-5 billing webhook application boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verifyWebhookSignature.mockResolvedValue(true)
    normalizeWebhookEvent.mockResolvedValue(normalizedEvent)
    getSubscriptionByProviderRef.mockResolvedValue({ id: 'subscription-1' })
    insertWebhookEvent.mockResolvedValue({ id: 'event-db-1', isDuplicate: false, status: 'RECEIVED' })
    getSubscription.mockResolvedValue(authoritative)
    rpc.mockResolvedValue({ data: { outcome: 'APPLIED' }, error: null })
    updateWebhookEventStatus.mockResolvedValue(undefined)
  })

  it('reconciles externally then delegates the complete transition to the atomic RPC', async () => {
    await expect(processBillingWebhook(rawBody, 'valid-signature')).resolves.toEqual({
      status: 200,
      message: 'Processed: APPLIED',
    })
    expect(getSubscription).toHaveBeenCalledWith('provider_sub_1')
    expect(rpc).toHaveBeenCalledWith('finalize_billing_webhook_transition', {
      p_event_id: 'event-db-1',
      p_provider: 'MOCK',
      p_provider_event_id: 'evt_1',
      p_subscription_id: 'subscription-1',
      p_provider_subscription_id: 'provider_sub_1',
      p_provider_customer_id: 'provider_customer_1',
      p_provider_state_updated_at: authoritative.stateUpdatedAt,
      p_new_status: 'ACTIVE',
      p_period_start: authoritative.currentPeriodStart,
      p_period_end: authoritative.currentPeriodEnd,
    })
    expect(from).not.toHaveBeenCalled()
    expect(updateWebhookEventStatus).not.toHaveBeenCalled()
  })

  it('never invokes the atomic RPC for an invalid signature', async () => {
    verifyWebhookSignature.mockResolvedValue(false)
    await expect(processBillingWebhook(rawBody, 'invalid')).resolves.toEqual({ status: 401, message: 'Invalid webhook signature' })
    expect(normalizeWebhookEvent).not.toHaveBeenCalled()
    expect(insertWebhookEvent).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects an invalid event type before ledger or transition work', async () => {
    normalizeWebhookEvent.mockResolvedValue({ ...normalizedEvent, eventType: 'customer.updated' })
    await expect(processBillingWebhook(rawBody, 'valid')).resolves.toEqual({ status: 400, message: 'Invalid webhook event' })
    expect(insertWebhookEvent).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('returns terminal duplicate events idempotently without reconciliation', async () => {
    insertWebhookEvent.mockResolvedValue({ id: 'event-db-1', isDuplicate: true, status: 'PROCESSED' })
    await expect(processBillingWebhook(rawBody, 'valid')).resolves.toMatchObject({ status: 200 })
    expect(getSubscription).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('retries a previously FAILED delivery through the atomic RPC', async () => {
    insertWebhookEvent.mockResolvedValue({ id: 'event-db-1', isDuplicate: true, status: 'FAILED' })
    await expect(processBillingWebhook(rawBody, 'valid')).resolves.toEqual({ status: 200, message: 'Processed: APPLIED' })
    expect(getSubscription).toHaveBeenCalledOnce()
    expect(rpc).toHaveBeenCalledOnce()
  })

  it('records a missing subscription as a safe ignored no-op without calling the RPC', async () => {
    getSubscriptionByProviderRef.mockResolvedValue(null)
    await expect(processBillingWebhook(rawBody, 'valid')).resolves.toEqual({
      status: 200,
      message: 'No matching subscription',
    })
    expect(updateWebhookEventStatus).toHaveBeenCalledWith('event-db-1', 'IGNORED', 'NO_SUBSCRIPTION_MATCH')
    expect(getSubscription).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('handles two concurrent deliveries of the same event with one effective database outcome', async () => {
    insertWebhookEvent
      .mockResolvedValueOnce({ id: 'event-db-1', isDuplicate: false, status: 'RECEIVED' })
      .mockResolvedValueOnce({ id: 'event-db-1', isDuplicate: true, status: 'RECEIVED' })
    rpc
      .mockResolvedValueOnce({ data: { outcome: 'APPLIED' }, error: null })
      .mockResolvedValueOnce({ data: { outcome: 'ALREADY_PROCESSED' }, error: null })
    const results = await Promise.all([
      processBillingWebhook(rawBody, 'valid'),
      processBillingWebhook(rawBody, 'valid'),
    ])
    expect(results).toEqual([
      { status: 200, message: 'Processed: APPLIED' },
      { status: 200, message: 'Processed: ALREADY_PROCESSED' },
    ])
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('delegates concurrent distinct events for one subscription to the row-locking RPC', async () => {
    normalizeWebhookEvent
      .mockResolvedValueOnce({ ...normalizedEvent, eventId: 'evt_older' })
      .mockResolvedValueOnce({ ...normalizedEvent, eventId: 'evt_newer' })
    insertWebhookEvent
      .mockResolvedValueOnce({ id: 'event-db-older', isDuplicate: false, status: 'RECEIVED' })
      .mockResolvedValueOnce({ id: 'event-db-newer', isDuplicate: false, status: 'RECEIVED' })
    rpc
      .mockResolvedValueOnce({ data: { outcome: 'APPLIED' }, error: null })
      .mockResolvedValueOnce({ data: { outcome: 'NO_OP' }, error: null })
    const results = await Promise.all([
      processBillingWebhook(rawBody, 'valid'),
      processBillingWebhook(rawBody, 'valid'),
    ])
    expect(results.every((result) => result.status === 200)).toBe(true)
    expect(rpc).toHaveBeenNthCalledWith(1, 'finalize_billing_webhook_transition', expect.objectContaining({
      p_subscription_id: 'subscription-1',
    }))
    expect(rpc).toHaveBeenNthCalledWith(2, 'finalize_billing_webhook_transition', expect.objectContaining({
      p_subscription_id: 'subscription-1',
    }))
  })

  it('does not transition when provider reconciliation fails or mismatches', async () => {
    getSubscription.mockRejectedValueOnce(new Error('provider unavailable'))
    await expect(processBillingWebhook(rawBody, 'valid')).resolves.toEqual({ status: 500, message: 'Webhook processing failed' })
    expect(rpc).not.toHaveBeenCalled()
    expect(updateWebhookEventStatus).toHaveBeenCalledWith('event-db-1', 'FAILED', 'PROCESSING_FAILED')

    vi.clearAllMocks()
    verifyWebhookSignature.mockResolvedValue(true)
    normalizeWebhookEvent.mockResolvedValue(normalizedEvent)
    getSubscriptionByProviderRef.mockResolvedValue({ id: 'subscription-1' })
    insertWebhookEvent.mockResolvedValue({ id: 'event-db-1', isDuplicate: false, status: 'RECEIVED' })
    getSubscription.mockResolvedValue({ ...authoritative, providerSubscriptionId: 'different' })
    updateWebhookEventStatus.mockResolvedValue(undefined)
    await expect(processBillingWebhook(rawBody, 'valid')).resolves.toMatchObject({ status: 500 })
    expect(rpc).not.toHaveBeenCalled()

    getSubscription.mockResolvedValue({ ...authoritative, providerCustomerId: '' })
    await expect(processBillingWebhook(rawBody, 'valid')).resolves.toMatchObject({ status: 500 })
    expect(rpc).not.toHaveBeenCalled()

    getSubscription.mockResolvedValue({ ...authoritative, stateUpdatedAt: '' })
    await expect(processBillingWebhook(rawBody, 'valid')).resolves.toMatchObject({ status: 500 })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('never reports success when the atomic database transition fails', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'db failure with private detail' } })
    const result = await processBillingWebhook(rawBody, 'valid')
    expect(result).toEqual({ status: 500, message: 'Webhook processing failed' })
    expect(result.message).not.toContain('private detail')
    expect(updateWebhookEventStatus).toHaveBeenCalledWith('event-db-1', 'FAILED', 'PROCESSING_FAILED')
  })

  it.each(['NO_OP', 'IGNORED', 'ALREADY_PROCESSED', 'ALREADY_IGNORED'])('accepts safe atomic outcome %s', async (outcome) => {
    rpc.mockResolvedValue({ data: { outcome }, error: null })
    await expect(processBillingWebhook(rawBody, 'valid')).resolves.toEqual({ status: 200, message: `Processed: ${outcome}` })
  })
})
