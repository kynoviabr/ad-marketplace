import { redactMetadata } from './redaction'
import { serializeError } from './error-serializer'
import type { LogEvent, LogEventInput, LogLevel, LogSink, Subsystem } from './types'

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
}

function resolveMinimumLogLevel(): number {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase()
  if (envLevel && envLevel in LOG_LEVEL_PRIORITY) {
    return LOG_LEVEL_PRIORITY[envLevel as LogLevel]
  }
  return process.env.NODE_ENV === 'production'
    ? LOG_LEVEL_PRIORITY.INFO
    : LOG_LEVEL_PRIORITY.DEBUG
}

const defaultConsoleSink: LogSink = (entry: LogEvent) => {
  const line = JSON.stringify(entry)
  if (entry.level === 'ERROR') {
    console.error(line)
  } else if (entry.level === 'WARN') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

let activeSink: LogSink = defaultConsoleSink

/**
 * Configure an external or custom sink (useful for unit tests and future telemetry providers).
 */
export function setLogSink(sink: LogSink | null): void {
  activeSink = sink ?? defaultConsoleSink
}

/**
 * Resets the log sink to stdout/stderr JSON console output.
 */
export function resetLogSink(): void {
  activeSink = defaultConsoleSink
}

/**
 * Emits a structured log event if the level meets or exceeds the active threshold.
 */
export function logEvent(
  level: LogLevel,
  event: string,
  input: LogEventInput
): LogEvent | null {
  const minLevel = resolveMinimumLogLevel()
  if (LOG_LEVEL_PRIORITY[level] < minLevel) {
    return null
  }

  const logEntry: LogEvent = {
    timestamp: new Date().toISOString(),
    level,
    event,
    subsystem: input.subsystem,
  }

  if (input.requestId) logEntry.requestId = input.requestId
  if (input.operationId) logEntry.operationId = input.operationId
  if (input.route) logEntry.route = input.route
  if (typeof input.durationMs === 'number') logEntry.durationMs = input.durationMs
  if (input.outcome) logEntry.outcome = input.outcome
  if (input.errorCode) logEntry.errorCode = input.errorCode

  if (input.metadata && Object.keys(input.metadata).length > 0) {
    logEntry.metadata = redactMetadata(input.metadata) as Record<string, unknown>
  }

  if (input.error !== undefined && input.error !== null) {
    logEntry.error = serializeError(input.error)
  }

  activeSink(logEntry)
  return logEntry
}

/**
 * Canonical structured server logger for Velvet.
 */
export const logger = {
  debug(event: string, input: LogEventInput): LogEvent | null {
    return logEvent('DEBUG', event, input)
  },
  info(event: string, input: LogEventInput): LogEvent | null {
    return logEvent('INFO', event, input)
  },
  warn(event: string, input: LogEventInput): LogEvent | null {
    return logEvent('WARN', event, input)
  },
  error(event: string, input: LogEventInput): LogEvent | null {
    return logEvent('ERROR', event, input)
  },
}
