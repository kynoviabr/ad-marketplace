/**
 * Sensitive Data Redaction Utility — PX1A Foundation
 *
 * Recursively inspects and sanitizes metadata payloads before structured log emission.
 * Enforces strict Zero-Trust redaction on credentials, tokens, secrets, KYC documents,
 * payment identifiers, and personal data.
 *
 * Protects against recursion loops, deep nesting, and memory exhaustion.
 */

export const REDACTED_MARKER = '[REDACTED]' as const
export const CIRCULAR_MARKER = '[CIRCULAR]' as const
export const DEPTH_LIMIT_MARKER = '[DEPTH_LIMIT_EXCEEDED]' as const

const MAX_RECURSION_DEPTH = 6
const MAX_STRING_LENGTH = 2000
const MAX_ARRAY_LENGTH = 50
const MAX_OBJECT_KEYS = 100

/**
 * Known safe suffixes/names that contain 'code' or 'document' but are NOT sensitive.
 */
const SAFE_CODE_PATTERNS = new Set([
  'statuscode',
  'httpstatuscode',
  'errorcode',
  'reasoncode',
  'currencycode',
  'countrycode',
  'postalcode',
  'zipcode',
  'geocode',
  'languagecode',
  'citycode',
  'statecode',
  'areacode',
])

const SAFE_DOCUMENT_PATTERNS = new Set([
  'documentation',
  'documenttype',
  'documentsstatus',
])

/**
 * Checks whether an object property key corresponds to sensitive data.
 * Matching is case-insensitive and normalizes hyphens and underscores.
 */
export function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-_]/g, '')

  // 1. Safe exceptions that contain substrings like 'code' or 'document'
  if (SAFE_CODE_PATTERNS.has(normalized)) return false
  if (SAFE_DOCUMENT_PATTERNS.has(normalized)) return false

  // 2. High-risk explicit credentials and secrets
  if (
    normalized.includes('password') ||
    normalized.includes('passwd') ||
    normalized.includes('secret') ||
    normalized.includes('token') ||
    normalized.includes('cookie') ||
    normalized.includes('authorization') ||
    normalized.includes('apikey') ||
    normalized.includes('servicerole') ||
    normalized.includes('privatekey') ||
    normalized.includes('pepper')
  ) {
    return true
  }

  // 3. Sensitive authentication codes (excluding the safe codes handled above)
  if (
    normalized === 'code' ||
    normalized.endsWith('code') &&
    (normalized.includes('auth') ||
      normalized.includes('oauth') ||
      normalized.includes('otp') ||
      normalized.includes('verify') ||
      normalized.includes('verification') ||
      normalized.includes('security') ||
      normalized.includes('access'))
  ) {
    return true
  }

  // 4. One-Time Passwords
  if (normalized.includes('otp') || normalized === 'totp' || normalized === 'hotp') {
    return true
  }

  // 5. KYC and Legal identification
  if (
    normalized === 'cpf' ||
    normalized.includes('cpf') ||
    normalized === 'cnpj' ||
    normalized.includes('cnpj') ||
    normalized === 'document' ||
    normalized.endsWith('document') ||
    normalized.includes('documentnumber') ||
    normalized.includes('iddocument')
  ) {
    return true
  }

  // 6. Payment and banking details
  if (
    normalized === 'card' ||
    normalized.includes('creditcard') ||
    normalized.includes('cardnumber') ||
    normalized === 'cvv' ||
    normalized === 'cvc' ||
    normalized === 'pin'
  ) {
    return true
  }

  // 7. Direct contact PII
  if (
    normalized === 'email' ||
    normalized.endsWith('email') ||
    normalized.includes('phone') ||
    normalized.includes('whatsapp') ||
    normalized.includes('telefone') ||
    normalized.includes('celular')
  ) {
    return true
  }

  return false
}

const BEARER_PREFIX_REGEX = /^Bearer\s+/i
const CPF_FORMAT_REGEX = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/
const JWT_PATTERN_REGEX = /^[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}$/
const INLINE_SECRET_REGEX = /\b(token|secret|password|apikey|key)\s+([^\s,;]+)/gi
const SUPABASE_KEY_REGEX = /\b(sbp_|service_role_)[a-zA-Z0-9_-]+/gi

/**
 * Inspects a string value for inline bearer tokens, JWT signatures, formatted CPFs, or secrets.
 */
export function sanitizeStringValue(val: string): string {
  if (val.length > MAX_STRING_LENGTH) {
    return val.slice(0, MAX_STRING_LENGTH) + '...[TRUNCATED]'
  }
  if (BEARER_PREFIX_REGEX.test(val)) {
    return 'Bearer [REDACTED]'
  }
  if (CPF_FORMAT_REGEX.test(val)) {
    return '[REDACTED_CPF]'
  }
  if (JWT_PATTERN_REGEX.test(val)) {
    return '[REDACTED_JWT]'
  }
  let sanitized = val
  if (SUPABASE_KEY_REGEX.test(sanitized)) {
    sanitized = sanitized.replace(SUPABASE_KEY_REGEX, '$1[REDACTED]')
  }
  if (INLINE_SECRET_REGEX.test(sanitized)) {
    sanitized = sanitized.replace(INLINE_SECRET_REGEX, '$1 [REDACTED]')
  }
  return sanitized
}

/**
 * Recursively sanitizes any arbitrary metadata payload.
 * Safe against circular references, depth limits, and excessive payload sizes.
 */
export function redactMetadata(
  value: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet<object>()
): unknown {
  if (value === null || value === undefined) {
    return value
  }

  if (typeof value === 'string') {
    return sanitizeStringValue(value)
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'bigint') {
    return value.toString()
  }

  if (typeof value === 'symbol' || typeof value === 'function') {
    return undefined
  }

  if (depth >= MAX_RECURSION_DEPTH) {
    return DEPTH_LIMIT_MARKER
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      return CIRCULAR_MARKER
    }
    seen.add(value)

    if (value instanceof Date) {
      return value.toISOString()
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: sanitizeStringValue(value.message),
      }
    }

    if (Array.isArray(value)) {
      const sanitizedArray: unknown[] = []
      const len = Math.min(value.length, MAX_ARRAY_LENGTH)
      for (let i = 0; i < len; i++) {
        sanitizedArray.push(redactMetadata(value[i], depth + 1, seen))
      }
      if (value.length > MAX_ARRAY_LENGTH) {
        sanitizedArray.push(`[TRUNCATED: ${value.length - MAX_ARRAY_LENGTH} items omitted]`)
      }
      return sanitizedArray
    }

    // Plain object or Record
    const result: Record<string, unknown> = {}
    const entries = Object.entries(value)
    const len = Math.min(entries.length, MAX_OBJECT_KEYS)

    for (let i = 0; i < len; i++) {
      const [key, val] = entries[i]
      if (isSensitiveKey(key)) {
        result[key] = REDACTED_MARKER
      } else {
        const sanitized = redactMetadata(val, depth + 1, seen)
        if (sanitized !== undefined) {
          result[key] = sanitized
        }
      }
    }

    if (entries.length > MAX_OBJECT_KEYS) {
      result._keys_truncated = `[${entries.length - MAX_OBJECT_KEYS} keys omitted]`
    }

    return result
  }

  return String(value)
}
