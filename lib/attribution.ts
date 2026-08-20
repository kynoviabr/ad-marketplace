/**
 * Attribution Token Utilities
 *
 * Implements signed HMAC-SHA256 attribution tokens for the WhatsApp
 * conversion flow. Architecture frozen in FASE 12.1A.
 *
 * Token contract:
 * - Format: base64url(payload):base64url(signature)
 * - Payload: JSON { slug, ts } where ts is Unix timestamp (seconds)
 * - Signing: HMAC-SHA256 using ATTRIBUTION_SIGNING_SECRET
 * - TTL: 10 minutes (600 seconds)
 * - Verification: constant-time comparison to prevent timing attacks
 *
 * This module is server-only. Never import in Client Components.
 * The signed token string may be passed to the client as a prop,
 * but signing and verification always happen server-side.
 *
 * FASE 12.2A: Foundation prepared. Actual WhatsApp redirect Route Handler
 * (/go/whatsapp/[slug]) will be implemented in FASE 12.2E.
 *
 * Safety guarantee:
 * - signAttributionToken() and verifyAttributionToken() throw if
 *   ATTRIBUTION_SIGNING_SECRET is not configured.
 * - isAttributionConfigured() can be checked before calling sign/verify.
 * - The public shell (Header/Footer) does NOT require attribution config.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

const TOKEN_TTL_SECONDS = 600 // 10 minutes — frozen in FASE 12.1A

function getSigningSecret(): string {
  const secret = process.env.ATTRIBUTION_SIGNING_SECRET
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      '[attribution] ATTRIBUTION_SIGNING_SECRET is not configured or is too short (minimum 32 chars). ' +
        'Set it before using WhatsApp conversion features.'
    )
  }
  return secret.trim()
}

/**
 * Returns true if ATTRIBUTION_SIGNING_SECRET is configured.
 * Use to guard attribution operations without throwing.
 */
export function isAttributionConfigured(): boolean {
  const secret = process.env.ATTRIBUTION_SIGNING_SECRET
  return Boolean(secret && secret.trim().length >= 32)
}

/**
 * Signs an attribution token for the given profile slug.
 * Returns a token string to be included as ?t= in the WhatsApp redirect URL.
 */
export function signAttributionToken(slug: string): string {
  const secret = getSigningSecret()
  const ts = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({ slug, ts })).toString('base64url')
  const sig = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}:${sig}`
}

/**
 * Verifies an attribution token.
 * Returns the decoded payload { slug, ts } if valid, or null if invalid/expired.
 *
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyAttributionToken(
  token: string,
  expectedSlug: string
): { slug: string; ts: number } | null {
  const secret = getSigningSecret()

  const parts = token.split(':')
  if (parts.length !== 2) return null

  const [payload, receivedSig] = parts

  // Recompute expected signature
  const expectedSig = createHmac('sha256', secret).update(payload).digest('base64url')

  // Constant-time comparison
  const expectedBuf = Buffer.from(expectedSig)
  const receivedBuf = Buffer.from(receivedSig)

  if (expectedBuf.length !== receivedBuf.length) return null

  try {
    if (!timingSafeEqual(expectedBuf, receivedBuf)) return null
  } catch {
    return null
  }

  // Decode and validate payload
  let parsed: { slug?: string; ts?: number }
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return null
  }

  if (typeof parsed.slug !== 'string' || typeof parsed.ts !== 'number') return null
  if (parsed.slug !== expectedSlug) return null

  // Check TTL
  const now = Math.floor(Date.now() / 1000)
  if (now - parsed.ts > TOKEN_TTL_SECONDS) return null

  return { slug: parsed.slug, ts: parsed.ts }
}
