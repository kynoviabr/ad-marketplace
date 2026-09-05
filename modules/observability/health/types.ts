/**
 * Health Probe Types — PX1B Operational Integrity Foundation
 *
 * Defines the contracts, status models, criticality levels, and snapshot shapes
 * for Velvet subsystem health and readiness monitoring.
 */

import type { Subsystem } from '../types'

/**
 * Subsystem operational health status.
 */
export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN'

/**
 * Criticality level of a monitored subsystem.
 *
 * - CRITICAL: System cannot function without this dependency (DB, Auth, Config).
 *   Failure marks overall system UNHEALTHY.
 * - IMPORTANT: Core features are impaired without this dependency (Storage, KYC, Billing, Email).
 *   Failure marks overall system DEGRADED.
 * - INFORMATIONAL: Advisory or background subsystems.
 */
export type ProbeCriticality = 'CRITICAL' | 'IMPORTANT' | 'INFORMATIONAL'

/**
 * Mode of health probe execution.
 *
 * - ACTIVE: Performs a safe, lightweight query or network call against the live service.
 * - PASSIVE: Inspects existing client or memory status without active network calls.
 * - CONFIG_ONLY: Validates environment variables, secrets, and provider setup.
 *   Zero external network calls; never fakes live reachability.
 */
export type HealthProbeMode = 'ACTIVE' | 'PASSIVE' | 'CONFIG_ONLY'

/**
 * Standardized reason codes for health probe results.
 */
export type ProbeReasonCode =
  | 'OK'
  | 'CONFIG_MISSING'
  | 'CONFIG_INVALID'
  | 'DEPENDENCY_UNREACHABLE'
  | 'PROBE_TIMEOUT'
  | 'AUTH_NOT_VERIFIABLE'
  | 'STORAGE_UNAVAILABLE'
  | 'DATABASE_QUERY_FAILED'
  | 'PROVIDER_ERROR'
  | 'UNKNOWN_ERROR'

/**
 * Result of executing an individual health probe.
 */
export interface HealthProbeResult {
  /** Identifier of the probe */
  name: string
  /** Platform subsystem monitored */
  subsystem: Subsystem
  /** Subsystem operational status */
  status: HealthStatus
  /** Architectural criticality */
  criticality: ProbeCriticality
  /** Mode of probe execution */
  mode: HealthProbeMode
  /** Standard reason code */
  reasonCode: ProbeReasonCode
  /** Non-sensitive human-readable message */
  message?: string
  /** Elapsed execution time in milliseconds */
  latencyMs: number
  /** ISO 8601 timestamp of probe completion */
  timestamp: string
  /** Safe diagnostic metadata (strictly sanitized, zero credentials) */
  metadata?: Record<string, unknown>
}

/**
 * Interface representing a health probe definition.
 */
export interface HealthProbe {
  readonly name: string
  readonly subsystem: Subsystem
  readonly criticality: ProbeCriticality
  readonly mode: HealthProbeMode
  execute: (context?: { timeoutMs?: number; correlationId?: string }) => Promise<HealthProbeResult>
}

/**
 * Aggregated summary counts across all executed probes.
 */
export interface HealthSummary {
  healthyCount: number
  degradedCount: number
  unhealthyCount: number
  unknownCount: number
  totalCount: number
}

/**
 * Full system health snapshot across all monitored subsystems.
 * Used by admin dashboards, internal monitoring, and operator diagnostics.
 */
export interface SystemHealthSnapshot {
  /** Overall platform status derived from probe results and criticality */
  status: HealthStatus
  /** ISO 8601 timestamp of snapshot creation */
  timestamp: string
  /** Total elapsed time in milliseconds to evaluate all probes */
  totalLatencyMs: number
  /** Breakdown counts by status */
  summary: HealthSummary
  /** Individual probe results keyed by probe name */
  probes: Record<string, HealthProbeResult>
  /** Correlation ID for tracing (propagated from caller or generated) */
  correlationId?: string
}

/**
 * Options for configuring snapshot execution.
 */
export interface HealthSnapshotOptions {
  /** Maximum timeout in milliseconds per probe (default: 3000ms) */
  timeoutMs?: number
  /** Request/Operation correlation ID */
  correlationId?: string
  /** Override probe list (useful for testing) */
  probes?: HealthProbe[]
}
