import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import type { ParsedWebhookEvent } from '../interface'
import { DiditWebhookPayloadSchema } from '../../schemas'

export interface DiditWebhookVerifierOptions {
  secret: string
  maxDriftSeconds?: number
  now?: () => number
  logger?: (diagnostic: DiditAuthDiagnostic) => void
}

export type DiditAuthDiagnosticCategory =
  | 'DIDIT_AUTH_MISSING_V2_SIGNATURE'
  | 'DIDIT_AUTH_INVALID_V2_FORMAT'
  | 'DIDIT_AUTH_MISSING_TIMESTAMP'
  | 'DIDIT_AUTH_INVALID_TIMESTAMP_FORMAT'
  | 'DIDIT_AUTH_STALE_TIMESTAMP'
  | 'DIDIT_AUTH_SIGNATURE_LENGTH_MISMATCH'
  | 'DIDIT_AUTH_HMAC_MISMATCH'
  | 'DIDIT_AUTH_INVALID_JSON'
  | 'DIDIT_AUTH_SCHEMA_REJECTED'
  | 'DIDIT_AUTH_OK'

export interface DiditAuthDiagnostic {
  category: DiditAuthDiagnosticCategory
  signatureV2Exists: boolean
  receivedSignatureLength: number | null
  calculatedSignatureLength: number | null
  signatureLengthsMatch: boolean | null
  timingSafeComparisonMatched: boolean | null
  timestampExists: boolean
  receivedTimestamp: number | null
  currentEpochSeconds: number
  timestampDeltaSeconds: number | null
  diditWebhookSecretConfigured: boolean
  diditWebhookSecretLength: number
}

/** Match Didit's recursive numeric-normalization pass before key sorting. */
function shortenDiditFloats(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(shortenDiditFloats)
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        shortenDiditFloats(item),
      ])
    )
  }

  if (typeof value === 'number' && Number.isFinite(value) && value % 1 === 0) {
    return Math.trunc(value)
  }

  return value
}

/** Recursively sort object keys while preserving arrays, empty maps and nulls. */
function sortDiditKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortDiditKeys)
  }

  if (value !== null && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((sorted, key) => {
        sorted[key] = sortDiditKeys((value as Record<string, unknown>)[key])
        return sorted
      }, {})
  }

  return value
}

/** Reproduce Didit's official Node V2 pipeline exactly. */
export function canonicalizeDiditV3(value: unknown): string {
  return JSON.stringify(sortDiditKeys(shortenDiditFloats(value)))
}

/** Verifies Didit v3 X-Signature-V2 using its canonical JSON contract. */
export function verifyDiditWebhookSignature(
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>,
  options: DiditWebhookVerifierOptions
): ParsedWebhookEvent | null {
  const {
    secret,
    maxDriftSeconds = 300,
    now = Date.now,
    logger = (diagnostic) => console.info('[webhook:didit:auth]', diagnostic),
  } = options
  const currentEpochSeconds = Math.floor(now() / 1000)
  const baseDiagnostic: Omit<DiditAuthDiagnostic, 'category'> = {
    signatureV2Exists: false,
    receivedSignatureLength: null,
    calculatedSignatureLength: null,
    signatureLengthsMatch: null,
    timingSafeComparisonMatched: null,
    timestampExists: false,
    receivedTimestamp: null,
    currentEpochSeconds,
    timestampDeltaSeconds: null,
    diditWebhookSecretConfigured: secret.length > 0,
    diditWebhookSecretLength: secret.length,
  }
  let diagnostic = baseDiagnostic
  const reject = (
    category: Exclude<DiditAuthDiagnosticCategory, 'DIDIT_AUTH_OK'>,
    details: Partial<Omit<DiditAuthDiagnostic, 'category'>> = {}
  ): null => {
    logger({ category, ...diagnostic, ...details })
    return null
  }

  // 1. Extract signature
  const signatureHeader = headers['x-signature-v2'] || headers['X-Signature-V2']
  if (!signatureHeader || typeof signatureHeader !== 'string') {
    return reject('DIDIT_AUTH_MISSING_V2_SIGNATURE')
  }
  diagnostic = {
    ...diagnostic,
    signatureV2Exists: true,
    receivedSignatureLength: signatureHeader.length,
  }
  if (signatureHeader.length !== 64) {
    return reject('DIDIT_AUTH_SIGNATURE_LENGTH_MISMATCH', {
      calculatedSignatureLength: 64,
      signatureLengthsMatch: false,
    })
  }
  if (!/^[a-f0-9]{64}$/i.test(signatureHeader)) {
    return reject('DIDIT_AUTH_INVALID_V2_FORMAT', {
      calculatedSignatureLength: 64,
      signatureLengthsMatch: true,
    })
  }

  // 2. X-Timestamp is mandatory Unix epoch seconds and bounds replay exposure.
  const timestampHeader = headers['x-timestamp'] || headers['X-Timestamp']
  if (typeof timestampHeader !== 'string' || timestampHeader.length === 0) {
    return reject('DIDIT_AUTH_MISSING_TIMESTAMP')
  }
  diagnostic = { ...diagnostic, timestampExists: true }
  if (!/^\d+$/.test(timestampHeader)) {
    return reject('DIDIT_AUTH_INVALID_TIMESTAMP_FORMAT')
  }

  const timestampSeconds = Number(timestampHeader)
  if (!Number.isSafeInteger(timestampSeconds)) {
    return reject('DIDIT_AUTH_INVALID_TIMESTAMP_FORMAT')
  }

  const diffSeconds = Math.abs(currentEpochSeconds - timestampSeconds)
  diagnostic = {
    ...diagnostic,
    receivedTimestamp: timestampSeconds,
    timestampDeltaSeconds: diffSeconds,
  }
  if (diffSeconds > maxDriftSeconds) {
    return reject('DIDIT_AUTH_STALE_TIMESTAMP')
  }

  // 3. Parse the captured raw bytes once, then reproduce Didit's V2 canonical JSON.
  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return reject('DIDIT_AUTH_INVALID_JSON')
  }

  if (!secret) {
    return reject('DIDIT_AUTH_HMAC_MISMATCH')
  }

  const canonicalJson = canonicalizeDiditV3(parsedJson)
  const expectedHex = createHmac('sha256', secret).update(canonicalJson, 'utf8').digest('hex')

  const expectedBuf = Buffer.from(expectedHex, 'utf8')
  const receivedBuf = Buffer.from(signatureHeader, 'utf8')
  diagnostic = {
    ...diagnostic,
    calculatedSignatureLength: expectedHex.length,
    signatureLengthsMatch: expectedBuf.length === receivedBuf.length,
  }

  if (expectedBuf.length !== receivedBuf.length) {
    return reject('DIDIT_AUTH_SIGNATURE_LENGTH_MISMATCH')
  }

  const signaturesMatch = timingSafeEqual(expectedBuf, receivedBuf)
  diagnostic = { ...diagnostic, timingSafeComparisonMatched: signaturesMatch }
  if (!signaturesMatch) {
    return reject('DIDIT_AUTH_HMAC_MISMATCH')
  }

  // 4. Validate and normalize the current v3 envelope (plus the legacy shape).
  const validated = DiditWebhookPayloadSchema.safeParse(parsedJson)
  if (!validated.success) {
    return reject('DIDIT_AUTH_SCHEMA_REJECTED')
  }

  logger({ category: 'DIDIT_AUTH_OK', ...diagnostic })

  // Current Didit v3 destination events carry event_id. Some authenticated Try
  // Webhook envelopes omit it, so derive a retry-stable ledger key exclusively
  // from non-PII event coordinates. The schema requires created_at in that case.
  const eventId = validated.data.event_id ?? createHash('sha256')
    .update([
      'didit-v3',
      validated.data.webhook_type,
      validated.data.session_id,
      String(validated.data.created_at),
    ].join(':'), 'utf8')
    .digest('hex')

  return {
    eventId,
    sessionId: validated.data.session_id,
    rawStatus: validated.data.status,
    vendorData: validated.data.vendor_data,
    eventType: validated.data.webhook_type,
  }
}
