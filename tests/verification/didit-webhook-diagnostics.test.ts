import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import {
  canonicalizeDiditV3,
  type DiditAuthDiagnostic,
  verifyDiditWebhookSignature,
} from '@/modules/verification/providers/didit/webhook'

describe('Didit webhook safe authentication diagnostics', () => {
  const secret = 'diagnostic_test_secret_only'
  const nowMs = 1_774_970_000_000
  const timestamp = String(nowMs / 1000)
  const payload = {
    event_id: 'event_fixture',
    session_id: 'session_fixture',
    status: 'Approved',
    timestamp: Number(timestamp),
    webhook_type: 'status.updated',
    decision: { score: 92.0, warnings: [] },
  }

  function sign(value: unknown, signingSecret = secret): string {
    return createHmac('sha256', signingSecret)
      .update(canonicalizeDiditV3(value), 'utf8')
      .digest('hex')
  }

  function verify(
    rawBody: Buffer,
    headers: Record<string, string>,
    configuredSecret = secret
  ): { result: ReturnType<typeof verifyDiditWebhookSignature>; diagnostic: DiditAuthDiagnostic } {
    const logger = vi.fn<(diagnostic: DiditAuthDiagnostic) => void>()
    const result = verifyDiditWebhookSignature(rawBody, headers, {
      secret: configuredSecret,
      now: () => nowMs,
      logger,
    })
    expect(logger).toHaveBeenCalledOnce()
    return { result, diagnostic: logger.mock.calls[0][0] }
  }

  const body = () => Buffer.from(JSON.stringify(payload), 'utf8')
  const validHeaders = () => ({
    'x-signature-v2': sign(payload),
    'x-timestamp': timestamp,
  })

  it('reports DIDIT_AUTH_MISSING_V2_SIGNATURE', () => {
    const { diagnostic } = verify(body(), { 'x-timestamp': timestamp })
    expect(diagnostic.category).toBe('DIDIT_AUTH_MISSING_V2_SIGNATURE')
    expect(diagnostic.signatureV2Exists).toBe(false)
  })

  it('reports DIDIT_AUTH_INVALID_V2_FORMAT', () => {
    const { diagnostic } = verify(body(), {
      'x-signature-v2': 'z'.repeat(64),
      'x-timestamp': timestamp,
    })
    expect(diagnostic.category).toBe('DIDIT_AUTH_INVALID_V2_FORMAT')
  })

  it('reports DIDIT_AUTH_MISSING_TIMESTAMP', () => {
    const { diagnostic } = verify(body(), { 'x-signature-v2': sign(payload) })
    expect(diagnostic.category).toBe('DIDIT_AUTH_MISSING_TIMESTAMP')
    expect(diagnostic.timestampExists).toBe(false)
  })

  it('reports DIDIT_AUTH_INVALID_TIMESTAMP_FORMAT', () => {
    const { diagnostic } = verify(body(), {
      'x-signature-v2': sign(payload),
      'x-timestamp': 'not-an-epoch',
    })
    expect(diagnostic.category).toBe('DIDIT_AUTH_INVALID_TIMESTAMP_FORMAT')
  })

  it('reports DIDIT_AUTH_STALE_TIMESTAMP', () => {
    const { diagnostic } = verify(body(), {
      'x-signature-v2': sign(payload),
      'x-timestamp': String(Number(timestamp) - 301),
    })
    expect(diagnostic.category).toBe('DIDIT_AUTH_STALE_TIMESTAMP')
    expect(diagnostic.timestampDeltaSeconds).toBe(301)
  })

  it('reports DIDIT_AUTH_SIGNATURE_LENGTH_MISMATCH', () => {
    const { diagnostic } = verify(body(), {
      'x-signature-v2': 'a'.repeat(63),
      'x-timestamp': timestamp,
    })
    expect(diagnostic.category).toBe('DIDIT_AUTH_SIGNATURE_LENGTH_MISMATCH')
    expect(diagnostic.receivedSignatureLength).toBe(63)
    expect(diagnostic.calculatedSignatureLength).toBe(64)
    expect(diagnostic.signatureLengthsMatch).toBe(false)
  })

  it('reports DIDIT_AUTH_HMAC_MISMATCH for a wrong secret', () => {
    const { diagnostic } = verify(body(), validHeaders(), 'different_secret')
    expect(diagnostic.category).toBe('DIDIT_AUTH_HMAC_MISMATCH')
    expect(diagnostic.timingSafeComparisonMatched).toBe(false)
  })

  it('reports DIDIT_AUTH_HMAC_MISMATCH for a tampered body', () => {
    const tampered = Buffer.from(JSON.stringify({ ...payload, status: 'Declined' }), 'utf8')
    const { diagnostic } = verify(tampered, validHeaders())
    expect(diagnostic.category).toBe('DIDIT_AUTH_HMAC_MISMATCH')
  })

  it('reports DIDIT_AUTH_INVALID_JSON', () => {
    const { diagnostic } = verify(Buffer.from('{invalid', 'utf8'), validHeaders())
    expect(diagnostic.category).toBe('DIDIT_AUTH_INVALID_JSON')
  })

  it('reports DIDIT_AUTH_SCHEMA_REJECTED only after a valid HMAC', () => {
    const invalidEnvelope = { timestamp: Number(timestamp), unexpected: true }
    const { diagnostic } = verify(
      Buffer.from(JSON.stringify(invalidEnvelope), 'utf8'),
      { 'x-signature-v2': sign(invalidEnvelope), 'x-timestamp': timestamp }
    )
    expect(diagnostic.category).toBe('DIDIT_AUTH_SCHEMA_REJECTED')
    expect(diagnostic.timingSafeComparisonMatched).toBe(true)
  })

  it('reports DIDIT_AUTH_OK for a fully valid webhook', () => {
    const { result, diagnostic } = verify(body(), validHeaders())
    expect(result?.eventId).toBe('event_fixture')
    expect(diagnostic.category).toBe('DIDIT_AUTH_OK')
    expect(diagnostic.diditWebhookSecretConfigured).toBe(true)
    expect(diagnostic.diditWebhookSecretLength).toBe(secret.length)
  })

  it('reports DIDIT_AUTH_OK for a cryptographically valid test webhook', () => {
    const { diagnostic } = verify(body(), {
      ...validHeaders(),
      'x-didit-test-webhook': 'true',
    })
    expect(diagnostic.category).toBe('DIDIT_AUTH_OK')
  })

  it('logs only the approved safe diagnostic field set', () => {
    const { diagnostic } = verify(body(), validHeaders())
    expect(Object.keys(diagnostic).sort()).toEqual([
      'calculatedSignatureLength',
      'category',
      'currentEpochSeconds',
      'diditWebhookSecretConfigured',
      'diditWebhookSecretLength',
      'receivedSignatureLength',
      'receivedTimestamp',
      'signatureLengthsMatch',
      'signatureV2Exists',
      'timestampDeltaSeconds',
      'timestampExists',
      'timingSafeComparisonMatched',
    ])
  })
})
