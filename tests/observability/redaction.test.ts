/**
 * Tests: Sensitive Data Redaction & Memory Safety — PX1A
 *
 * Verifies Zero-Trust redaction of credentials, tokens, PII, and financial identifiers,
 * ensuring no leakage occurs while preserving harmless operational metadata.
 * Confirms non-crashing defense against cyclic and excessive payloads.
 */

import { describe, it, expect } from 'vitest'
import {
  isSensitiveKey,
  sanitizeStringValue,
  redactMetadata,
  REDACTED_MARKER,
  CIRCULAR_MARKER,
  DEPTH_LIMIT_MARKER,
} from '@/modules/observability/redaction'

describe('PX1A Sensitive Data Redaction', () => {
  // ---------------------------------------------------------------------------
  // 1. Sensitive Key Matcher
  // ---------------------------------------------------------------------------
  describe('isSensitiveKey detection', () => {
    it('identifies credentials and secrets as sensitive', () => {
      const sensitive = [
        'password',
        'user_password',
        'newPassword',
        'current_password',
        'secret',
        'webhook_secret',
        'jwtSecret',
        'token',
        'access_token',
        'refreshToken',
        'service_role_key',
        'apikey',
        'api_key',
        'private_key',
        'cookie',
        'set-cookie',
        'authorization',
        'proxy-authorization',
      ]
      for (const k of sensitive) {
        expect(isSensitiveKey(k)).toBe(true)
      }
    })

    it('identifies codes, OTPs, and verification data as sensitive', () => {
      const sensitive = [
        'code',
        'oauth_code',
        'authCode',
        'verification_code',
        'otp',
        'totp',
        'hotp',
        'email_otp',
      ]
      for (const k of sensitive) {
        expect(isSensitiveKey(k)).toBe(true)
      }
    })

    it('identifies identity documents and financial data as sensitive', () => {
      const sensitive = [
        'cpf',
        'cnpj',
        'document',
        'document_number',
        'idDocument',
        'card',
        'credit_card',
        'cardNumber',
        'cvv',
        'cvc',
        'pin',
      ]
      for (const k of sensitive) {
        expect(isSensitiveKey(k)).toBe(true)
      }
    })

    it('identifies direct contact PII as sensitive', () => {
      const sensitive = [
        'email',
        'userEmail',
        'phone',
        'whatsapp',
        'telefone',
        'celular',
      ]
      for (const k of sensitive) {
        expect(isSensitiveKey(k)).toBe(true)
      }
    })

    it('does NOT flag harmless operational codes', () => {
      const harmless = [
        'statusCode',
        'httpStatusCode',
        'errorCode',
        'reasonCode',
        'currencyCode',
        'countryCode',
        'postalCode',
        'zipCode',
        'geoCode',
        'languageCode',
        'cityCode',
        'stateCode',
        'areaCode',
      ]
      for (const k of harmless) {
        expect(isSensitiveKey(k)).toBe(false)
      }
    })

    it('does NOT flag harmless documentation fields', () => {
      const harmless = ['documentation', 'documentType', 'documentsStatus']
      for (const k of harmless) {
        expect(isSensitiveKey(k)).toBe(false)
      }
    })

    it('does NOT flag common domain fields', () => {
      const harmless = [
        'id',
        'role',
        'status',
        'subsystem',
        'event',
        'durationMs',
        'outcome',
        'count',
        'city',
        'neighborhood',
        'planName',
      ]
      for (const k of harmless) {
        expect(isSensitiveKey(k)).toBe(false)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // 2. String Value Sanitizer (Bearer, JWT, CPF, Long Strings)
  // ---------------------------------------------------------------------------
  describe('sanitizeStringValue', () => {
    it('redacts inline Bearer tokens', () => {
      const bearer = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      expect(sanitizeStringValue(bearer)).toBe('Bearer [REDACTED]')
    })

    it('redacts standalone JWT tokens', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozGz_w'
      expect(sanitizeStringValue(jwt)).toBe('[REDACTED_JWT]')
    })

    it('redacts formatted CPFs', () => {
      expect(sanitizeStringValue('123.456.789-00')).toBe('[REDACTED_CPF]')
      expect(sanitizeStringValue('12345678900')).toBe('12345678900') // plain digits untouched unless key is sensitive
    })

    it('truncates strings longer than 2000 characters', () => {
      const hugeString = 'x'.repeat(2500)
      const sanitized = sanitizeStringValue(hugeString)
      expect(sanitized.length).toBeLessThan(2100)
      expect(sanitized.endsWith('...[TRUNCATED]')).toBe(true)
    })

    it('leaves safe strings unchanged', () => {
      expect(sanitizeStringValue('profile_activated')).toBe('profile_activated')
      expect(sanitizeStringValue('Sao Paulo')).toBe('Sao Paulo')
    })
  })

  // ---------------------------------------------------------------------------
  // 3. Recursive Metadata Redaction
  // ---------------------------------------------------------------------------
  describe('redactMetadata recursive sanitization', () => {
    it('redacts top-level sensitive properties', () => {
      const payload = {
        userId: 'acc-123',
        password: 'SuperSecretPassword!',
        token: 'sbp_12345',
        role: 'ADVERTISER',
      }
      const sanitized = redactMetadata(payload) as Record<string, unknown>

      expect(sanitized.userId).toBe('acc-123')
      expect(sanitized.password).toBe(REDACTED_MARKER)
      expect(sanitized.token).toBe(REDACTED_MARKER)
      expect(sanitized.role).toBe('ADVERTISER')
    })

    it('redacts deeply nested sensitive properties', () => {
      const payload = {
        request: {
          headers: {
            authorization: 'Bearer token-value',
            cookie: 'session=xyz',
            host: 'velvet.club',
          },
          body: {
            profile: {
              cpf: '123.456.789-00',
              phone: '+5511999998888',
              name: 'Alice',
            },
          },
        },
      }
      const sanitized = redactMetadata(payload) as any

      expect(sanitized.request.headers.authorization).toBe(REDACTED_MARKER)
      expect(sanitized.request.headers.cookie).toBe(REDACTED_MARKER)
      expect(sanitized.request.headers.host).toBe('velvet.club')
      expect(sanitized.request.body.profile.cpf).toBe(REDACTED_MARKER)
      expect(sanitized.request.body.profile.phone).toBe(REDACTED_MARKER)
      expect(sanitized.request.body.profile.name).toBe('Alice')
    })

    it('preserves harmless codes in nested metadata', () => {
      const payload = {
        httpStatusCode: 200,
        response: {
          errorCode: 'INVALID_CREDENTIALS',
          reasonCode: 'GATE_FAILED',
          countryCode: 'BR',
        },
      }
      const sanitized = redactMetadata(payload) as any

      expect(sanitized.httpStatusCode).toBe(200)
      expect(sanitized.response.errorCode).toBe('INVALID_CREDENTIALS')
      expect(sanitized.response.reasonCode).toBe('GATE_FAILED')
      expect(sanitized.response.countryCode).toBe('BR')
    })
  })

  // ---------------------------------------------------------------------------
  // 4. Memory Safety & Cyclic Object Defense
  // ---------------------------------------------------------------------------
  describe('Memory safety, cyclic objects, and depth bounds', () => {
    it('handles cyclic object references without crashing', () => {
      const cyclic: Record<string, unknown> = {
        name: 'test-operation',
      }
      cyclic.self = cyclic

      expect(() => redactMetadata(cyclic)).not.toThrow()
      const sanitized = redactMetadata(cyclic) as any
      expect(sanitized.name).toBe('test-operation')
      expect(sanitized.self).toBe(CIRCULAR_MARKER)
    })

    it('caps recursion at maximum depth bound', () => {
      let current: Record<string, unknown> = { depth: 0 }
      const root = current
      for (let i = 1; i <= 10; i++) {
        const next = { depth: i }
        current.child = next
        current = next
      }

      const sanitized = redactMetadata(root) as any
      // After depth 6 it should return DEPTH_LIMIT_MARKER
      let cursor = sanitized
      let depth = 0
      while (cursor && typeof cursor === 'object' && cursor.child) {
        depth++
        cursor = cursor.child
      }
      expect(cursor).toBe(DEPTH_LIMIT_MARKER)
    })

    it('truncates arrays exceeding 50 elements', () => {
      const largeArray = Array.from({ length: 65 }, (_, i) => `item-${i}`)
      const sanitized = redactMetadata(largeArray) as unknown[]

      expect(sanitized.length).toBe(51) // 50 items + 1 truncation notice
      expect(sanitized[0]).toBe('item-0')
      expect(sanitized[49]).toBe('item-49')
      expect(sanitized[50]).toContain('[TRUNCATED: 15 items omitted]')
    })

    it('converts Date instances to ISO strings', () => {
      const date = new Date('2026-09-05T12:00:00.000Z')
      const sanitized = redactMetadata({ createdAt: date }) as any
      expect(sanitized.createdAt).toBe('2026-09-05T12:00:00.000Z')
    })

    it('safely ignores symbols and functions', () => {
      const payload = {
        normal: 'value',
        fn: () => {},
        sym: Symbol('test'),
      }
      const sanitized = redactMetadata(payload) as any
      expect(sanitized.normal).toBe('value')
      expect(sanitized.fn).toBeUndefined()
      expect(sanitized.sym).toBeUndefined()
    })
  })
})
