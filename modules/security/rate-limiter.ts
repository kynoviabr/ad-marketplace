/**
 * Distributed Rate Limiter — PX7 Cybersecurity & Abuse Intelligence
 *
 * Provides atomic, distributed rate limiting backed by PostgreSQL storage
 * (table `public.distributed_rate_limits` + RPC `public.check_rate_limit`).
 *
 * Operational Mode: DISTRIBUTED_ATOMIC
 * Shared across all Next.js / Vercel runtime instances and serverless functions.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/modules/observability/logger'

export interface DistributedRateLimitOptions {
  /**
   * If true, blocks the request if the rate limiter backend fails/times out.
   * Default: false (fail-open for normal web browsing/analytics, fail-closed for expensive AI/auth).
   */
  failClosed?: boolean
}

// In-memory fallback cache for resiliency
const localFallbackMap = new Map<string, { count: number; expiresAt: number }>()

/**
 * Checks and increments rate limit counter across all distributed application instances.
 *
 * @param key Unique rate limit bucket key (e.g. `concierge:turn:${conversationId}`)
 * @param limit Maximum number of hits allowed within window
 * @param windowSeconds Duration of the rate limit window in seconds
 * @param options Fail-safe configuration
 * @returns true if the request SHOULD BE BLOCKED, false if ALLOWED
 */
export async function isDistributedRateLimited(
  key: string,
  limit: number,
  windowSeconds: number,
  options?: DistributedRateLimitOptions
): Promise<boolean> {
  const failClosed = options?.failClosed ?? false

  try {
    const admin = createAdminClient()
    const { data: isBlocked, error } = await admin.rpc('check_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })

    if (error) {
      logger.warn('security.rate_limiter.backend_error', {
        subsystem: 'SYSTEM',
        outcome: 'FAILURE',
        metadata: { key, error: error.message },
      })
      return checkLocalFallback(key, limit, windowSeconds, failClosed)
    }

    return Boolean(isBlocked)
  } catch (err) {
    logger.warn('security.rate_limiter.unexpected_failure', {
      subsystem: 'SYSTEM',
      outcome: 'FAILURE',
      metadata: { key, error: err instanceof Error ? err.message : String(err) },
    })
    return checkLocalFallback(key, limit, windowSeconds, failClosed)
  }
}

function checkLocalFallback(
  key: string,
  limit: number,
  windowSeconds: number,
  failClosed: boolean
): boolean {
  if (failClosed) {
    // Fail-closed policy for high-risk operations
    return true
  }

  const now = Date.now()
  const record = localFallbackMap.get(key)
  if (!record || record.expiresAt < now) {
    localFallbackMap.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 })
    return false
  }

  if (record.count >= limit) {
    return true
  }

  record.count += 1
  return false
}

/**
 * Resets a rate limit bucket. Intended for testing and automated harnesses.
 */
export async function resetDistributedRateLimit(key: string): Promise<void> {
  localFallbackMap.delete(key)
  try {
    const admin = createAdminClient()
    await admin
      .from('distributed_rate_limits')
      .delete()
      .eq('bucket_key', key)
  } catch {
    // Ignore cleanup errors
  }
}
