import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  canonicalizeDiditV3,
  verifyDiditWebhookSignature,
} from '@/modules/verification/providers/didit/webhook'

const mocks = vi.hoisted(() => ({
  verifyWebhook: vi.fn(),
  maybeSingle: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: () => ({
        select: () => ({ maybeSingle: mocks.maybeSingle }),
      }),
    }),
  }),
}))

vi.mock('@/modules/verification/providers/factory', () => ({
  getVerificationProvider: () => ({
    providerName: 'didit',
    verifyWebhook: mocks.verifyWebhook,
  }),
}))

vi.mock('@/modules/verification/dal', () => ({
  getVerificationBySessionId: vi.fn(),
}))

import { POST } from '@/app/api/webhooks/didit/route'

describe('Didit webhook route idempotency', () => {
  const secret = 'route_test_webhook_secret'
  const nowMs = 1_774_970_000_000
  const payload = {
    event_id: 'evt_duplicate',
    session_id: 'sess_duplicate',
    status: 'Approved',
    timestamp: Math.floor(nowMs / 1000),
    webhook_type: 'status.updated',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifyWebhook.mockImplementation((rawBody, headers) =>
      verifyDiditWebhookSignature(rawBody, headers, { secret, now: () => nowMs })
    )
  })

  function sign(body: Record<string, unknown>, signingSecret = secret): string {
    return createHmac('sha256', signingSecret)
      .update(canonicalizeDiditV3(body), 'utf8')
      .digest('hex')
  }

  function requestFor(
    body: Record<string, unknown>,
    signature: string,
    timestamp = String(nowMs / 1000),
    testWebhook = false
  ): Request {
    return new Request('https://velvetgirls.club/api/webhooks/didit', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-signature-v2': signature,
        'x-timestamp': timestamp,
        ...(testWebhook ? { 'x-didit-test-webhook': 'true' } : {}),
      },
      body: JSON.stringify(body),
    })
  }

  it('returns 200 for a duplicate test event only after a valid v3 signature', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { code: '23505' } })
    const response = await POST(requestFor(payload, sign(payload), undefined, true) as never)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ message: 'Event already received and processed' })
    expect(mocks.maybeSingle).toHaveBeenCalledOnce()
  })

  it('preserves ledger idempotency for an authenticated Try Webhook without event_id', async () => {
    const tryWebhookPayload = {
      session_id: 'sess_try_duplicate',
      status: 'Approved',
      webhook_type: 'status.updated',
      timestamp: Math.floor(nowMs / 1000),
      created_at: Math.floor(nowMs / 1000) - 1,
      vendor_data: null,
      decision: { id_verifications: [], reviews: [] },
    }
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { code: '23505' } })

    const response = await POST(
      requestFor(tryWebhookPayload, sign(tryWebhookPayload), undefined, true) as never
    )

    expect(response.status).toBe(200)
    expect(mocks.maybeSingle).toHaveBeenCalledOnce()
  })

  it.each([
    ['invalid signature', payload, '0'.repeat(64), String(nowMs / 1000)],
    ['wrong secret', payload, sign(payload, 'wrong_secret'), String(nowMs / 1000)],
    ['stale timestamp', payload, sign(payload), String(nowMs / 1000 - 301)],
    ['malformed timestamp', payload, sign(payload), 'not-an-epoch'],
    ['tampered body', { ...payload, status: 'Declined' }, sign(payload), String(nowMs / 1000)],
  ])('returns 401 for %s', async (_case, body, signature, timestamp) => {
    const response = await POST(requestFor(body, signature, timestamp) as never)
    expect(response.status).toBe(401)
    expect(mocks.maybeSingle).not.toHaveBeenCalled()
  })
})
