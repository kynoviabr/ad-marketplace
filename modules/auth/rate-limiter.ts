/**
 * Auth Rate Limiter — FASE 11
 *
 * Application-level rate limiting for authentication endpoints.
 * Uses IP-derived HMAC keys (never raw IPs) to avoid account enumeration.
 *
 * Operational Mode: LOCAL_BEST_EFFORT
 * NOT globally distributed across multiple instances.
 *
 * PRE-PRODUCTION BLOCKER: DISTRIBUTED_AUTH_RATE_LIMITING_READY = false
 * For multi-instance production deployments, replace with a Redis/KV adapter.
 */
import { createHmac } from 'node:crypto'

export const DISTRIBUTED_AUTH_RATE_LIMITING_READY = false as const

// Limits per IP-derived key per window
export const AUTH_RATE_LIMITS = {
  LOGIN: { limit: 10, windowSeconds: 900 },           // 10 attempts / 15 min
  SIGNUP: { limit: 5, windowSeconds: 3600 },           // 5 attempts / hour
  PASSWORD_RESET: { limit: 5, windowSeconds: 900 },   // 5 attempts / 15 min
} as const

const rateLimitStore = new Map<string, { count: number; expiresAt: number }>()

/**
 * Derives a rate-limit key from a raw IP address.
 * Uses HMAC-SHA256 so the raw IP is never stored or logged.
 * Returns null if the secret is not configured.
 */
export function deriveAuthRateLimitKey(
  rawIp: string | null | undefined,
  secret: string
): string | null {
  if (!rawIp) return null
  return createHmac('sha256', secret).update(rawIp.trim()).digest('hex')
}

/**
 * Check and increment the rate limit counter for a given key and action.
 * Returns true if the request SHOULD BE BLOCKED.
 *
 * IMPORTANT: Key must be an HMAC-derived key, never the raw IP.
 */
export function isAuthRateLimited(
  derivedKey: string,
  action: keyof typeof AUTH_RATE_LIMITS
): boolean {
  const { limit, windowSeconds } = AUTH_RATE_LIMITS[action]
  const storeKey = `auth:${action}:${derivedKey}`
  const now = Date.now()
  const record = rateLimitStore.get(storeKey)

  if (!record || record.expiresAt < now) {
    rateLimitStore.set(storeKey, { count: 1, expiresAt: now + windowSeconds * 1000 })
    return false
  }

  if (record.count >= limit) return true

  record.count += 1
  return false
}

/** Test helper: reset all rate limit state. */
export function resetAuthRateLimitStore(): void {
  rateLimitStore.clear()
}
