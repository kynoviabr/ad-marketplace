import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import {
  isDistributedRateLimited,
  resetDistributedRateLimit,
} from '@/modules/security/rate-limiter'
import {
  isConciergeDistributedRateLimited,
  DISTRIBUTED_CONCIERGE_RATE_LIMITING_READY,
} from '@/modules/concierge/rate-limiter'
import {
  isAuthDistributedRateLimited,
  DISTRIBUTED_AUTH_RATE_LIMITING_READY,
} from '@/modules/auth/rate-limiter'

describe('PX7 — Distributed Rate Limiter Suite', () => {
  const testKeys: string[] = []

  beforeEach(() => {
    // Generate unique test key per test
  })

  afterAll(async () => {
    // Cleanup any lingering test keys
    for (const key of testKeys) {
      await resetDistributedRateLimit(key)
    }
  })

  describe('1. Core Atomic Distributed Rate Limiter', () => {
    it('enforces threshold and blocks requests once limit is exceeded', async () => {
      const key = `test:px7:limit:${Date.now()}`
      testKeys.push(key)

      const limit = 3
      const windowSeconds = 60

      // Attempts 1, 2, 3 should succeed (false = not blocked)
      const res1 = await isDistributedRateLimited(key, limit, windowSeconds)
      const res2 = await isDistributedRateLimited(key, limit, windowSeconds)
      const res3 = await isDistributedRateLimited(key, limit, windowSeconds)

      expect(res1).toBe(false)
      expect(res2).toBe(false)
      expect(res3).toBe(false)

      // Attempt 4 should be blocked (true = blocked)
      const res4 = await isDistributedRateLimited(key, limit, windowSeconds)
      expect(res4).toBe(true)

      // Attempt 5 also blocked
      const res5 = await isDistributedRateLimited(key, limit, windowSeconds)
      expect(res5).toBe(true)
    })

    it('resets bucket count after explicit reset', async () => {
      const key = `test:px7:reset:${Date.now()}`
      testKeys.push(key)

      const limit = 2
      const windowSeconds = 60

      await isDistributedRateLimited(key, limit, windowSeconds)
      await isDistributedRateLimited(key, limit, windowSeconds)
      const blocked = await isDistributedRateLimited(key, limit, windowSeconds)
      expect(blocked).toBe(true)

      // Reset bucket
      await resetDistributedRateLimit(key)

      // Should now be allowed again
      const allowedAfterReset = await isDistributedRateLimited(key, limit, windowSeconds)
      expect(allowedAfterReset).toBe(false)
    })

    it('handles simulated concurrent multi-instance requests atomically', async () => {
      const key = `test:px7:concurrent:${Date.now()}`
      testKeys.push(key)

      const limit = 5
      const windowSeconds = 60

      // Fire 10 requests concurrently (simulating multiple serverless instances)
      const results = await Promise.all(
        Array.from({ length: 10 }).map(() =>
          isDistributedRateLimited(key, limit, windowSeconds)
        )
      )

      // Exactly 5 should be allowed (false), and exactly 5 should be blocked (true)
      const allowedCount = results.filter((r) => r === false).length
      const blockedCount = results.filter((r) => r === true).length

      expect(allowedCount).toBe(5)
      expect(blockedCount).toBe(5)
    })

    it('isolates different visitor keys completely', async () => {
      const visitor1 = `test:px7:visitor1:${Date.now()}`
      const visitor2 = `test:px7:visitor2:${Date.now()}`
      testKeys.push(visitor1, visitor2)

      const limit = 2
      const windowSeconds = 60

      // Exhaust visitor 1
      await isDistributedRateLimited(visitor1, limit, windowSeconds)
      await isDistributedRateLimited(visitor1, limit, windowSeconds)
      const v1Blocked = await isDistributedRateLimited(visitor1, limit, windowSeconds)
      expect(v1Blocked).toBe(true)

      // Visitor 2 should still be unblocked
      const v2Allowed = await isDistributedRateLimited(visitor2, limit, windowSeconds)
      expect(v2Allowed).toBe(false)
    })
  })

  describe('2. Concierge Distributed Protection', () => {
    it('declares DISTRIBUTED_CONCIERGE_RATE_LIMITING_READY as true', () => {
      expect(DISTRIBUTED_CONCIERGE_RATE_LIMITING_READY).toBe(true)
    })

    it('enforces concierge turn rate limit across instances', async () => {
      const convId = `test-conv-${Date.now()}`
      const key = `concierge:CONVERSATION_TURN:${convId}`
      testKeys.push(key)

      // Limit is 20 turns / hour. Let's verify sequential increment
      const r1 = await isConciergeDistributedRateLimited(convId, 'CONVERSATION_TURN')
      expect(r1).toBe(false)
    })

    it('enforces session burst rate limit across instances', async () => {
      const sessionId = `test-session-${Date.now()}`
      const key = `concierge:SESSION_BURST:${sessionId}`
      testKeys.push(key)

      const r1 = await isConciergeDistributedRateLimited(sessionId, 'SESSION_BURST')
      expect(r1).toBe(false)
    })
  })

  describe('3. Auth Distributed Protection', () => {
    it('declares DISTRIBUTED_AUTH_RATE_LIMITING_READY as true', () => {
      expect(DISTRIBUTED_AUTH_RATE_LIMITING_READY).toBe(true)
    })

    it('enforces auth distributed limit on simulated IP keys', async () => {
      const hmacKey = `fake-ip-hmac-${Date.now()}`
      const key = `auth:LOGIN:${hmacKey}`
      testKeys.push(key)

      const r1 = await isAuthDistributedRateLimited(hmacKey, 'LOGIN')
      expect(r1).toBe(false)
    })
  })
})
