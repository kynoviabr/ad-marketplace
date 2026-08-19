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

/**
 * Pre-production blocker marker — F11-SEC-007
 *
 * Set to `true` only after replacing InMemoryRateLimiter with a distributed
 * backend (e.g. Redis / Upstash). Until then this flag signals that IP-based
 * rate limiting is LOCAL_BEST_EFFORT and NOT globally enforced across multiple
 * server instances.
 */
export const DISTRIBUTED_RATE_LIMITING_READY = false as const

/**
 * IP-source rate limiter — F11-SEC-007
 *
 * A dedicated limiter instance for per-IP analytics rate limiting.
 * Intentionally separate from the session-based `defaultRateLimiter` so that
 * IP and session limits can be tuned and reset independently.
 *
 * LOCAL_BEST_EFFORT mode — not globally distributed across multiple instances.
 * Each server process maintains its own in-memory window; a load-balanced
 * deployment will apply the limit per-process, not globally. Replace with a
 * distributed adapter before scaling beyond a single instance.
 */
export const ipSourceRateLimiter: RateLimiter = new InMemoryRateLimiter()
