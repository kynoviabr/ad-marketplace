import { NextResponse } from 'next/server'
import { logger, getRequestId } from '@/modules/observability'

/**
 * GET /api/health
 *
 * Health check endpoint for the AD-Marketplace application.
 *
 * SECURITY:
 * - Never returns secrets, credentials, or service role keys.
 * - Never returns database connection strings.
 * - Only returns safe operational status information.
 * - Emits canonical x-request-id response header.
 *
 * Response shape:
 *   { status: 'ok' | 'degraded', timestamp: string, configuration: { supabase: string } }
 */
export async function GET(request?: Request): Promise<NextResponse> {
  const requestId = getRequestId(request)

  try {
    // Check if essential public configuration exists (without revealing values)
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
        configuration: {
          supabase: configurationReady ? 'configured' : 'missing-env-vars',
        },
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
        configuration: {
          supabase: 'check-failed',
        },
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
