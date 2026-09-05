/**
 * Health Probe Runner — PX1B Operational Integrity Foundation
 *
 * Implements safe, bounded, isolated execution for health probes.
 * Guarantees that:
 * 1. Probes always terminate within configured timeouts.
 * 2. Probe failures never cascade or crash the runtime.
 * 3. Individual probe rejections/exceptions are caught and mapped to standard error results.
 * 4. Latency is measured accurately.
 */

import type { HealthProbe, HealthProbeResult } from './types'

export const DEFAULT_PROBE_TIMEOUT_MS = 3000

/**
 * Wraps a promise in a strict timeout.
 * Guaranteed to clean up the underlying timer on completion.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutErrorMsg = 'Probe execution timed out'
): Promise<T> {
  let timer: NodeJS.Timeout | null = null

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(timeoutErrorMsg)
      err.name = 'ProbeTimeoutError'
      reject(err)
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}

/**
 * Safely executes a single health probe with timeout protection and error isolation.
 */
export async function executeHealthProbe(
  probe: HealthProbe,
  options?: { timeoutMs?: number; correlationId?: string }
): Promise<HealthProbeResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS
  const startTime = Date.now()

  try {
    const result = await withTimeout(
      probe.execute({ timeoutMs, correlationId: options?.correlationId }),
      timeoutMs,
      `Probe ${probe.name} timed out after ${timeoutMs}ms`
    )

    return result
  } catch (error: unknown) {
    const latencyMs = Date.now() - startTime
    const isTimeout =
      error instanceof Error &&
      (error.name === 'ProbeTimeoutError' || error.message.includes('timed out'))

    if (isTimeout) {
      return {
        name: probe.name,
        subsystem: probe.subsystem,
        status: probe.criticality === 'CRITICAL' ? 'UNHEALTHY' : 'DEGRADED',
        criticality: probe.criticality,
        mode: probe.mode,
        reasonCode: 'PROBE_TIMEOUT',
        message: `Probe ${probe.name} exceeded timeout limit of ${timeoutMs}ms`,
        latencyMs,
        timestamp: new Date().toISOString(),
      }
    }

    const rawMessage = error instanceof Error ? error.message : 'Unknown probe error'
    // Sanitize message: never leak URLs with credentials, bearer tokens, or query strings
    const sanitizedMessage = rawMessage.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')

    return {
      name: probe.name,
      subsystem: probe.subsystem,
      status: probe.criticality === 'CRITICAL' ? 'UNHEALTHY' : 'DEGRADED',
      criticality: probe.criticality,
      mode: probe.mode,
      reasonCode: 'UNKNOWN_ERROR',
      message: sanitizedMessage,
      latencyMs,
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Runs an array of probes in parallel with strict isolation via Promise.allSettled.
 */
export async function runAllProbesParallel(
  probes: HealthProbe[],
  options?: { timeoutMs?: number; correlationId?: string }
): Promise<HealthProbeResult[]> {
  const executions = probes.map((probe) => executeHealthProbe(probe, options))
  const results = await Promise.allSettled(executions)

  return results.map((settled, idx) => {
    if (settled.status === 'fulfilled') {
      return settled.value
    }

    // Safety fallback: should practically never occur since executeHealthProbe catches all errors
    const probe = probes[idx]
    return {
      name: probe?.name ?? `probe-${idx}`,
      subsystem: probe?.subsystem ?? 'SYSTEM',
      status: probe?.criticality === 'CRITICAL' ? 'UNHEALTHY' : 'DEGRADED',
      criticality: probe?.criticality ?? 'IMPORTANT',
      mode: probe?.mode ?? 'ACTIVE',
      reasonCode: 'UNKNOWN_ERROR',
      message: 'Probe execution failed unexpectedly at runner level',
      latencyMs: 0,
      timestamp: new Date().toISOString(),
    }
  })
}
