/**
 * System Health Snapshot Aggregator — PX1B Operational Integrity Foundation
 *
 * Runs all registered subsystem health probes concurrently with timeout protection,
 * aggregates results according to criticality rules, emits structured observability logs,
 * and produces a comprehensive snapshot for operators and admin interfaces.
 */

import { logger } from '../logger'
import { runAllProbesParallel } from './runner'
import type {
  HealthProbe,
  HealthProbeResult,
  HealthSnapshotOptions,
  HealthStatus,
  SystemHealthSnapshot,
} from './types'

import { databaseProbe } from './probes/database'
import { authProbe } from './probes/auth'
import { storageProbe } from './probes/storage'
import { diditProbe } from './probes/didit'
import { billingProbe } from './probes/billing'
import { emailOtpProbe } from './probes/email-otp'
import { configProbe } from './probes/config'

/**
 * Canonical suite of platform health probes.
 */
export const CANONICAL_HEALTH_PROBES: HealthProbe[] = [
  databaseProbe,
  authProbe,
  storageProbe,
  diditProbe,
  billingProbe,
  emailOtpProbe,
  configProbe,
]

/**
 * Computes overall platform status from probe results according to criticality.
 */
export function aggregateHealthStatus(results: HealthProbeResult[]): HealthStatus {
  if (results.length === 0) return 'UNKNOWN'

  const criticalProbes = results.filter((r) => r.criticality === 'CRITICAL')
  const importantProbes = results.filter((r) => r.criticality === 'IMPORTANT')

  // Rule 1: Any CRITICAL probe UNHEALTHY => system is UNHEALTHY
  if (criticalProbes.some((r) => r.status === 'UNHEALTHY')) {
    return 'UNHEALTHY'
  }

  // Rule 2: Any CRITICAL probe DEGRADED => system is DEGRADED
  if (criticalProbes.some((r) => r.status === 'DEGRADED')) {
    return 'DEGRADED'
  }

  // Rule 3: Any IMPORTANT probe UNHEALTHY or DEGRADED => system is DEGRADED
  if (importantProbes.some((r) => r.status === 'UNHEALTHY' || r.status === 'DEGRADED')) {
    return 'DEGRADED'
  }

  // Rule 4: Any probe UNKNOWN => system is DEGRADED (fail-safe alert)
  if (results.some((r) => r.status === 'UNKNOWN')) {
    return 'DEGRADED'
  }

  // Rule 5: All probes HEALTHY => system is HEALTHY
  if (results.every((r) => r.status === 'HEALTHY')) {
    return 'HEALTHY'
  }

  return 'UNKNOWN'
}

/**
 * Evaluates all subsystem health probes and produces a full SystemHealthSnapshot.
 */
export async function getSystemHealthSnapshot(
  options?: HealthSnapshotOptions
): Promise<SystemHealthSnapshot> {
  const startTime = Date.now()
  const correlationId = options?.correlationId
  const probes = options?.probes ?? CANONICAL_HEALTH_PROBES

  const probeResults = await runAllProbesParallel(probes, {
    timeoutMs: options?.timeoutMs,
    correlationId,
  })

  const totalLatencyMs = Date.now() - startTime

  const summary = {
    healthyCount: probeResults.filter((p) => p.status === 'HEALTHY').length,
    degradedCount: probeResults.filter((p) => p.status === 'DEGRADED').length,
    unhealthyCount: probeResults.filter((p) => p.status === 'UNHEALTHY').length,
    unknownCount: probeResults.filter((p) => p.status === 'UNKNOWN').length,
    totalCount: probeResults.length,
  }

  const overallStatus = aggregateHealthStatus(probeResults)

  const probeMap: Record<string, HealthProbeResult> = {}
  for (const probe of probeResults) {
    probeMap[probe.name] = probe
  }

  const snapshot: SystemHealthSnapshot = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    totalLatencyMs,
    summary,
    probes: probeMap,
    correlationId,
  }

  // Emit structured event based on overall platform health
  const logMetadata = {
    status: overallStatus,
    totalLatencyMs,
    healthyCount: summary.healthyCount,
    degradedCount: summary.degradedCount,
    unhealthyCount: summary.unhealthyCount,
    totalCount: summary.totalCount,
  }

  if (overallStatus === 'HEALTHY') {
    logger.info('system.health.snapshot_completed', {
      subsystem: 'SYSTEM',
      requestId: correlationId,
      outcome: 'SUCCESS',
      durationMs: totalLatencyMs,
      metadata: logMetadata,
    })
  } else if (overallStatus === 'DEGRADED') {
    logger.warn('system.health.degraded', {
      subsystem: 'SYSTEM',
      requestId: correlationId,
      outcome: 'FAILURE',
      durationMs: totalLatencyMs,
      metadata: logMetadata,
    })
  } else {
    logger.error('system.health.unhealthy', {
      subsystem: 'SYSTEM',
      requestId: correlationId,
      outcome: 'FAILURE',
      durationMs: totalLatencyMs,
      metadata: logMetadata,
    })
  }

  return snapshot
}
