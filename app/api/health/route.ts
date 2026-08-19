import { NextResponse } from 'next/server'

/**
 * GET /api/health
 *
 * Health check endpoint for the AD-Marketplace application.
 *
 * SECURITY:
 * - Never returns secrets, credentials, or service role keys.
 * - Never returns database connection strings.
 * - Only returns safe operational status information.
 *
 * Response shape:
 *   { status: 'ok' | 'degraded', timestamp: string, configuration: { supabase: string } }
 */
export async function GET(): Promise<NextResponse> {
  // Check if essential public configuration exists (without revealing values)
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const hasSupabaseAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const configurationReady = hasSupabaseUrl && hasSupabaseAnonKey

  const status = configurationReady ? 'ok' : 'degraded'

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
      },
    }
  )
}
