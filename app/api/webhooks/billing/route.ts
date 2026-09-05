import { NextRequest, NextResponse } from 'next/server'
import { processBillingWebhook } from '@/modules/billing/webhook'
import { logger, getRequestId } from '@/modules/observability'

/**
 * Billing Webhook Endpoint — FASE 07 / PX1A
 *
 * Receives provider webhook events, verifies signature,
 * processes idempotently, and applies state transitions.
 */
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)
  const startTime = Date.now()

  const respond = (body: unknown, status: number) => {
    return NextResponse.json(body, {
      status,
      headers: { 'x-request-id': requestId },
    })
  }

  try {
    const rawBody = Buffer.from(await request.arrayBuffer())
    const signature = request.headers.get('x-webhook-signature') || ''

    const result = await processBillingWebhook(rawBody, signature)
    const durationMs = Date.now() - startTime

    logger.info('billing.webhook.processed', {
      subsystem: 'BILLING',
      requestId,
      outcome: result.status === 200 ? 'SUCCESS' : 'REJECTED',
      durationMs,
      metadata: { status: result.status, message: result.message },
    })

    return respond({ message: result.message }, result.status)
  } catch (err) {
    const durationMs = Date.now() - startTime
    logger.error('billing.webhook.unhandled_failure', {
      subsystem: 'BILLING',
      requestId,
      outcome: 'FAILURE',
      durationMs,
      error: err,
    })

    return respond({ message: 'Internal server error' }, 500)
  }
}
