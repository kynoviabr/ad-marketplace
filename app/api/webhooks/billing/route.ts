import { NextRequest, NextResponse } from 'next/server'
import { processBillingWebhook } from '@/modules/billing/webhook'

/**
 * Billing Webhook Endpoint — FASE 07
 *
 * Receives provider webhook events, verifies signature,
 * processes idempotently, and applies state transitions.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = Buffer.from(await request.arrayBuffer())
    const signature = request.headers.get('x-webhook-signature') || ''

    const result = await processBillingWebhook(rawBody, signature)

    return NextResponse.json(
      { message: result.message },
      { status: result.status }
    )
  } catch {
    console.error('[webhook:billing] Unhandled processing failure')
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
