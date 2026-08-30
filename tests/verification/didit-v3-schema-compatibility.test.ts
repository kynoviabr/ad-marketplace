import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { DiditWebhookPayloadSchema } from '@/modules/verification/schemas'
import {
  canonicalizeDiditV3,
  type DiditAuthDiagnostic,
  verifyDiditWebhookSignature,
} from '@/modules/verification/providers/didit/webhook'

describe('Didit v3 session webhook schema compatibility', () => {
  const secret = 'schema_compatibility_fixture_secret'
  const nowMs = 1_788_057_619_000

  const envelope = {
    session_id: 'session-v3-fixture',
    status: 'Approved',
    vendor_data: null,
    webhook_type: 'status.updated',
    timestamp: 1_788_057_618,
    created_at: 1_788_057_600,
    workflow_id: 'workflow-v3-fixture',
    metadata: { account_reference: 'internal-fixture' },
    decision: {
      session_id: 'session-v3-fixture',
      session_number: 42,
      session_url: 'https://verification.didit.me/session/fixture',
      status: 'Approved',
      workflow_id: 'workflow-v3-fixture',
      features: [],
      vendor_data: null,
      metadata: {},
      callback: null,
      id_verifications: [],
      nfc_verifications: [],
      liveness_checks: [],
      face_matches: [],
      poa_verifications: [],
      phone_verifications: [],
      email_verifications: [],
      aml_screenings: [],
      ip_analyses: [],
      database_validations: [],
      questionnaire_responses: [],
      reviews: [],
      contact_details: null,
      expected_details: {},
      created_at: '2026-08-29T12:00:00Z',
      provider_future_field: { nested: true },
    },
    provider_future_field: ['preserved for signature, ignored after parsing'],
  }

  function sign(payload: unknown): string {
    return createHmac('sha256', secret)
      .update(canonicalizeDiditV3(payload), 'utf8')
      .digest('hex')
  }

  function verify(payload: unknown) {
    const logger = vi.fn<(diagnostic: DiditAuthDiagnostic) => void>()
    const result = verifyDiditWebhookSignature(
      Buffer.from(JSON.stringify(payload), 'utf8'),
      {
        'x-signature-v2': sign(payload),
        'x-timestamp': String(nowMs / 1000),
      },
      { secret, now: () => nowMs, logger }
    )
    return { result, diagnostic: logger.mock.calls[0]?.[0] }
  }

  it('accepts the authenticated current Try Webhook top-level envelope', () => {
    const { result, diagnostic } = verify(envelope)

    expect(diagnostic.category).toBe('DIDIT_AUTH_OK')
    expect(result).toMatchObject({
      sessionId: envelope.session_id,
      rawStatus: 'Approved',
      eventType: 'status.updated',
    })
    expect(result?.eventId).toMatch(/^[a-f0-9]{64}$/)
  })

  it('accepts data.updated with missing optional provider fields', () => {
    const minimal = {
      session_id: 'session-data-fixture',
      webhook_type: 'data.updated',
      timestamp: envelope.timestamp,
      created_at: envelope.created_at,
    }

    const { result, diagnostic } = verify(minimal)
    expect(diagnostic.category).toBe('DIDIT_AUTH_OK')
    expect(result?.eventType).toBe('data.updated')
  })

  it('accepts nullable provider fields, empty arrays and extra fields', () => {
    expect(DiditWebhookPayloadSchema.safeParse(envelope).success).toBe(true)
  })

  it('preserves provider event_id when Didit supplies one', () => {
    const { result } = verify({ ...envelope, event_id: 'event-v3-fixture' })
    expect(result?.eventId).toBe('event-v3-fixture')
  })

  it('derives the same idempotency key across delivery timestamp retries', () => {
    const first = verify(envelope).result
    const retry = verify({ ...envelope, timestamp: envelope.timestamp + 60 }).result
    expect(retry?.eventId).toBe(first?.eventId)
  })

  it('derives a different idempotency key for a later underlying update', () => {
    const first = verify(envelope).result
    const later = verify({ ...envelope, created_at: envelope.created_at + 1 }).result
    expect(later?.eventId).not.toBe(first?.eventId)
  })

  it('rejects a missing required session_id after valid authentication', () => {
    const { diagnostic } = verify({ ...envelope, session_id: undefined })
    expect(diagnostic.category).toBe('DIDIT_AUTH_SCHEMA_REJECTED')
  })

  it('rejects a missing created_at when event_id is also absent', () => {
    const { created_at: _createdAt, ...withoutCreatedAt } = envelope
    const { diagnostic } = verify(withoutCreatedAt)
    expect(diagnostic.category).toBe('DIDIT_AUTH_SCHEMA_REJECTED')
  })

  it('rejects an unrelated webhook event type', () => {
    const { diagnostic } = verify({ ...envelope, webhook_type: 'transaction.created' })
    expect(diagnostic.category).toBe('DIDIT_AUTH_SCHEMA_REJECTED')
  })

  it('does not return or persist webhook PII/provider payload fields', () => {
    const sensitiveEnvelope = {
      ...envelope,
      decision: {
        ...envelope.decision,
        legal_name: 'Fixture Only',
        date_of_birth: '1990-01-01',
        document_number: 'FIXTURE-DOCUMENT',
        biometric_url: 'https://media.didit.me/private/fixture',
      },
    }
    const { result } = verify(sensitiveEnvelope)

    expect(result).toEqual({
      eventId: result?.eventId,
      sessionId: envelope.session_id,
      rawStatus: 'Approved',
      vendorData: undefined,
      eventType: 'status.updated',
    })
    expect(JSON.stringify(result)).not.toContain('Fixture Only')
    expect(JSON.stringify(result)).not.toContain('FIXTURE-DOCUMENT')
    expect(JSON.stringify(result)).not.toContain('media.didit.me')
  })
})
