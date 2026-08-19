/**
 * Analytics Rate Limiter Boundary — FASE 09
 *
 * Pluggable abstraction for event ingestion rate limiting.
 * DEV/MVP implementation uses an in-memory sliding window.
 *
 * Operational Mode: LOCAL_BEST_EFFORT
 * For production scale, replace the backend implementation with a distributed
 * KV or Redis adapter without altering the event ingestion domain.
 */

export interface RateLimiter {
  isRateLimited(key: string, limit: number, windowSeconds: number): Promise<boolean>
  reset(): void
}

export class InMemoryRateLimiter implements RateLimiter {
  private hits = new Map<string, { count: number; expiresAt: number }>()

  async isRateLimited(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const now = Date.now()
    const record = this.hits.get(key)

    if (!record || record.expiresAt < now) {
      this.hits.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 })
      return false
    }

    if (record.count >= limit) {
      return true
    }

    record.count += 1
    return false
  }

  reset(): void {
    this.hits.clear()
  }
}

export const RATE_LIMITING_MODE = 'LOCAL_BEST_EFFORT' as const

export const defaultRateLimiter: RateLimiter = new InMemoryRateLimiter()
