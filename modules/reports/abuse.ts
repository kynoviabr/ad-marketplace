import 'server-only'
import { createHmac } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Generates a pseudonymous, non-reversible abuse key for the reporter.
 * Strictly uses HMAC-SHA256 with a server-side pepper from environment variables.
 * Never persists raw IP addresses.
 */
export function generateReporterHash(ip: string): string {
  const pepper = process.env.ABUSE_PEPPER
  if (!pepper) {
    throw new Error(
      '[abuse] ABUSE_PEPPER environment variable is not set. ' +
        'This variable is required for reporter hash generation. ' +
        'Generate a value with: openssl rand -hex 32'
    )
  }
  const normalizedIp = (ip || '127.0.0.1').trim().toLowerCase()

  return createHmac('sha256', pepper).update(normalizedIp).digest('hex')
}

export interface RateLimitCheckResult {
  allowed: boolean
  deduplicated?: boolean
  error?: string
}

/**
 * Validates submission rate limits and deduplicates identical reports within 24 hours.
 */
export async function checkReportRateLimit(
  reporterHash: string,
  profileId?: string | null,
  mediaId?: string | null
): Promise<RateLimitCheckResult> {
  const admin = createAdminClient()

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // 1. Check hourly rate limit (max 5 reports per hour per hash)
  const { count: hourlyCount, error: countError } = await admin
    .from('content_reports')
    .select('id', { count: 'exact', head: true })
    .eq('reporter_hash', reporterHash)
    .gte('created_at', oneHourAgo)

  if (!countError && typeof hourlyCount === 'number' && hourlyCount >= 5) {
    return {
      allowed: false,
      error: 'Limite de denúncias atingido. Por favor, aguarde antes de enviar novamente.',
    }
  }

  // 2. Check 24-hour deduplication for identical target
  let dedupeQuery = admin
    .from('content_reports')
    .select('id')
    .eq('reporter_hash', reporterHash)
    .gte('created_at', twentyFourHoursAgo)
    .limit(1)

  if (profileId) {
    dedupeQuery = dedupeQuery.eq('profile_id', profileId)
  } else if (mediaId) {
    dedupeQuery = dedupeQuery.eq('media_id', mediaId)
  }

  const { data: existingReport } = await dedupeQuery.maybeSingle()

  if (existingReport) {
    // Deduplicated silently: return as accepted without inserting duplicate
    return {
      allowed: false,
      deduplicated: true,
    }
  }

  return { allowed: true }
}
