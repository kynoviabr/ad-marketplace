import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  canonicalizeDiditV3,
  verifyDiditWebhookSignature,
} from '@/modules/verification/providers/didit/webhook'

const mocks = vi.hoisted(() => ({
  verifyWebhook: vi.fn(),
  fetchAuthoritativeDecision: vi.fn(),
  getVerificationBySessionId: vi.fn(),
  dbInsert: vi.fn(),
  dbSelect: vi.fn(),
  dbUpdate: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const chain: any = {
        insert: (payload: any) => {
          mocks.dbInsert(table, payload)
          return {
            select: () => ({
              maybeSingle: () => mocks.dbInsert(table, 'RETURNING_MAYBE_SINGLE'),
            }),
          }
        },
        select: (fields: string) => {
          mocks.dbSelect(table, fields)
          return chain
        },
        update: (payload: any) => {
          mocks.dbUpdate(table, payload)
          return chain
        },
        eq: (col: string, val: any) => chain,
        lt: (col: string, val: any) => chain,
        maybeSingle: () => mocks.dbSelect(table, 'MAYBE_SINGLE'),
      }
      return chain
    },
  }),
}))

vi.mock('@/modules/verification/providers/factory', () => ({
  getVerificationProvider: () => ({
    providerName: 'didit',
    verifyWebhook: mocks.verifyWebhook,
    fetchAuthoritativeDecision: mocks.fetchAuthoritativeDecision,
  }),
}))

vi.mock('@/modules/verification/dal', () => ({
  getVerificationBySessionId: (...args: any[]) => mocks.getVerificationBySessionId(...args),
}))

import { POST } from '@/app/api/webhooks/didit/route'

describe('Didit webhook retry reconciliation (Pre-PX1 Critical Guardrail)', () => {
  const secret = 'didit_retry_test_secret'
  const nowMs = 1_774_970_000_000
  const eventId = 'evt_retry_123'
  const sessionId = 'sess_retry_456'

  const validPayload = {
    event_id: eventId,
    session_id: sessionId,
    status: 'Approved',
    timestamp: Math.floor(nowMs / 1000),
    webhook_type: 'status.updated',
  }

  function sign(body: Record<string, unknown>, signingSecret = secret): string {
    return createHmac('sha256', signingSecret)
      .update(canonicalizeDiditV3(body), 'utf8')
      .digest('hex')
  }

  function buildRequest(body: Record<string, unknown>, signature = sign(body)): Request {
    return new Request('https://velvetgirls.club/api/webhooks/didit', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-signature-v2': signature,
        'x-timestamp': String(Math.floor(nowMs / 1000)),
      },
      body: JSON.stringify(body),
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifyWebhook.mockImplementation((rawBody, headers) =>
      verifyDiditWebhookSignature(rawBody, headers, { secret, now: () => nowMs })
    )
  })

  // CASE A — NEW EVENT SUCCESS
  it('CASE A: processes a new event from RECEIVED to PROCESSED', async () => {
    mocks.dbInsert.mockImplementation((table: string, action: any) => {
      if (action === 'RETURNING_MAYBE_SINGLE') {
        return Promise.resolve({ data: { id: 'ledger_new_1' }, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    mocks.getVerificationBySessionId.mockResolvedValue({
      id: 'verif_1',
      account_user_id: 'acc_1',
      status: 'PENDING',
    })

    mocks.fetchAuthoritativeDecision.mockResolvedValue({
      providerStatus: 'Approved',
      normalizedStatus: 'VERIFIED',
      identityVerified: true,
      ageVerified: true,
      cpfVerified: true,
      verifiedCountry: 'BRA',
      verifiedAt: new Date(nowMs).toISOString(),
    })

    const response = await POST(buildRequest(validPayload) as never)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toEqual({ success: true, status: 'VERIFIED' })

    expect(mocks.fetchAuthoritativeDecision).toHaveBeenCalledWith(sessionId)
    expect(mocks.dbUpdate).toHaveBeenCalledWith(
      'verification_webhook_events',
      expect.objectContaining({ processing_status: 'PROCESSED' })
    )
  })

  // CASE B — PROCESSED DUPLICATE
  it('CASE B: duplicate event with PROCESSED status returns 200 without reprocessing', async () => {
    // Simulate unique constraint violation on insert
    mocks.dbInsert.mockImplementation((table: string, action: any) => {
      if (action === 'RETURNING_MAYBE_SINGLE') {
        return Promise.resolve({ data: null, error: { code: '23505' } })
      }
      return Promise.resolve({ data: null, error: null })
    })

    // Fetch existing ledger returns PROCESSED
    mocks.dbSelect.mockImplementation((table: string, action: any) => {
      if (action === 'MAYBE_SINGLE') {
        return Promise.resolve({
          data: { id: 'ledger_processed_1', processing_status: 'PROCESSED', provider_session_id: sessionId },
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const response = await POST(buildRequest(validPayload) as never)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toEqual({ message: 'Event already received and processed' })

    // No authoritative fetch, no verification mutation
    expect(mocks.fetchAuthoritativeDecision).not.toHaveBeenCalled()
    expect(mocks.getVerificationBySessionId).not.toHaveBeenCalled()
  })

  // CASE C — IGNORED DUPLICATE
  it('CASE C: duplicate event with IGNORED status returns 200 without replay', async () => {
    mocks.dbInsert.mockImplementation((table: string, action: any) => {
      if (action === 'RETURNING_MAYBE_SINGLE') {
        return Promise.resolve({ data: null, error: { code: '23505' } })
      }
      return Promise.resolve({ data: null, error: null })
    })

    mocks.dbSelect.mockImplementation((table: string, action: any) => {
      if (action === 'MAYBE_SINGLE') {
        return Promise.resolve({
          data: { id: 'ledger_ignored_1', processing_status: 'IGNORED', provider_session_id: sessionId },
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const response = await POST(buildRequest(validPayload) as never)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toEqual({ message: 'Event previously ignored' })

    expect(mocks.fetchAuthoritativeDecision).not.toHaveBeenCalled()
  })

  // CASE D — FAILED RETRY SUCCESS (Principal regression test)
  it('CASE D: provider retry for a FAILED event re-executes authoritative processing and succeeds', async () => {
    // 1. Insert hits 23505 unique violation
    mocks.dbInsert.mockImplementation((table: string, action: any) => {
      if (action === 'RETURNING_MAYBE_SINGLE') {
        return Promise.resolve({ data: null, error: { code: '23505' } })
      }
      return Promise.resolve({ data: null, error: null })
    })

    // 2. Fetch existing ledger finds FAILED status
    mocks.dbSelect.mockImplementation((table: string, action: any) => {
      if (action === 'MAYBE_SINGLE') {
        return Promise.resolve({
          data: { id: 'ledger_failed_1', processing_status: 'FAILED', provider_session_id: sessionId },
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    mocks.getVerificationBySessionId.mockResolvedValue({
      id: 'verif_retry_1',
      account_user_id: 'acc_retry_1',
      status: 'PENDING',
    })

    mocks.fetchAuthoritativeDecision.mockResolvedValue({
      providerStatus: 'Approved',
      normalizedStatus: 'VERIFIED',
      identityVerified: true,
      ageVerified: true,
      cpfVerified: true,
      verifiedCountry: 'BRA',
      verifiedAt: new Date(nowMs).toISOString(),
    })

    const response = await POST(buildRequest(validPayload) as never)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toEqual({ success: true, status: 'VERIFIED' })

    // Authoritative processing WAS re-executed
    expect(mocks.fetchAuthoritativeDecision).toHaveBeenCalledWith(sessionId)

    // Ledger was updated to PROCESSED
    expect(mocks.dbUpdate).toHaveBeenCalledWith(
      'verification_webhook_events',
      expect.objectContaining({ processing_status: 'PROCESSED', error_message: null })
    )

    // Verification record was updated
    expect(mocks.dbUpdate).toHaveBeenCalledWith(
      'identity_verifications',
      expect.objectContaining({ status: 'VERIFIED', identity_verified: true, age_verified: true })
    )

    // Account step was advanced
    expect(mocks.dbUpdate).toHaveBeenCalledWith(
      'account_users',
      expect.objectContaining({ onboarding_step: 5 })
    )
  })

  // CASE E — FAILED RETRY FAILS AGAIN
  it('CASE E: provider retry for a FAILED event updates ledger to FAILED again on error and returns 500', async () => {
    mocks.dbInsert.mockImplementation((table: string, action: any) => {
      if (action === 'RETURNING_MAYBE_SINGLE') {
        return Promise.resolve({ data: null, error: { code: '23505' } })
      }
      return Promise.resolve({ data: null, error: null })
    })

    mocks.dbSelect.mockImplementation((table: string, action: any) => {
      if (action === 'MAYBE_SINGLE') {
        return Promise.resolve({
          data: { id: 'ledger_failed_2', processing_status: 'FAILED', provider_session_id: sessionId },
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    mocks.getVerificationBySessionId.mockResolvedValue({
      id: 'verif_retry_2',
      account_user_id: 'acc_retry_2',
      status: 'PENDING',
    })

    // Downstream decision retrieval fails (e.g. Didit API 503)
    mocks.fetchAuthoritativeDecision.mockRejectedValue(new Error('Didit API upstream unavailable'))

    const response = await POST(buildRequest(validPayload) as never)

    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json).toEqual({ error: 'Webhook processing error' })

    // Ledger remains/re-enters FAILED with updated error message
    expect(mocks.dbUpdate).toHaveBeenCalledWith(
      'verification_webhook_events',
      expect.objectContaining({
        processing_status: 'FAILED',
        error_message: 'Didit API upstream unavailable',
      })
    )
  })

  // CASE F — RECEIVED RECOVERY
  it('CASE F: recovering an interrupted RECEIVED event reprocesses safely without duplicate side effects', async () => {
    mocks.dbInsert.mockImplementation((table: string, action: any) => {
      if (action === 'RETURNING_MAYBE_SINGLE') {
        return Promise.resolve({ data: null, error: { code: '23505' } })
      }
      return Promise.resolve({ data: null, error: null })
    })

    mocks.dbSelect.mockImplementation((table: string, action: any) => {
      if (action === 'MAYBE_SINGLE') {
        return Promise.resolve({
          data: { id: 'ledger_received_1', processing_status: 'RECEIVED', provider_session_id: sessionId },
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    mocks.getVerificationBySessionId.mockResolvedValue({
      id: 'verif_recov_1',
      account_user_id: 'acc_recov_1',
      status: 'PENDING',
    })

    mocks.fetchAuthoritativeDecision.mockResolvedValue({
      providerStatus: 'Approved',
      normalizedStatus: 'VERIFIED',
      identityVerified: true,
      ageVerified: true,
      cpfVerified: true,
      verifiedCountry: 'BRA',
      verifiedAt: new Date(nowMs).toISOString(),
    })

    const response = await POST(buildRequest(validPayload) as never)

    expect(response.status).toBe(200)
    expect(mocks.fetchAuthoritativeDecision).toHaveBeenCalledWith(sessionId)
    expect(mocks.dbUpdate).toHaveBeenCalledWith(
      'verification_webhook_events',
      expect.objectContaining({ processing_status: 'PROCESSED' })
    )
  })

  // CASE G — INVALID SIGNATURE RETRY
  it('CASE G: invalid signature is rejected with 401 even if eventId already exists in DB', async () => {
    const invalidSigRequest = buildRequest(validPayload, '0'.repeat(64))

    const response = await POST(invalidSigRequest as never)

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json).toEqual({ error: 'Invalid or missing signature' })

    // Database is NEVER consulted when signature check fails
    expect(mocks.dbInsert).not.toHaveBeenCalled()
    expect(mocks.dbSelect).not.toHaveBeenCalled()
  })

  // CASE H — DIFFERENT EVENT
  it('CASE H: a different event ID is processed independently through the normal path', async () => {
    const differentPayload = {
      event_id: 'evt_different_999',
      session_id: 'sess_different_888',
      status: 'Declined',
      timestamp: Math.floor(nowMs / 1000),
      webhook_type: 'status.updated',
    }

    mocks.dbInsert.mockImplementation((table: string, action: any) => {
      if (action === 'RETURNING_MAYBE_SINGLE') {
        return Promise.resolve({ data: { id: 'ledger_different_1' }, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    mocks.getVerificationBySessionId.mockResolvedValue({
      id: 'verif_diff_1',
      account_user_id: 'acc_diff_1',
      status: 'PENDING',
    })

    mocks.fetchAuthoritativeDecision.mockResolvedValue({
      providerStatus: 'Declined',
      normalizedStatus: 'REJECTED',
      identityVerified: false,
      ageVerified: false,
      cpfVerified: false,
      verifiedCountry: 'BRA',
      verifiedAt: new Date(nowMs).toISOString(),
    })

    const response = await POST(buildRequest(differentPayload) as never)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toEqual({ success: true, status: 'REJECTED' })

    expect(mocks.fetchAuthoritativeDecision).toHaveBeenCalledWith('sess_different_888')
    expect(mocks.dbUpdate).toHaveBeenCalledWith(
      'identity_verifications',
      expect.objectContaining({ status: 'REJECTED', identity_verified: false })
    )
  })
})
