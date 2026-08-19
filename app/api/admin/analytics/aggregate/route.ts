/**
 * Admin Daily Metrics Aggregation Route Handler — FASE 09
 *
 * Endpoint: POST /api/admin/analytics/aggregate
 *
 * Protected admin-only endpoint to trigger deterministic daily metrics rollup.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/modules/moderation/guards'
import { aggregateDailyMetrics } from '@/modules/analytics/aggregation'

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    let targetDate: string | undefined
    try {
      const body = await req.json()
      if (body && typeof body.targetDate === 'string') {
        targetDate = body.targetDate
      }
    } catch {
      // Body is optional
    }

    const result = await aggregateDailyMetrics(targetDate)

    return NextResponse.json({ success: true, result }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Unauthorized or aggregation error' },
      { status: err?.message?.includes('Acesso negado') ? 403 : 500 }
    )
  }
}
