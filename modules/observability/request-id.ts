import 'server-only'
import { randomUUID } from 'node:crypto'

export const CANONICAL_REQUEST_ID_HEADER = 'x-request-id' as const

/**
 * Strict validation regex for request IDs.
 * Allows standard UUIDs and safe alphanumeric/hyphen/underscore trace IDs (8–64 characters).
 * Strictly rejects control characters, newlines, quotes, HTML tags, and arbitrary injection payloads.
 */
const SAFE_REQUEST_ID_REGEX = /^[a-zA-Z0-9_-]{8,64}$/

/**
 * Validates whether an incoming request ID string conforms to the safe identifier contract.
 */
export function isValidRequestId(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  return SAFE_REQUEST_ID_REGEX.test(trimmed)
}

/**
 * Generates a new cryptographically secure UUID v4 request ID.
 */
export function generateRequestId(): string {
  return randomUUID()
}

/**
 * Resolves an incoming request ID candidate.
 * Preserves the candidate if valid and safe; generates a new UUID if missing, invalid, or dangerous.
 */
export function resolveCanonicalRequestId(candidate?: string | null): string {
  if (candidate && isValidRequestId(candidate)) {
    return candidate.trim()
  }
  return generateRequestId()
}

/**
 * Retrieves or generates a canonical request ID from an existing Request or Headers object.
 */
export function getRequestId(source?: Request | Headers | null): string {
  if (!source) return generateRequestId()
  if (source instanceof Headers) {
    return resolveCanonicalRequestId(source.get(CANONICAL_REQUEST_ID_HEADER))
  }
  return resolveCanonicalRequestId(source.headers.get(CANONICAL_REQUEST_ID_HEADER))
}

/**
 * Server-only helper to read the request ID within Server Components, Server Actions,
 * or Route Handlers via Next.js `headers()`.
 * Safely falls back to a fresh UUID if called outside an active request context (e.g., tests, background workers).
 */
export async function resolveServerRequestId(): Promise<string> {
  try {
    const { headers } = await import('next/headers')
    const h = await headers()
    const id = h.get(CANONICAL_REQUEST_ID_HEADER)
    if (id && isValidRequestId(id)) {
      return id.trim()
    }
  } catch {
    // Outside active Next.js request lifecycle
  }
  return generateRequestId()
}

/**
 * Generates a correlation identifier for asynchronous or background operations
 * that execute outside of an incoming HTTP request boundary.
 */
export function createOperationId(prefix: string = 'op'): string {
  return `${prefix}-${randomUUID()}`
}
