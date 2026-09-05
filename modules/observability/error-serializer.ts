import { sanitizeStringValue } from './redaction'
import type { SerializedError } from './types'

export interface ErrorSerializerOptions {
  includeStack?: boolean
  maxStackFrames?: number
}

/**
 * Serializes arbitrary errors into a standardized, safe JSON-compatible structure.
 * Redacts any inline secrets that may appear in error messages or stack traces.
 * Controls stack trace inclusion based on environment (omitted in production by default).
 */
export function serializeError(
  error: unknown,
  options: ErrorSerializerOptions = {}
): SerializedError {
  const isDev = process.env.NODE_ENV !== 'production'
  const shouldIncludeStack = options.includeStack ?? isDev

  if (error instanceof Error) {
    const serialized: SerializedError = {
      name: error.name || 'Error',
      message: sanitizeStringValue(error.message || 'An error occurred'),
    }

    const code = (error as unknown as { code?: unknown; errorCode?: unknown }).code ??
      (error as unknown as { code?: unknown; errorCode?: unknown }).errorCode
    if (typeof code === 'string' || typeof code === 'number') {
      serialized.code = String(code)
    }

    if (shouldIncludeStack && error.stack) {
      const frames = error.stack.split('\n')
      const limit = options.maxStackFrames ?? 6
      const truncatedStack = frames.slice(0, limit).join('\n')
      serialized.stack = sanitizeStringValue(truncatedStack)
    }

    return serialized
  }

  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: sanitizeStringValue(error),
    }
  }

  if (error && typeof error === 'object') {
    const candidate = error as Record<string, unknown>
    const name = typeof candidate.name === 'string' ? candidate.name : 'UnknownError'
    const message = typeof candidate.message === 'string'
      ? sanitizeStringValue(candidate.message)
      : 'Non-standard error object'
    const code = typeof candidate.code === 'string' || typeof candidate.code === 'number'
      ? String(candidate.code)
      : undefined

    return {
      name,
      message,
      ...(code ? { code } : {}),
    }
  }

  return {
    name: 'UnknownError',
    message: sanitizeStringValue(String(error ?? 'Unknown error')),
  }
}
