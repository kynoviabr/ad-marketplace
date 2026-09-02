/**
 * Public Analytics Event Ingestion Route Handler — FASE 09
 *
 * Endpoint: POST /api/analytics/events
 *
 * Validates payloads with strict Zod schemas, enforces local best-effort rate limits,
 * normalizes server attribution, and records events asynchronously.
 */

import { createHmac } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import {
  IngestionEventPayloadSchema,
  isOccurredAtWithinTolerance,
} from '@/modules/analytics/schemas'
import { defaultRateLimiter, ipSourceRateLimiter } from '@/modules/analytics/rate-limiter'
import { ingestClientEvent } from '@/modules/analytics/write'
import { CONSENT_COOKIE, parseConsent } from '@/lib/compliance/consent'

/**
 * Derives a rate-limiting key from the request IP address — F11-SEC-007
 *
 * The raw IP is NEVER stored or returned; it is transformed into an
 * HMAC-SHA256 digest keyed by ANALYTICS_RATE_LIMIT_SECRET so that:
 *   - The key is deterministic per IP (enables rate limiting)
 *   - The key is non-reversible (cannot be used to recover the real IP)
 *
 * Fail-open semantics:
 *   - Production: logs a warning and returns null if the secret is absent
 *     (analytics is observational; a missing secret should not break ingestion)
 *   - Development: silently returns null if no secret is configured
 *     (IP rate limiting is skipped during local development)
 */
function deriveIpKey(req: NextRequest): string | null {
  try {
    const secret = process.env.ANALYTICS_RATE_LIMIT_SECRET

    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        console.warn(
          '[api:analytics:events] ANALYTICS_RATE_LIMIT_SECRET is not set. ' +
            'IP-based rate limiting is disabled. Set this variable to enable it.'
        )
      }
      // Fail open — skip IP rate limiting when secret is absent
      return null
    }

    const rawIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null

    if (!rawIp) {
      return null
    }

    // Hash the IP — never use or store the raw value
    return createHmac('sha256', secret).update(rawIp).digest('hex')
  } catch {
    // Never let IP key derivation break the request
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    if (parseConsent(req.cookies.get(CONSENT_COOKIE)?.value)?.analytics !== true) {
      return NextResponse.json({ success: true, ignored: true }, { status: 200 })
    }
    // 1. Payload size protection (4KB max)
    const rawText = await req.text()
    if (rawText.length > 4096) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    let rawJson: any
    try {
      rawJson = JSON.parse(rawText)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // 2. Strict Zod Validation (rejects unknown fields, campaign ID injections, etc.)
    const parseResult = IngestionEventPayloadSchema.safeParse(rawJson)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Malformed analytics payload',
          fieldErrors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const payload = parseResult.data

    // 3. Best-Effort Local Rate Limiting (50 events/session/hour)
    const isLimited = await defaultRateLimiter.isRateLimited(
      payload.visitor_session_id,
      50,
      3600
    )
    if (isLimited) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    // 4. IP-Derived Rate Limiting (300 events/IP/hour) — F11-SEC-007
    // Analytics failures must NEVER bubble up to break search — wrapped in try/catch.
    try {
      const ipKey = deriveIpKey(req)
      if (ipKey !== null) {
        const isIpLimited = await ipSourceRateLimiter.isRateLimited(ipKey, 300, 3600)
        if (isIpLimited) {
          return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
        }
      }
    } catch (ipErr: any) {
      // Fail open — log and continue; never break analytics ingestion
      console.warn('[api:analytics:events] IP rate limit check failed:', ipErr?.message)
    }

    // 5. Timestamp Sanity Check (±5 minutes tolerance)
    if (!isOccurredAtWithinTolerance(payload.occurred_at)) {
      // Clamp to current server time if clock skew detected
      payload.occurred_at = new Date().toISOString()
    }

    // 6. Server Ingestion & Attribution
    const result = await ingestClientEvent(payload)

    return NextResponse.json({ success: true, ignored: Boolean(result.ignored) }, { status: 200 })
  } catch (err: any) {
    console.error('[api:analytics:events] Ingestion error:', err?.message)
    // Fail-safe response — never expose internal errors to client
    return NextResponse.json({ success: true }, { status: 200 })
  }
}
