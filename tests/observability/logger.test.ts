/**
 * Tests: Structured Logger Foundation — PX1A
 *
 * Verifies:
 * - Structured JSON output format (one line per event)
 * - Required core fields (timestamp, level, event, subsystem)
 * - Log level thresholds and filtering
 * - Request ID and operation ID correlation
 * - Automatic metadata redaction
 * - Standardized error serialization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { logger, setLogSink, resetLogSink, logEvent } from '@/modules/observability/logger'
import type { LogEvent } from '@/modules/observability/types'

describe('PX1A Structured Logger', () => {
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
  // 1. Required Core Fields & Shape
  // ---------------------------------------------------------------------------
  describe('Core log event schema', () => {
    it('emits an event with all mandatory core fields', () => {
      const event = logger.info('auth.login.succeeded', {
        subsystem: 'AUTH',
      })

      expect(event).not.toBeNull()
      expect(event!.level).toBe('INFO')
      expect(event!.event).toBe('auth.login.succeeded')
      expect(event!.subsystem).toBe('AUTH')
      expect(event!.timestamp).toBeDefined()
      expect(() => new Date(event!.timestamp).toISOString()).not.toThrow()
      expect(capturedLogs.length).toBe(1)
      expect(capturedLogs[0]).toEqual(event)
    })

    it('propagates requestId and operationId when provided', () => {
      const reqId = 'req-12345678-abcd-ef01'
      const opId = 'op-98765432-feed-ba98'

      const event = logger.info('kyc.didit.webhook_received', {
        subsystem: 'KYC',
        requestId: reqId,
        operationId: opId,
      })

      expect(event!.requestId).toBe(reqId)
      expect(event!.operationId).toBe(opId)
      expect(capturedLogs[0].requestId).toBe(reqId)
    })

    it('records durationMs and outcome when provided', () => {
      const event = logger.info('billing.webhook.processed', {
        subsystem: 'BILLING',
        durationMs: 42,
        outcome: 'SUCCESS',
      })

      expect(event!.durationMs).toBe(42)
      expect(event!.outcome).toBe('SUCCESS')
    })
  })

  // ---------------------------------------------------------------------------
  // 2. Log Levels & Hierarchy
  // ---------------------------------------------------------------------------
  describe('Log levels and methods', () => {
    it('emits DEBUG via logger.debug', () => {
      const event = logger.debug('system.debug.probe', { subsystem: 'SYSTEM' })
      expect(event?.level).toBe('DEBUG')
    })

    it('emits INFO via logger.info', () => {
      const event = logger.info('system.info.probe', { subsystem: 'SYSTEM' })
      expect(event?.level).toBe('INFO')
    })

    it('emits WARN via logger.warn', () => {
      const event = logger.warn('system.warn.probe', { subsystem: 'SYSTEM' })
      expect(event?.level).toBe('WARN')
    })

    it('emits ERROR via logger.error', () => {
      const event = logger.error('system.error.probe', { subsystem: 'SYSTEM' })
      expect(event?.level).toBe('ERROR')
    })
  })

  // ---------------------------------------------------------------------------
  // 3. Automatic Metadata Redaction
  // ---------------------------------------------------------------------------
  describe('Automatic metadata sanitization', () => {
    it('automatically redacts sensitive keys in log metadata', () => {
      logger.info('auth.oauth.callback_received', {
        subsystem: 'AUTH',
        metadata: {
          code: 'secret-oauth-code',
          authorization: 'Bearer sensitive-token',
          userEmail: 'user@example.com',
          role: 'CLIENT',
          status: 'ACTIVE',
        },
      })

      const entry = capturedLogs[0]
      expect(entry.metadata).toBeDefined()
      expect(entry.metadata!.code).toBe('[REDACTED]')
      expect(entry.metadata!.authorization).toBe('[REDACTED]')
      expect(entry.metadata!.userEmail).toBe('[REDACTED]')
      // Harmless keys preserved
      expect(entry.metadata!.role).toBe('CLIENT')
      expect(entry.metadata!.status).toBe('ACTIVE')
    })
  })

  // ---------------------------------------------------------------------------
  // 4. Standardized Error Serialization
  // ---------------------------------------------------------------------------
  describe('Error serialization in log entries', () => {
    it('serializes standard Error instances with safe fields', () => {
      const error = new Error('Database connection timed out')
      ;(error as any).code = 'ETIMEDOUT'

      logger.error('database.connection.failed', {
        subsystem: 'DATABASE',
        error,
      })

      const entry = capturedLogs[0]
      expect(entry.error).toBeDefined()
      expect(entry.error!.name).toBe('Error')
      expect(entry.error!.message).toBe('Database connection timed out')
      expect(entry.error!.code).toBe('ETIMEDOUT')
    })

    it('redacts sensitive values found inside error messages', () => {
      const secretError = new Error('Failed to connect with token sbp_secret_12345')
      logger.error('storage.upload.failed', {
        subsystem: 'STORAGE',
        error: secretError,
      })

      const entry = capturedLogs[0]
      expect(entry.error!.message).not.toContain('secret_12345')
    })
  })

  // ---------------------------------------------------------------------------
  // 5. Default Console Sink JSON Output
  // ---------------------------------------------------------------------------
  describe('Default Console Output Format', () => {
    it('emits single-line valid JSON string to stdout/stderr', () => {
      resetLogSink() // restore default console sink
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      logger.info('system.startup.ready', {
        subsystem: 'SYSTEM',
        metadata: { nodeEnv: 'test' },
      })

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const rawArg = consoleLogSpy.mock.calls[0][0]
      expect(typeof rawArg).toBe('string')
      expect(() => JSON.parse(rawArg)).not.toThrow()

      const parsed = JSON.parse(rawArg)
      expect(parsed.event).toBe('system.startup.ready')
      expect(parsed.subsystem).toBe('SYSTEM')
      expect(parsed.level).toBe('INFO')
    })
  })
})
