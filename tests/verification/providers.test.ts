import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createHmac } from 'node:crypto'
import { MockVerificationProvider } from '@/modules/verification/providers/mock'
import {
  isAdultFromBirthDate,
  extractAgeVerifiedThreshold,
  normalizeDiditStatus,
} from '@/modules/verification/providers/didit/normalizer'
import { verifyDiditWebhookSignature } from '@/modules/verification/providers/didit/webhook'
import { getVerificationProvider, ProviderConfigurationError } from '@/modules/verification/providers/factory'

describe('Verification Providers & Normalizers', () => {
  describe('MockVerificationProvider', () => {
    const mockSecret = 'test_secret_123'
    const provider = new MockVerificationProvider({
      webhookSecret: mockSecret,
      defaultScenario: 'VERIFIED_ADULT',
    })

    it('creates a session with valid URL and token', async () => {
      const session = await provider.createSession({ accountUserId: 'user-1' })
      expect(session.providerSessionId).toMatch(/^mock_sess_/)
      expect(session.verificationUrl).toContain('mock.verification.local')
      expect(session.sessionToken).toBeDefined()
    })

    it('verifies HMAC-SHA256 signature correctly', async () => {
      const payload = {
        event_id: 'evt_1',
        webhook_type: 'status.updated',
        data: { session_id: 'sess_1', status: 'Approved' },
      }
      const rawBody = Buffer.from(JSON.stringify(payload), 'utf8')
      const signature = createHmac('sha256', mockSecret).update(rawBody).digest('hex')

      const result = await provider.verifyWebhook(rawBody, {
        'x-signature-v2': signature,
      })

      expect(result).not.toBeNull()
      expect(result?.eventId).toBe('evt_1')
      expect(result?.sessionId).toBe('sess_1')
      expect(result?.rawStatus).toBe('Approved')
    })

    it('rejects tampered or invalid webhook signatures', async () => {
      const payload = { event_id: 'evt_1', webhook_type: 'status.updated', data: { session_id: 'sess_1' } }
      const rawBody = Buffer.from(JSON.stringify(payload), 'utf8')
      const invalidSignature = 'invalid_hex_signature_deadbeef'

      const result = await provider.verifyWebhook(rawBody, {
        'x-signature-v2': invalidSignature,
      })

      expect(result).toBeNull()
    })

    it('returns authoritative decisions based on configured scenario', async () => {
      const sess1 = (await provider.createSession({ accountUserId: 'u1' })).providerSessionId
      const decisionAdult = await provider.fetchAuthoritativeDecision(sess1)
      expect(decisionAdult.normalizedStatus).toBe('VERIFIED')
      expect(decisionAdult.ageVerified).toBe(true)
      expect(decisionAdult.identityVerified).toBe(true)

      // Test Underage scenario
      const sess2 = (await provider.createSession({ accountUserId: 'u2' })).providerSessionId
      provider.setScenarioForSession(sess2, 'REJECTED_UNDERAGE')
      const decisionUnderage = await provider.fetchAuthoritativeDecision(sess2)
      expect(decisionUnderage.normalizedStatus).toBe('REJECTED')
      expect(decisionUnderage.ageVerified).toBe(false)
      expect(decisionUnderage.identityVerified).toBe(true)

      // Test In Review scenario
      const sess3 = (await provider.createSession({ accountUserId: 'u3' })).providerSessionId
      provider.setScenarioForSession(sess3, 'IN_REVIEW')
      const decisionReview = await provider.fetchAuthoritativeDecision(sess3)
      expect(decisionReview.normalizedStatus).toBe('IN_REVIEW')
      expect(decisionReview.identityVerified).toBe(false)
    })
  })

  describe('Didit Normalizer & Age Calculations', () => {
    it('accurately calculates age threshold from birth dates (DOB)', () => {
      const now = new Date()
      const yyyy = now.getUTCFullYear()
      const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(now.getUTCDate()).padStart(2, '0')

      // Exactly 18 years old today
      const exact18 = `${yyyy - 18}-${mm}-${dd}`
      expect(isAdultFromBirthDate(exact18)).toBe(true)

      // 19 years old
      const age19 = `${yyyy - 19}-${mm}-${dd}`
      expect(isAdultFromBirthDate(age19)).toBe(true)

      // 17 years old (born 17 years ago today)
      const age17 = `${yyyy - 17}-${mm}-${dd}`
      expect(isAdultFromBirthDate(age17)).toBe(false)

      // Invalid format
      expect(isAdultFromBirthDate('invalid-date')).toBe(false)
    })

    it('extracts age threshold from ID verification reports', () => {
      // Direct numeric age field
      expect(extractAgeVerifiedThreshold({ age: 18 })).toBe(true)
      expect(extractAgeVerifiedThreshold({ age: 25 })).toBe(true)
      expect(extractAgeVerifiedThreshold({ age: 17 })).toBe(false)

      // DOB string fallback
      expect(extractAgeVerifiedThreshold({ date_of_birth: '1990-01-01' })).toBe(true)

      // Undefined or missing
      expect(extractAgeVerifiedThreshold(undefined)).toBe(false)
      expect(extractAgeVerifiedThreshold({})).toBe(false)
    })

    it('normalizes provider status strings and enforces age invariant', () => {
      // Approved + age verified -> VERIFIED
      expect(normalizeDiditStatus('Approved', true)).toBe('VERIFIED')

      // Approved + age NOT verified -> REJECTED
      expect(normalizeDiditStatus('Approved', false)).toBe('REJECTED')

      // Other standard statuses
      expect(normalizeDiditStatus('Declined', true)).toBe('REJECTED')
      expect(normalizeDiditStatus('In Review', true)).toBe('IN_REVIEW')
      expect(normalizeDiditStatus('In Progress', true)).toBe('IN_PROGRESS')
      expect(normalizeDiditStatus('Expired', true)).toBe('EXPIRED')
      expect(normalizeDiditStatus('Kyc Expired', true)).toBe('EXPIRED')
      expect(normalizeDiditStatus('Awaiting User', false)).toBe('PENDING')

      // Unknown status -> fail closed to REJECTED
      expect(normalizeDiditStatus('UNKNOWN_STATUS_XYZ', true)).toBe('REJECTED')
    })
  })

  describe('Didit Webhook Signature Verifier', () => {
    const secret = 'didit_webhook_secret_xyz'
    const nowMs = 1_774_970_000_000

    function canonicalize(value: unknown): unknown {
      if (Array.isArray(value)) return value.map(canonicalize)
      if (value !== null && typeof value === 'object') {
        return Object.keys(value as Record<string, unknown>)
          .sort()
          .reduce<Record<string, unknown>>((result, key) => {
            result[key] = canonicalize((value as Record<string, unknown>)[key])
            return result
          }, {})
      }
      return value
    }

    function signV3(payload: unknown, signingSecret = secret): string {
      const canonical = JSON.stringify(canonicalize(payload))
      return createHmac('sha256', signingSecret).update(canonical, 'utf8').digest('hex')
    }

    function validPayload() {
      return {
        status: 'Approved',
        webhook_type: 'status.updated',
        session_id: 'sess_999',
        event_id: 'evt_999',
        timestamp: Math.floor(nowMs / 1000),
        decision: { score: 87.42, subject: 'José' },
      }
    }

    it('accepts a valid current Didit v3 canonical X-Signature-V2', () => {
      const payload = validPayload()
      const rawBody = Buffer.from(JSON.stringify(payload), 'utf8')
      const signature = signV3(payload)

      const result = verifyDiditWebhookSignature(
        rawBody,
        {
          'x-signature-v2': signature,
          'x-timestamp': String(Math.floor(nowMs / 1000)),
        },
        { secret, now: () => nowMs }
      )

      expect(result).not.toBeNull()
      expect(result?.eventId).toBe('evt_999')
      expect(result?.sessionId).toBe('sess_999')
    })

    it('rejects an invalid signature', () => {
      const payload = validPayload()
      const rawBody = Buffer.from(JSON.stringify(payload), 'utf8')
      const result = verifyDiditWebhookSignature(
        rawBody,
        { 'x-signature-v2': '0'.repeat(64), 'x-timestamp': String(nowMs / 1000) },
        { secret, now: () => nowMs }
      )
      expect(result).toBeNull()
    })

    it('rejects a valid digest generated with the wrong secret', () => {
      const payload = validPayload()
      const rawBody = Buffer.from(JSON.stringify(payload), 'utf8')
      const result = verifyDiditWebhookSignature(
        rawBody,
        { 'x-signature-v2': signV3(payload, 'wrong_secret'), 'x-timestamp': String(nowMs / 1000) },
        { secret, now: () => nowMs }
      )
      expect(result).toBeNull()
    })

    it('rejects requests with timestamp drift exceeding five minutes', () => {
      const payload = validPayload()
      const rawBody = Buffer.from(JSON.stringify(payload), 'utf8')

      const result = verifyDiditWebhookSignature(
        rawBody,
        {
          'x-signature-v2': signV3(payload),
          'x-timestamp': String(nowMs / 1000 - 301),
        },
        { secret, maxDriftSeconds: 300, now: () => nowMs }
      )

      expect(result).toBeNull()
    })

    it.each(['', 'not-a-timestamp', '1774970000.5', '-1774970000'])('rejects malformed timestamp %j', (timestamp) => {
      const payload = validPayload()
      const result = verifyDiditWebhookSignature(
        Buffer.from(JSON.stringify(payload), 'utf8'),
        { 'x-signature-v2': signV3(payload), 'x-timestamp': timestamp },
        { secret, now: () => nowMs }
      )
      expect(result).toBeNull()
    })

    it('rejects a body tampered after signing', () => {
      const payload = validPayload()
      const signature = signV3(payload)
      const tampered = { ...payload, status: 'Declined' }
      const result = verifyDiditWebhookSignature(
        Buffer.from(JSON.stringify(tampered), 'utf8'),
        { 'x-signature-v2': signature, 'x-timestamp': String(nowMs / 1000) },
        { secret, now: () => nowMs }
      )
      expect(result).toBeNull()
    })

    it('cryptographically accepts a correctly signed Didit test webhook', () => {
      const payload = validPayload()
      const result = verifyDiditWebhookSignature(
        Buffer.from(JSON.stringify(payload), 'utf8'),
        {
          'x-signature-v2': signV3(payload),
          'x-timestamp': String(nowMs / 1000),
          'x-didit-test-webhook': 'true',
        },
        { secret, now: () => nowMs }
      )
      expect(result?.eventId).toBe('evt_999')
    })
  })

  describe('Provider Factory Fail-Closed Guards', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('throws ProviderConfigurationError in production if credentials are missing', () => {
      ;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'
      delete process.env.DIDIT_API_KEY
      delete process.env.DIDIT_WORKFLOW_ID
      delete process.env.DIDIT_WEBHOOK_SECRET

      expect(() => getVerificationProvider()).toThrow(ProviderConfigurationError)
    })

    it('strictly forbids MockProvider in production even if requested', () => {
      ;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'
      process.env.USE_MOCK_KYC_PROVIDER = 'true'

      expect(() => getVerificationProvider()).toThrow(ProviderConfigurationError)
    })

    it('returns MockVerificationProvider in development/test environments when unconfigured', () => {
      ;(process.env as Record<string, string | undefined>).NODE_ENV = 'development'
      delete process.env.DIDIT_API_KEY

      const provider = getVerificationProvider()
      expect(provider.providerName).toBe('mock')
    })
  })
})
