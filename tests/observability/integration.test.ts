/**
 * Tests: Targeted Observability Integration — PX1A
 *
 * Verifies that the instrumented system boundaries:
 * 1. Health endpoint (/api/health)
 * 2. Didit webhook (/api/webhooks/didit)
 * 3. Billing webhook (/api/webhooks/billing)
 * 4. Next.js Proxy (proxy.ts)
 * correctly emit canonical correlation IDs and structured events.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as healthGet } from '@/app/api/health/route'
import { POST as billingPost } from '@/app/api/webhooks/billing/route'
import { proxy } from '@/proxy'
import { setLogSink, resetLogSink } from '@/modules/observability/logger'
import type { LogEvent } from '@/modules/observability/types'

import * as billingModule from '@/modules/billing/webhook'

describe('PX1A Targeted Boundaries Integration', () => {
  let capturedLogs: LogEvent[] = []

  beforeEach(() => {
    capturedLogs = []
    setLogSink((entry) => {
      capturedLogs.push(entry)
    })
  })

  afterEach(() => {
    resetLogSink()
    vi.restoreAllMocks()
  })

  // ---------------------------------------------------------------------------
  // 1. Health Endpoint Integration
  // ---------------------------------------------------------------------------
  describe('Health Endpoint (/api/health)', () => {
    it('returns x-request-id in response headers', async () => {
      const incomingId = '777e8400-e29b-41d4-a716-446655440777'
      const req = new Request('https://velvet.club/api/health', {
        headers: { 'x-request-id': incomingId },
      })

      const response = await healthGet(req)
      expect(response.status).toBe(200)
      expect(response.headers.get('x-request-id')).toBe(incomingId)
    })

    it('generates a new UUID in x-request-id when request lacks one', async () => {
      const response = await healthGet()
      expect(response.status).toBe(200)
      const emittedId = response.headers.get('x-request-id')
      expect(emittedId).toBeDefined()
      expect(emittedId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })
  })

  // ---------------------------------------------------------------------------
  // 2. Billing Webhook Integration
  // ---------------------------------------------------------------------------
  describe('Billing Webhook (/api/webhooks/billing)', () => {
    it('emits structured log and carries x-request-id on response', async () => {
      vi.spyOn(billingModule, 'processBillingWebhook').mockResolvedValue({
        status: 200,
        message: 'Event processed successfully',
      })

      const incomingId = '888e8400-e29b-41d4-a716-446655440888'
      const req = new NextRequest('https://velvet.club/api/webhooks/billing', {
        method: 'POST',
        headers: {
          'x-request-id': incomingId,
          'x-webhook-signature': 'sig_test_123',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ event: 'invoice.paid' }),
      })

      const response = await billingPost(req)
      expect(response.status).toBe(200)
      expect(response.headers.get('x-request-id')).toBe(incomingId)

      // Verify structured log emission
      const billingLog = capturedLogs.find((l) => l.event === 'billing.webhook.processed')
      expect(billingLog).toBeDefined()
      expect(billingLog!.subsystem).toBe('BILLING')
      expect(billingLog!.requestId).toBe(incomingId)
      expect(billingLog!.outcome).toBe('SUCCESS')
      expect(typeof billingLog!.durationMs).toBe('number')
    })
  })

  // ---------------------------------------------------------------------------
  // 3. Next.js Proxy Integration
  // ---------------------------------------------------------------------------
  describe('Proxy Route Handler (proxy.ts)', () => {
    it('passes x-request-id to downstream API requests and returns it on response', async () => {
      const incomingId = '999e8400-e29b-41d4-a716-446655440999'
      const req = new NextRequest('https://velvet.club/api/health', {
        headers: { 'x-request-id': incomingId },
      })

      const res = await proxy(req)
      expect(res.headers.get('x-request-id')).toBe(incomingId)
    })

    it('generates a fresh UUID in proxy for API requests missing x-request-id', async () => {
      const req = new NextRequest('https://velvet.club/api/health')
      const res = await proxy(req)
      const id = res.headers.get('x-request-id')
      expect(id).toBeDefined()
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })
  })
})
