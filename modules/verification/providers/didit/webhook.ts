import { createHmac, timingSafeEqual } from 'node:crypto'
import type { ParsedWebhookEvent } from '../interface'
import { DiditWebhookPayloadSchema } from '../../schemas'

export interface DiditWebhookVerifierOptions {
  secret: string
  maxDriftSeconds?: number
  now?: () => number
}

/**
 * Recursively sorts object keys while preserving array order and JSON value types.
 * JSON.stringify then produces Didit's compact, Unicode-preserved V2 form.
 */
function canonicalizeDiditV3(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeDiditV3)
  }

  if (value !== null && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((sorted, key) => {
        sorted[key] = canonicalizeDiditV3((value as Record<string, unknown>)[key])
        return sorted
      }, {})
  }

  return value
}

/** Verifies Didit v3 X-Signature-V2 using its canonical JSON contract. */
export function verifyDiditWebhookSignature(
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>,
  options: DiditWebhookVerifierOptions
): ParsedWebhookEvent | null {
  const { secret, maxDriftSeconds = 300, now = Date.now } = options

  if (!secret) {
    return null
  }

  // 1. Extract signature
  const signatureHeader = headers['x-signature-v2'] || headers['X-Signature-V2']
  if (!signatureHeader || typeof signatureHeader !== 'string') {
    return null
  }

  // 2. X-Timestamp is mandatory Unix epoch seconds and bounds replay exposure.
  const timestampHeader = headers['x-timestamp'] || headers['X-Timestamp']
  if (typeof timestampHeader !== 'string' || !/^\d+$/.test(timestampHeader)) {
    return null
  }

  const timestampSeconds = Number(timestampHeader)
  if (!Number.isSafeInteger(timestampSeconds)) {
    return null
  }

  const diffSeconds = Math.abs(Math.floor(now() / 1000) - timestampSeconds)
  if (diffSeconds > maxDriftSeconds) {
    return null
  }

  // 3. Parse the captured raw bytes once, then reproduce Didit's V2 canonical JSON.
  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return null
  }

  const canonicalJson = JSON.stringify(canonicalizeDiditV3(parsedJson))
  const expectedHex = createHmac('sha256', secret).update(canonicalJson, 'utf8').digest('hex')

  const expectedBuf = Buffer.from(expectedHex, 'utf8')
  const receivedBuf = Buffer.from(signatureHeader.trim(), 'utf8')

  if (expectedBuf.length !== receivedBuf.length) {
    return null
  }

  if (!timingSafeEqual(expectedBuf, receivedBuf)) {
    return null
  }

  // 4. Validate and normalize the current v3 envelope (plus the legacy shape).
  const validated = DiditWebhookPayloadSchema.safeParse(parsedJson)
  if (!validated.success) {
    return null
  }

  return {
    eventId: validated.data.event_id,
    sessionId: validated.data.session_id,
    rawStatus: validated.data.status,
    vendorData: validated.data.vendor_data,
    eventType: validated.data.webhook_type,
  }
}
