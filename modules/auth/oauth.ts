import 'server-only'

/**
 * Google OAuth Cryptographic Intent & Verification Module — R11.5A
 *
 * Provides cryptographic intent signing and verification for OAuth workflows.
 * Ensures strict role isolation between ADVERTISER ("Quero anunciar") and
 * CLIENT ("Quero acessar como cliente") so that OAuth can NEVER escalate,
 * default an ambiguous user, or alter an existing account role.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

export type OAuthIntent = 'ADVERTISER' | 'CLIENT' | 'LOGIN'

interface OAuthIntentPayload {
  intent: OAuthIntent
  nonce: string
  exp: number
}

function getOAuthSecret(): string {
  return (
    process.env.AUTH_INTENT_SECRET ||
    process.env.ANALYTICS_RATE_LIMIT_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'velvet-oauth-intent-dev-fallback'
  )
}

/**
 * Creates a signed token embedding the user's explicit intent.
 * Token format: `<base64url(payload)>.<base64url(hmac-sha256)>`
 */
export function createSignedOAuthIntent(intent: OAuthIntent): string {
  const payload: OAuthIntentPayload = {
    intent,
    nonce: Math.random().toString(36).slice(2) + Date.now().toString(36),
    exp: Date.now() + 10 * 60 * 1000, // 10 minutes TTL
  }
  const serialized = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const secret = getOAuthSecret()
  const sig = createHmac('sha256', secret).update(serialized).digest('base64url')
  return `${serialized}.${sig}`
}

/**
 * Validates the signed intent cookie.
 * Returns the verified intent if signature and timestamp are valid.
 * Returns null on any tampering, expiration, or invalid shape (fail-closed).
 */
export function verifyOAuthIntentCookie(cookieValue: string | null | undefined): OAuthIntent | null {
  if (!cookieValue || typeof cookieValue !== 'string') return null
  const parts = cookieValue.split('.')
  if (parts.length !== 2) return null
  const [serialized, sig] = parts
  if (!serialized || !sig) return null

  const secret = getOAuthSecret()
  const expectedSig = createHmac('sha256', secret).update(serialized).digest('base64url')

  // Timing-safe comparison to prevent timing attacks
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expectedSig)
  if (sigBuf.length !== expectedBuf.length) return null
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null

  try {
    const jsonStr = Buffer.from(serialized, 'base64url').toString('utf-8')
    const payload = JSON.parse(jsonStr) as OAuthIntentPayload
    if (!payload || typeof payload !== 'object') return null
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
    if (payload.intent !== 'ADVERTISER' && payload.intent !== 'CLIENT' && payload.intent !== 'LOGIN') {
      return null
    }
    return payload.intent
  } catch {
    return null
  }
}
