import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { MockPaymentProvider } from '@/modules/billing/providers/mock-provider'

const root = process.cwd()
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260905020000_atomic_billing_webhook_transition.sql'),
  'utf8'
)
const webhook = fs.readFileSync(path.join(root, 'modules/billing/webhook.ts'), 'utf8')

describe('R12 P1-5 atomic billing webhook transition contract', () => {
  it('is a fixed-search-path SECURITY DEFINER RPC exposed only to service_role', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.finalize_billing_webhook_transition')
    expect(migration).toContain('SECURITY DEFINER')
    expect(migration).toContain('SET search_path = public, pg_temp')
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon, authenticated/)
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION[\s\S]*TO service_role/)
  })

  it('locks the event before locking the target subscription', () => {
    const eventLock = migration.indexOf('FROM public.billing_webhook_events\n  WHERE id = p_event_id\n  FOR UPDATE')
    const subscriptionLock = migration.indexOf('FROM public.subscriptions\n  WHERE id = p_subscription_id\n  FOR UPDATE')
    expect(eventLock).toBeGreaterThanOrEqual(0)
    expect(subscriptionLock).toBeGreaterThan(eventLock)
  })

  it('binds event, provider and provider subscription identities fail-closed', () => {
    expect(migration).toContain('v_event.provider <> p_provider')
    expect(migration).toContain('v_event.provider_event_id <> p_provider_event_id')
    expect(migration).toContain('v_event.subscription_id IS DISTINCT FROM p_subscription_id')
    expect(migration).toContain('v_subscription.provider IS DISTINCT FROM p_provider')
    expect(migration).toContain('v_subscription.provider_subscription_id IS DISTINCT FROM p_provider_subscription_id')
    expect(migration).toContain('v_subscription.provider_customer_id IS DISTINCT FROM p_provider_customer_id')
  })

  it('allows retries from RECEIVED/FAILED and terminal duplicate no-ops', () => {
    expect(migration).toContain("v_event.processing_status = 'PROCESSED'")
    expect(migration).toContain("jsonb_build_object('outcome', 'ALREADY_PROCESSED')")
    expect(migration).toContain("v_event.processing_status = 'IGNORED'")
    expect(migration).toContain("v_event.processing_status NOT IN ('RECEIVED', 'FAILED')")
  })

  it('preserves the canonical transition allowlist and rejects regressions', () => {
    for (const transition of [
      "v_subscription.status = 'INCOMPLETE' AND p_new_status IN ('ACTIVE', 'EXPIRED')",
      "v_subscription.status = 'ACTIVE' AND p_new_status IN ('PAST_DUE', 'EXPIRED')",
      "v_subscription.status = 'PAST_DUE' AND p_new_status IN ('ACTIVE', 'GRACE_PERIOD')",
      "v_subscription.status = 'GRACE_PERIOD' AND p_new_status IN ('ACTIVE', 'EXPIRED')",
    ]) expect(migration).toContain(transition)
    expect(migration).toContain("THEN 'STALE_EVENT'")
    expect(migration).toContain("ELSE 'INVALID_TRANSITION'")
  })

  it('rejects an older authoritative provider snapshot under the subscription lock', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS provider_state_updated_at TIMESTAMPTZ')
    expect(migration).toContain('p_provider_state_updated_at < v_subscription.provider_state_updated_at')
    expect(migration).toContain("error_code = 'STALE_EVENT'")
    expect(migration).toContain('provider_state_updated_at = p_provider_state_updated_at')
  })

  it('proves exactly one subscription mutation before completing the event', () => {
    const subscriptionUpdate = migration.indexOf('UPDATE public.subscriptions')
    const firstRowProof = migration.indexOf('GET DIAGNOSTICS v_rows = ROW_COUNT', subscriptionUpdate)
    const processedUpdate = migration.indexOf("SET processing_status = 'PROCESSED'", subscriptionUpdate)
    const secondRowProof = migration.indexOf('GET DIAGNOSTICS v_rows = ROW_COUNT', processedUpdate)
    expect(subscriptionUpdate).toBeGreaterThanOrEqual(0)
    expect(firstRowProof).toBeGreaterThan(subscriptionUpdate)
    expect(migration.slice(firstRowProof, processedUpdate)).toContain('SUBSCRIPTION_UPDATE_FAILED')
    expect(processedUpdate).toBeGreaterThan(firstRowProof)
    expect(secondRowProof).toBeGreaterThan(processedUpdate)
    expect(migration.slice(secondRowProof)).toContain('EVENT_COMPLETION_FAILED')
  })

  it('raises on zero-row subscription mutation so event completion rolls back', () => {
    expect(migration).toMatch(/UPDATE public\.subscriptions[\s\S]*GET DIAGNOSTICS v_rows = ROW_COUNT;[\s\S]*IF v_rows <> 1 THEN RAISE EXCEPTION 'SUBSCRIPTION_UPDATE_FAILED/)
    expect(migration.indexOf('SUBSCRIPTION_UPDATE_FAILED')).toBeLessThan(
      migration.indexOf("SET processing_status = 'PROCESSED'")
    )
  })

  it('raises when event completion affects zero rows so the subscription mutation rolls back', () => {
    const completion = migration.indexOf("SET processing_status = 'PROCESSED'")
    expect(completion).toBeGreaterThanOrEqual(0)
    expect(migration.slice(completion)).toMatch(/GET DIAGNOSTICS v_rows = ROW_COUNT;[\s\S]*IF v_rows <> 1 THEN RAISE EXCEPTION 'EVENT_COMPLETION_FAILED/)
  })

  it('makes invalid/stale event completion authoritative without mutating the subscription', () => {
    const invalidGate = migration.indexOf("v_subscription.status <> p_new_status")
    const ignored = migration.indexOf("SET processing_status = 'IGNORED'", invalidGate)
    const subscriptionUpdate = migration.indexOf('UPDATE public.subscriptions')
    expect(ignored).toBeGreaterThan(invalidGate)
    expect(ignored).toBeLessThan(subscriptionUpdate)
    expect(migration.slice(ignored, subscriptionUpdate)).toContain('EVENT_COMPLETION_FAILED')
  })

  it('keeps provider reconciliation outside the SQL transaction', () => {
    expect(migration).not.toMatch(/http|fetch|provider_payload|raw_payload/i)
    expect(webhook.indexOf('provider.getSubscription')).toBeLessThan(webhook.indexOf("rpc('finalize_billing_webhook_transition'"))
  })

  it('removes independent application subscription and PROCESSED writes', () => {
    expect(webhook).not.toContain(".from('subscriptions')")
    expect(webhook).not.toContain("updateWebhookEventStatus(eventDbId, 'PROCESSED'")
    expect(webhook).toContain("rpc('finalize_billing_webhook_transition'")
  })

  it('never persists raw webhook payload or secrets', () => {
    expect(webhook).not.toMatch(/rawBody[\s\S]*insertWebhookEvent\([\s\S]*rawBody/)
    expect(migration).not.toMatch(/payload|secret/i)
  })

  it('reconciles the mock provider subscription back to its authoritative customer', async () => {
    const provider = new MockPaymentProvider()
    const checkout = await provider.createCheckoutSession({
      providerCustomerId: 'mock_customer_1',
      planCode: 'PRO',
      priceAmountMinor: 4900,
      currency: 'BRL',
      billingInterval: 'MONTH',
      successUrl: 'https://velvetgirls.club/dashboard/billing?success=true',
      cancelUrl: 'https://velvetgirls.club/dashboard/billing?canceled=true',
    })
    expect(checkout.providerSubscriptionId).toBeTruthy()
    const reconciled = await provider.getSubscription(checkout.providerSubscriptionId!)
    expect(reconciled.providerCustomerId).toBe('mock_customer_1')
    expect(reconciled.providerSubscriptionId).toBe(checkout.providerSubscriptionId)
  })
})
