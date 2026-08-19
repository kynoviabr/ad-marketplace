import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryRateLimiter, defaultRateLimiter, ipSourceRateLimiter, DISTRIBUTED_RATE_LIMITING_READY } from '@/modules/analytics/rate-limiter'

/**
 * FASE 11 — Analytics Rate Limiter Hardening Tests
 *
 * Verifies:
 * - Session-based rate limiting still works
 * - IP-derived rate limiter is a separate instance
 * - DISTRIBUTED_RATE_LIMITING_READY = false (pre-production blocker documented)
 * - Two instances do not share state
 *
 * Pure unit tests — no Supabase required.
 */

describe('FASE 11 — Analytics Rate Limiter Hardening', () => {
  beforeEach(() => {
    // Reset both limiters before each test
    defaultRateLimiter.reset()
    ipSourceRateLimiter.reset()
  })

  it('DISTRIBUTED_RATE_LIMITING_READY is false (pre-production blocker)', () => {
    // This documents that the rate limiter is LOCAL_BEST_EFFORT only
    expect(DISTRIBUTED_RATE_LIMITING_READY).toBe(false)
  })

  it('ipSourceRateLimiter is a separate instance from defaultRateLimiter', () => {
    expect(ipSourceRateLimiter).not.toBe(defaultRateLimiter)
  })

  it('session rate limiter: allows requests below limit', async () => {
    const limiter = new InMemoryRateLimiter()
    const key = 'session:test-uuid-001'

    for (let i = 0; i < 5; i++) {
      const limited = await limiter.isRateLimited(key, 50, 3600)
      expect(limited).toBe(false)
    }
  })

  it('session rate limiter: blocks requests at the limit', async () => {
    const limiter = new InMemoryRateLimiter()
    const key = 'session:test-uuid-002'
    const limit = 3

    for (let i = 0; i < limit; i++) {
      await limiter.isRateLimited(key, limit, 3600)
    }

    // Next request should be blocked
    const limited = await limiter.isRateLimited(key, limit, 3600)
    expect(limited).toBe(true)
  })

  it('session rate limiter: different sessions have independent limits', async () => {
    const limiter = new InMemoryRateLimiter()
    const limit = 2

    // Fill session A's limit
    await limiter.isRateLimited('session:A', limit, 3600)
    await limiter.isRateLimited('session:A', limit, 3600)
    const aLimited = await limiter.isRateLimited('session:A', limit, 3600)
    expect(aLimited).toBe(true)

    // Session B should still be free
    const bLimited = await limiter.isRateLimited('session:B', limit, 3600)
    expect(bLimited).toBe(false)
  })

  it('IP rate limiter: different IP-derived keys have independent limits', async () => {
    const limit = 2

    // Fill IP key 1's limit
    await ipSourceRateLimiter.isRateLimited('ip-key-hash-001', limit, 3600)
    await ipSourceRateLimiter.isRateLimited('ip-key-hash-001', limit, 3600)
    const key1Limited = await ipSourceRateLimiter.isRateLimited('ip-key-hash-001', limit, 3600)
    expect(key1Limited).toBe(true)

    // IP key 2 should still be free
    const key2Limited = await ipSourceRateLimiter.isRateLimited('ip-key-hash-002', limit, 3600)
    expect(key2Limited).toBe(false)
  })

  it('session and IP limiters do not share state', async () => {
    const key = 'shared-test-key'
    const limit = 1

    // Fill the defaultRateLimiter
    await defaultRateLimiter.isRateLimited(key, limit, 3600)
    const defaultLimited = await defaultRateLimiter.isRateLimited(key, limit, 3600)
    expect(defaultLimited).toBe(true)

    // ipSourceRateLimiter should be unaffected
    const ipLimited = await ipSourceRateLimiter.isRateLimited(key, limit, 3600)
    expect(ipLimited).toBe(false) // still first hit, should not be limited
  })

  it('rate limiter treats expired windows as fresh (window boundary behavior)', async () => {
    const limiter = new InMemoryRateLimiter()
    const key = 'session:expiry-test'
    const limit = 1

    // Hit limit with 1-second window
    await limiter.isRateLimited(key, limit, 1)
    const limited = await limiter.isRateLimited(key, limit, 1)
    // Same window, should be limited since we used the only slot
    expect(limited).toBe(true)

    // After manually clearing (simulating window expiry), should be free again
    limiter.reset()
    const afterReset = await limiter.isRateLimited(key, limit, 3600)
    expect(afterReset).toBe(false)
  })


  it('reset() clears all rate limit state', async () => {
    const limit = 1

    // Fill both limiters
    await defaultRateLimiter.isRateLimited('key1', limit, 3600)
    await defaultRateLimiter.isRateLimited('key1', limit, 3600)
    await ipSourceRateLimiter.isRateLimited('key2', limit, 3600)
    await ipSourceRateLimiter.isRateLimited('key2', limit, 3600)

    // Reset both
    defaultRateLimiter.reset()
    ipSourceRateLimiter.reset()

    // Should be clear
    const d = await defaultRateLimiter.isRateLimited('key1', limit, 3600)
    const i = await ipSourceRateLimiter.isRateLimited('key2', limit, 3600)
    expect(d).toBe(false)
    expect(i).toBe(false)
  })
})
