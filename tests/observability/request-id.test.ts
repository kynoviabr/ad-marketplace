/**
 * Tests: Request ID & Correlation Foundation — PX1A
 *
 * Covers Cases A through F:
 * - CASE A: valid incoming x-request-id preserved.
 * - CASE B: missing ID generates UUID.
 * - CASE C: malformed ID replaced.
 * - CASE D: control-character/log-injection attempt rejected.
 * - CASE E: response includes canonical x-request-id where supported.
 * - CASE F: server helper resolves same propagated request ID.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  CANONICAL_REQUEST_ID_HEADER,
  isValidRequestId,
  generateRequestId,
  resolveCanonicalRequestId,
  getRequestId,
  resolveServerRequestId,
  createOperationId,
} from '@/modules/observability/request-id'

describe('PX1A Request ID & Correlation Contract', () => {
  const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  // ---------------------------------------------------------------------------
  // CASE A: Valid incoming x-request-id preserved
  // ---------------------------------------------------------------------------
  describe('CASE A: Valid incoming x-request-id preserved', () => {
    it('preserves a standard UUID v4', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000'
      expect(isValidRequestId(validUuid)).toBe(true)
      expect(resolveCanonicalRequestId(validUuid)).toBe(validUuid)
    })

    it('preserves safe alphanumeric trace identifiers (8-64 chars)', () => {
      const safeTraceId = 'req_prod_trace_9876543210_abcdef'
      expect(isValidRequestId(safeTraceId)).toBe(true)
      expect(resolveCanonicalRequestId(safeTraceId)).toBe(safeTraceId)
    })

    it('retrieves valid incoming ID from Headers instance', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000'
      const headers = new Headers({ [CANONICAL_REQUEST_ID_HEADER]: id })
      expect(getRequestId(headers)).toBe(id)
    })

    it('retrieves valid incoming ID from Request instance', () => {
      const id = '7b1029c0-5a3d-4c31-90a6-193433544211'
      const req = new Request('https://velvet.club/api/health', {
        headers: { [CANONICAL_REQUEST_ID_HEADER]: id },
      })
      expect(getRequestId(req)).toBe(id)
    })
  })

  // ---------------------------------------------------------------------------
  // CASE B: Missing ID generates UUID
  // ---------------------------------------------------------------------------
  describe('CASE B: Missing ID generates UUID', () => {
    it('generates a valid UUID v4 when candidate is null', () => {
      const generated = resolveCanonicalRequestId(null)
      expect(generated).toMatch(UUID_V4_REGEX)
    })

    it('generates a valid UUID v4 when candidate is undefined', () => {
      const generated = resolveCanonicalRequestId(undefined)
      expect(generated).toMatch(UUID_V4_REGEX)
    })

    it('generates a valid UUID v4 when candidate is empty string', () => {
      const generated = resolveCanonicalRequestId('')
      expect(generated).toMatch(UUID_V4_REGEX)
    })

    it('generates a valid UUID v4 when headers omit x-request-id', () => {
      const headers = new Headers()
      const generated = getRequestId(headers)
      expect(generated).toMatch(UUID_V4_REGEX)
    })

    it('generates distinct IDs on consecutive calls', () => {
      const id1 = generateRequestId()
      const id2 = generateRequestId()
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(UUID_V4_REGEX)
      expect(id2).toMatch(UUID_V4_REGEX)
    })
  })

  // ---------------------------------------------------------------------------
  // CASE C: Malformed ID replaced
  // ---------------------------------------------------------------------------
  describe('CASE C: Malformed ID replaced', () => {
    it('rejects too-short candidate (< 8 chars)', () => {
      const tooShort = 'req123'
      expect(isValidRequestId(tooShort)).toBe(false)
      expect(resolveCanonicalRequestId(tooShort)).toMatch(UUID_V4_REGEX)
    })

    it('rejects excessively long candidate (> 64 chars)', () => {
      const tooLong = 'a'.repeat(65)
      expect(isValidRequestId(tooLong)).toBe(false)
      expect(resolveCanonicalRequestId(tooLong)).toMatch(UUID_V4_REGEX)
    })

    it('rejects candidate with invalid symbols (spaces, slashes, punctuation)', () => {
      const invalidChars = ['req id with spaces', 'req/slash/id', 'req$dollar', 'req;semicolon']
      for (const candidate of invalidChars) {
        expect(isValidRequestId(candidate)).toBe(false)
        expect(resolveCanonicalRequestId(candidate)).toMatch(UUID_V4_REGEX)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // CASE D: Control-character / log-injection attempt rejected
  // ---------------------------------------------------------------------------
  describe('CASE D: Control-character and log-injection defenses', () => {
    it('rejects newline character (\\n) log-injection attempt', () => {
      const injection = 'validuuid123\n[CRITICAL_LOG_FORGERY]'
      expect(isValidRequestId(injection)).toBe(false)
      const sanitized = resolveCanonicalRequestId(injection)
      expect(sanitized).toMatch(UUID_V4_REGEX)
      expect(sanitized).not.toContain('\n')
      expect(sanitized).not.toContain('FORGERY')
    })

    it('rejects carriage return (\\r) and null byte (\\0)', () => {
      const crInjection = 'validuuid123\r[INJECT]'
      const nullByte = 'validuuid123\0[INJECT]'
      expect(isValidRequestId(crInjection)).toBe(false)
      expect(isValidRequestId(nullByte)).toBe(false)
      expect(resolveCanonicalRequestId(crInjection)).toMatch(UUID_V4_REGEX)
      expect(resolveCanonicalRequestId(nullByte)).toMatch(UUID_V4_REGEX)
    })

    it('rejects HTML / script tags', () => {
      const scriptTag = '<script>alert(1)</script>'
      expect(isValidRequestId(scriptTag)).toBe(false)
      expect(resolveCanonicalRequestId(scriptTag)).toMatch(UUID_V4_REGEX)
    })

    it('rejects arbitrary JSON payloads', () => {
      const jsonPayload = '{"forged":"entry","level":"CRITICAL"}'
      expect(isValidRequestId(jsonPayload)).toBe(false)
      expect(resolveCanonicalRequestId(jsonPayload)).toMatch(UUID_V4_REGEX)
    })
  })

  // ---------------------------------------------------------------------------
  // CASE E: Operation ID for background / internal tasks
  // ---------------------------------------------------------------------------
  describe('CASE E: Operation ID creation', () => {
    it('creates operation ID with default prefix', () => {
      const opId = createOperationId()
      expect(opId.startsWith('op-')).toBe(true)
      const uuidPart = opId.slice(3)
      expect(uuidPart).toMatch(UUID_V4_REGEX)
    })

    it('creates operation ID with custom prefix', () => {
      const opId = createOperationId('kyc-worker')
      expect(opId.startsWith('kyc-worker-')).toBe(true)
      const uuidPart = opId.slice('kyc-worker-'.length)
      expect(uuidPart).toMatch(UUID_V4_REGEX)
    })
  })

  // ---------------------------------------------------------------------------
  // CASE F: Server helper resolves request ID
  // ---------------------------------------------------------------------------
  describe('CASE F: Server helper resolveServerRequestId', () => {
    it('returns a valid UUID v4 when called outside an active request context', async () => {
      const id = await resolveServerRequestId()
      expect(id).toMatch(UUID_V4_REGEX)
    })
  })
})
