/**
 * Public Analytics Event Ingestion Route Handler — FASE 09
 *
 * Endpoint: POST /api/analytics/events
 *
 * Validates payloads with strict Zod schemas, enforces local best-effort rate limits,
 * normalizes server attribution, and records events asynchronously.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  IngestionEventPayloadSchema,
  isOccurredAtWithinTolerance,
} from '@/modules/analytics/schemas'
import { defaultRateLimiter } from '@/modules/analytics/rate-limiter'
import { ingestClientEvent } from '@/modules/analytics/write'

export async function POST(req: NextRequest) {
  try {
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

    // 4. Timestamp Sanity Check (±5 minutes tolerance)
    if (!isOccurredAtWithinTolerance(payload.occurred_at)) {
      // Clamp to current server time if clock skew detected
      payload.occurred_at = new Date().toISOString()
    }

    // 5. Server Ingestion & Attribution
    const result = await ingestClientEvent(payload)

    return NextResponse.json({ success: true, ignored: Boolean(result.ignored) }, { status: 200 })
  } catch (err: any) {
    console.error('[api:analytics:events] Ingestion error:', err?.message)
    // Fail-safe response — never expose internal errors to client
    return NextResponse.json({ success: true }, { status: 200 })
  }
}
