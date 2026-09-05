/**
 * Observability Types — PX1A Foundation
 *
 * Defines the taxonomy, event shapes, log levels, and serialization contracts
 * for Velvet structured server-side logging and request correlation.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

export type Subsystem =
  | 'AUTH'
  | 'DATABASE'
  | 'STORAGE'
  | 'KYC'
  | 'BILLING'
  | 'MEDIA'
  | 'PUBLICATION'
  | 'ADMIN'
  | 'EMAIL_OTP'
  | 'AI'
  | 'AGENDA'
  | 'SYSTEM'

export type LogOutcome = 'SUCCESS' | 'FAILURE' | 'REJECTED' | 'SKIPPED' | 'RECOVERED'

export interface SerializedError {
  name: string
  message: string
  code?: string
  stack?: string
}

export interface LogEvent {
  timestamp: string
  level: LogLevel
  event: string
  subsystem: Subsystem
  requestId?: string
  operationId?: string
  route?: string
  durationMs?: number
  outcome?: LogOutcome
  errorCode?: string
  metadata?: Record<string, unknown>
  error?: SerializedError
}

export interface LogEventInput {
  subsystem: Subsystem
  requestId?: string
  operationId?: string
  route?: string
  durationMs?: number
  outcome?: LogOutcome
  errorCode?: string
  metadata?: Record<string, unknown>
  error?: unknown
}

export type LogSink = (entry: LogEvent) => void
