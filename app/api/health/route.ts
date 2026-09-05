import { NextResponse } from 'next/server'
import { logger, getRequestId } from '@/modules/observability'

/**
 * GET /api/health
 *
 * Public health check endpoint for the Velvet application.
 *
 * SECURITY & HARDENING (PX1B):
 * - Minimal anonymous contract: status, timestamp, requestId.
 * - Zero leakage of internal provider names, database topology, or secrets.
 * - Zero latency breakdown or internal subsystem details exposed publicly.
 * - Emits canonical x-request-id response header and payload correlation.
 *
 * Response shape:
 *   { status: 'ok' | 'degraded', timestamp: string, requestId: string }
 */
export async function GET(request?: Request): Promise<NextResponse> {
  const requestId = getRequestId(request)

  try {
    // Check baseline public configuration readiness without leaking provider specifics
    const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
    const hasSupabaseAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const configurationReady = hasSupabaseUrl && hasSupabaseAnonKey

    const status = configurationReady ? 'ok' : 'degraded'

    if (status === 'degraded') {
      logger.warn('system.health.degraded', {
        subsystem: 'SYSTEM',
        requestId,
        outcome: 'FAILURE',
        metadata: {
          hasSupabaseUrl,
          hasSupabaseAnonKey,
        },
      })
    }

    return NextResponse.json(
      {
        status,
        timestamp: new Date().toISOString(),
        requestId,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          'x-request-id': requestId,
        },
      }
    )
  } catch (err) {
    logger.error('system.health.check_failed', {
      subsystem: 'SYSTEM',
      requestId,
      outcome: 'FAILURE',
      error: err,
    })

    return NextResponse.json(
      {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        requestId,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          'x-request-id': requestId,
        },
      }
    )
  }
}
