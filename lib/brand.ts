/**
 * Brand Configuration
 *
 * Single canonical source of truth for the marketplace brand name.
 *
 * Architecture:
 * - Reads MARKETPLACE_NAME from environment (server-side only).
 * - Development: falls back to 'Marketplace' placeholder if not set, with a console warning.
 * - Production: throws at call time if MARKETPLACE_NAME is not configured.
 *
 * Usage in Server Components:
 *   import { getMarketplaceName } from '@/lib/brand'
 *   const name = getMarketplaceName()
 *
 * Usage in Client Components:
 *   Receive `brandName` as a prop from a parent Server Component.
 *   Do NOT import this module in Client Components — it reads server env vars.
 *
 * Security note:
 * - MARKETPLACE_NAME is NOT a secret. It is the consumer-facing brand name.
 * - It MUST NOT be prefixed with NEXT_PUBLIC_ to avoid hardcoding it in the
 *   client bundle (the brand may change before production launch).
 * - Pass to client as a prop from Server Components.
 */

const PLACEHOLDER = 'Marketplace'

/**
 * Returns the configured marketplace brand name.
 *
 * - In development/staging: returns MARKETPLACE_NAME or 'Marketplace' fallback.
 * - In production: throws if MARKETPLACE_NAME is not configured.
 */
export function getMarketplaceName(): string {
  const configured = process.env.MARKETPLACE_NAME?.trim()

  if (configured) {
    return configured
  }

  // Strict production enforcement
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[brand] MARKETPLACE_NAME environment variable is required in production. ' +
        'Set it to the final consumer-facing brand name before deploying.'
    )
  }

  // Development/staging fallback — warn once per process startup
  if (typeof globalThis !== 'undefined' && !(globalThis as any).__brandWarned) {
    ;(globalThis as any).__brandWarned = true
    console.warn(
      `[brand] MARKETPLACE_NAME not set — using placeholder "${PLACEHOLDER}". ` +
        'Set MARKETPLACE_NAME in .env.local for development.'
    )
  }

  return PLACEHOLDER
}
