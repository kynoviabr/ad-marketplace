/**
 * Concierge Rate Limiter — PX7 Cybersecurity & Abuse Intelligence
 *
 * Operational Mode: DISTRIBUTED_ATOMIC (PostgreSQL RPC + in-memory fast-path)
 * Enforced across all Next.js serverless instances.
 */
import { isDistributedRateLimited } from '@/modules/security/rate-limiter'

export const DISTRIBUTED_CONCIERGE_RATE_LIMITING_READY = true as const

export const CONCIERGE_RATE_LIMITS = {
  CONVERSATION_TURN: { limit: 20, windowSeconds: 3600 }, // 20 turns / hour per conversation
  SESSION_BURST: { limit: 40, windowSeconds: 3600 },      // 40 turns / hour per visitor session
} as const

interface RateLimitRecord {
  count: number
  expiresAt: number
}

const rateLimitStore = new Map<string, RateLimitRecord>()

/**
 * Checks and increments rate limit counter for a server-authoritative key.
 * Returns true if request should be BLOCKED.
 */
export function isConciergeRateLimited(
  key: string,
  limitType: keyof typeof CONCIERGE_RATE_LIMITS = 'CONVERSATION_TURN'
): boolean {
  const { limit, windowSeconds } = CONCIERGE_RATE_LIMITS[limitType]
  const storeKey = `concierge:${limitType}:${key}`
  const now = Date.now()
  const record = rateLimitStore.get(storeKey)

  if (!record || record.expiresAt < now) {
    rateLimitStore.set(storeKey, { count: 1, expiresAt: now + windowSeconds * 1000 })
    return false
  }

  if (record.count >= limit) {
    return true
  }

  record.count += 1
  return false
}

/**
 * Checks and increments distributed rate limit counter across instances.
 */
export async function isConciergeDistributedRateLimited(
  key: string,
  limitType: keyof typeof CONCIERGE_RATE_LIMITS = 'CONVERSATION_TURN'
): Promise<boolean> {
  const { limit, windowSeconds } = CONCIERGE_RATE_LIMITS[limitType]
  const storeKey = `concierge:${limitType}:${key}`
  return isDistributedRateLimited(storeKey, limit, windowSeconds, { failClosed: true })
}

/**
 * Test helper to reset the rate limit store.
 */
export function resetConciergeRateLimitStore(): void {
  rateLimitStore.clear()
}
