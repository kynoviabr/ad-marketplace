import { describe, it, expect, beforeEach } from 'vitest'
import {
  InMemoryRateLimiter,
  RATE_LIMITING_MODE,
} from '@/modules/analytics/rate-limiter'

describe('FASE 09 — Analytics Rate Limiter Boundary', () => {
  let limiter: InMemoryRateLimiter

  beforeEach(() => {
    limiter = new InMemoryRateLimiter()
  })

  it('declares RATE_LIMITING_MODE as LOCAL_BEST_EFFORT', () => {
    expect(RATE_LIMITING_MODE).toBe('LOCAL_BEST_EFFORT')
  })

  it('allows requests within the limit', async () => {
    const key = 'session_123'
    expect(await limiter.isRateLimited(key, 3, 60)).toBe(false) // hit 1
    expect(await limiter.isRateLimited(key, 3, 60)).toBe(false) // hit 2
    expect(await limiter.isRateLimited(key, 3, 60)).toBe(false) // hit 3
  })

  it('rejects requests exceeding the limit', async () => {
    const key = 'session_456'
    expect(await limiter.isRateLimited(key, 2, 60)).toBe(false) // hit 1
    expect(await limiter.isRateLimited(key, 2, 60)).toBe(false) // hit 2
    expect(await limiter.isRateLimited(key, 2, 60)).toBe(true)  // hit 3 -> limited!
    expect(await limiter.isRateLimited(key, 2, 60)).toBe(true)  // hit 4 -> limited!
  })

  it('isolates rate limits between distinct sessions', async () => {
    const keyA = 'session_A'
    const keyB = 'session_B'

    expect(await limiter.isRateLimited(keyA, 1, 60)).toBe(false)
    expect(await limiter.isRateLimited(keyA, 1, 60)).toBe(true) // keyA limited

    expect(await limiter.isRateLimited(keyB, 1, 60)).toBe(false) // keyB still allowed
  })

  it('clears records upon manual reset', async () => {
    const key = 'session_reset'
    expect(await limiter.isRateLimited(key, 1, 60)).toBe(false)
    expect(await limiter.isRateLimited(key, 1, 60)).toBe(true)

    limiter.reset()

    expect(await limiter.isRateLimited(key, 1, 60)).toBe(false)
  })
})
