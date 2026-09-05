import 'server-only'

/**
 * OAuth & Authentication Trusted Origin Resolver
 *
 * Enforces server-authoritative origin resolution for OAuth callbacks and auth redirects.
 * Request headers (Host, X-Forwarded-Host, Forwarded, etc.) are NEVER consulted.
 *
 * Rules:
 * - Origin is resolved strictly from server-validated configuration (APP_URL / NEXT_PUBLIC_APP_URL).
 * - Production: protocol must be 'https:'. Localhost HTTP is disallowed.
 * - Non-production (development, test): 'https:' is allowed, and 'http:' is allowed ONLY for localhost, 127.0.0.1, or ::1.
 * - Must not contain credentials (user/password), search queries, hashes, or non-root path components.
 * - Fails closed by throwing Error('INVALID_APP_ORIGIN') if invalid.
 */

/**
 * Validates that a redirect path is an internal relative path.
 *
 * Rejects:
 * - null, undefined, empty, or whitespace-only strings
 * - Protocol-relative URLs: '//evil.com', '/\\evil.com'
 * - Any path containing backslashes ('\')
 * - Absolute URLs with schemes: 'https://...', 'http://...', 'javascript:...'
 * - Control characters or carriage returns / newlines
 * - Paths that resolve outside the root
 */
export function isSafeInternalRedirectPath(next: string | null | undefined): next is string {
  if (!next || typeof next !== 'string') return false
  const trimmed = next.trim()
  if (trimmed !== next) return false
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return false
  }
  if (trimmed.includes('\\')) {
    return false
  }
  // Reject ASCII control characters
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return false
  }
  // Reject unsafe characters outside standard path/query/fragment set
  if (!/^\/[a-zA-Z0-9/_\-?#=&%]*$/.test(trimmed)) {
    return false
  }
  // Verify with URL constructor against a dummy origin that it does not escape
  try {
    const dummyOrigin = 'https://velvet.internal'
    const resolved = new URL(trimmed, dummyOrigin)
    if (resolved.origin !== dummyOrigin) {
      return false
    }
    if (!resolved.pathname.startsWith('/') || resolved.pathname.startsWith('//')) {
      return false
    }
  } catch {
    return false
  }
  return true
}

/**
 * Resolves and validates the trusted application origin.
 * Request headers are NEVER consulted.
 */
export function resolveTrustedAuthOrigin(
  configuredAppUrl?: string,
  nodeEnv?: 'development' | 'production' | 'test' | string
): string {
  const envAppUrl =
    configuredAppUrl !== undefined
      ? configuredAppUrl
      : (typeof process !== 'undefined'
          ? process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'
          : 'http://localhost:3000')

  const envNodeEnv = (
    nodeEnv !== undefined
      ? nodeEnv
      : (typeof process !== 'undefined' ? process.env.NODE_ENV || 'development' : 'development')
  ) as 'development' | 'production' | 'test'

  if (typeof envAppUrl !== 'string' || !envAppUrl || envAppUrl !== envAppUrl.trim()) {
    throw new Error('INVALID_APP_ORIGIN')
  }

  let parsed: URL
  try {
    parsed = new URL(envAppUrl)
  } catch {
    throw new Error('INVALID_APP_ORIGIN')
  }

  const isProduction = envNodeEnv === 'production'
  const isLocalhost =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '::1' ||
    parsed.hostname === '[::1]'

  const isAllowedDevHttp = !isProduction && parsed.protocol === 'http:' && isLocalhost
  const isAllowedHttps = parsed.protocol === 'https:'

  if (!isAllowedHttps && !isAllowedDevHttp) {
    throw new Error('INVALID_APP_ORIGIN')
  }

  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    (parsed.pathname !== '/' && parsed.pathname !== '')
  ) {
    throw new Error('INVALID_APP_ORIGIN')
  }

  return parsed.origin
}

/**
 * Resolves the canonical server-authoritative trusted origin from environment.
 */
export function getTrustedAuthCallbackOrigin(): string {
  return resolveTrustedAuthOrigin()
}
