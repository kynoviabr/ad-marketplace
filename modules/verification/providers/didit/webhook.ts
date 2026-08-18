import { createHmac, timingSafeEqual } from 'node:crypto'
import type { ParsedWebhookEvent } from '../interface'
import { DiditWebhookPayloadSchema } from '../../schemas'

export interface DiditWebhookVerifierOptions {
  secret: string
  maxDriftSeconds?: number
}

/**
 * Verifies Didit webhook authenticity using X-Signature-V2 and HMAC-SHA256.
 */
export function verifyDiditWebhookSignature(
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>,
  options: DiditWebhookVerifierOptions
): ParsedWebhookEvent | null {
  const { secret, maxDriftSeconds = 300 } = options

  if (!secret) {
    return null
  }

  // 1. Extract signature
  const signatureHeader = headers['x-signature-v2'] || headers['X-Signature-V2']
  if (!signatureHeader || typeof signatureHeader !== 'string') {
    return null
  }

  // 2. Validate timestamp drift if present
  const timestampHeader = headers['x-timestamp'] || headers['X-Timestamp']
  if (timestampHeader && typeof timestampHeader === 'string') {
    const timestampMs = Number(timestampHeader) * (timestampHeader.length === 10 ? 1000 : 1)
    if (!Number.isNaN(timestampMs)) {
      const diffSeconds = Math.abs(Date.now() - timestampMs) / 1000
      if (diffSeconds > maxDriftSeconds) {
        return null // Timestamp drift exceeded
      }
    }
  }

  // 3. Compute expected HMAC-SHA256 signature
  const cleanSignature = signatureHeader.replace(/^sha256=/, '').trim()
  const expectedHex = createHmac('sha256', secret).update(rawBody).digest('hex')

  const expectedBuf = Buffer.from(expectedHex, 'utf8')
  const receivedBuf = Buffer.from(cleanSignature, 'utf8')

  if (expectedBuf.length !== receivedBuf.length) {
    return null
  }

  if (!timingSafeEqual(expectedBuf, receivedBuf)) {
    return null
  }

  // 4. Parse payload safely
  try {
    const parsedJson = JSON.parse(rawBody.toString('utf8'))
    const validated = DiditWebhookPayloadSchema.safeParse(parsedJson)
    if (!validated.success) {
      return null
    }

    return {
      eventId: validated.data.event_id,
      sessionId: validated.data.data.session_id,
      rawStatus: validated.data.data.status,
      vendorData: validated.data.data.vendor_data,
      eventType: validated.data.webhook_type,
    }
  } catch {
    return null
  }
}
