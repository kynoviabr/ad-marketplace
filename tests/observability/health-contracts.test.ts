/**
 * Tests: Health Probes & Operational Contracts — PX1B
 *
 * Verifies probe contracts, runner timeouts, failure isolation,
 * status aggregation rules, latency measurement, and correlation propagation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  aggregateHealthStatus,
  getSystemHealthSnapshot,
  executeHealthProbe,
  withTimeout,
  runAllProbesParallel,
  type HealthProbe,
  type HealthProbeResult,
} from '@/modules/observability/health'
import { logger } from '@/modules/observability/logger'

describe('PX1B: Health Contracts & Subsystem Status Model', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // ---------------------------------------------------------------------------
  // 1. Status Aggregation Logic
  // ---------------------------------------------------------------------------
  describe('aggregateHealthStatus', () => {
    it('returns HEALTHY when all probes are healthy', () => {
      const results: HealthProbeResult[] = [
        {
          name: 'p1',
          subsystem: 'DATABASE',
          status: 'HEALTHY',
          criticality: 'CRITICAL',
          mode: 'ACTIVE',
          reasonCode: 'OK',
          latencyMs: 10,
          timestamp: new Date().toISOString(),
        },
        {
          name: 'p2',
          subsystem: 'STORAGE',
          status: 'HEALTHY',
          criticality: 'IMPORTANT',
          mode: 'ACTIVE',
          reasonCode: 'OK',
          latencyMs: 15,
          timestamp: new Date().toISOString(),
        },
      ]

      expect(aggregateHealthStatus(results)).toBe('HEALTHY')
    })

    it('returns UNHEALTHY when any CRITICAL probe is UNHEALTHY', () => {
      const results: HealthProbeResult[] = [
        {
          name: 'db',
          subsystem: 'DATABASE',
          status: 'UNHEALTHY',
          criticality: 'CRITICAL',
          mode: 'ACTIVE',
          reasonCode: 'DATABASE_QUERY_FAILED',
          latencyMs: 50,
          timestamp: new Date().toISOString(),
        },
        {
          name: 'storage',
          subsystem: 'STORAGE',
          status: 'HEALTHY',
          criticality: 'IMPORTANT',
          mode: 'ACTIVE',
          reasonCode: 'OK',
          latencyMs: 15,
          timestamp: new Date().toISOString(),
        },
      ]

      expect(aggregateHealthStatus(results)).toBe('UNHEALTHY')
    })

    it('returns DEGRADED when a CRITICAL probe is DEGRADED', () => {
      const results: HealthProbeResult[] = [
        {
          name: 'auth',
          subsystem: 'AUTH',
          status: 'DEGRADED',
          criticality: 'CRITICAL',
          mode: 'CONFIG_ONLY',
          reasonCode: 'CONFIG_MISSING',
          latencyMs: 5,
          timestamp: new Date().toISOString(),
        },
        {
          name: 'storage',
          subsystem: 'STORAGE',
          status: 'HEALTHY',
          criticality: 'IMPORTANT',
          mode: 'ACTIVE',
          reasonCode: 'OK',
          latencyMs: 15,
          timestamp: new Date().toISOString(),
        },
      ]

      expect(aggregateHealthStatus(results)).toBe('DEGRADED')
    })

    it('returns DEGRADED when an IMPORTANT probe is UNHEALTHY', () => {
      const results: HealthProbeResult[] = [
        {
          name: 'db',
          subsystem: 'DATABASE',
          status: 'HEALTHY',
          criticality: 'CRITICAL',
          mode: 'ACTIVE',
          reasonCode: 'OK',
          latencyMs: 10,
          timestamp: new Date().toISOString(),
        },
        {
          name: 'storage',
          subsystem: 'STORAGE',
          status: 'UNHEALTHY',
          criticality: 'IMPORTANT',
          mode: 'ACTIVE',
          reasonCode: 'STORAGE_UNAVAILABLE',
          latencyMs: 30,
          timestamp: new Date().toISOString(),
        },
      ]

      expect(aggregateHealthStatus(results)).toBe('DEGRADED')
    })

    it('returns DEGRADED when an IMPORTANT probe is DEGRADED', () => {
      const results: HealthProbeResult[] = [
        {
          name: 'db',
          subsystem: 'DATABASE',
          status: 'HEALTHY',
          criticality: 'CRITICAL',
          mode: 'ACTIVE',
          reasonCode: 'OK',
          latencyMs: 10,
          timestamp: new Date().toISOString(),
        },
        {
          name: 'didit',
          subsystem: 'KYC',
          status: 'DEGRADED',
          criticality: 'IMPORTANT',
          mode: 'CONFIG_ONLY',
          reasonCode: 'CONFIG_MISSING',
          latencyMs: 1,
          timestamp: new Date().toISOString(),
        },
      ]

      expect(aggregateHealthStatus(results)).toBe('DEGRADED')
    })

    it('returns DEGRADED when any probe is UNKNOWN to fail-safe alert operators', () => {
      const results: HealthProbeResult[] = [
        {
          name: 'db',
          subsystem: 'DATABASE',
          status: 'HEALTHY',
          criticality: 'CRITICAL',
          mode: 'ACTIVE',
          reasonCode: 'OK',
          latencyMs: 10,
          timestamp: new Date().toISOString(),
        },
        {
          name: 'custom',
          subsystem: 'SYSTEM',
          status: 'UNKNOWN',
          criticality: 'INFORMATIONAL',
          mode: 'PASSIVE',
          reasonCode: 'UNKNOWN_ERROR',
          latencyMs: 1,
          timestamp: new Date().toISOString(),
        },
      ]

      expect(aggregateHealthStatus(results)).toBe('DEGRADED')
    })
  })

  // ---------------------------------------------------------------------------
  // 2. Runner & Timeout Handling
  // ---------------------------------------------------------------------------
  describe('Probe Runner & Isolation', () => {
    it('completes probe execution and measures latency', async () => {
      const fastProbe: HealthProbe = {
        name: 'fast-test',
        subsystem: 'SYSTEM',
        criticality: 'CRITICAL',
        mode: 'PASSIVE',
        async execute() {
          return {
            name: 'fast-test',
            subsystem: 'SYSTEM',
            status: 'HEALTHY',
            criticality: 'CRITICAL',
            mode: 'PASSIVE',
            reasonCode: 'OK',
            latencyMs: 0,
            timestamp: new Date().toISOString(),
          }
        },
      }

      const result = await executeHealthProbe(fastProbe)
      expect(result.status).toBe('HEALTHY')
      expect(result.reasonCode).toBe('OK')
      expect(result.latencyMs).toBeGreaterThanOrEqual(0)
    })

    it('isolates probe errors and maps them to failure status', async () => {
      const throwingProbe: HealthProbe = {
        name: 'throw-test',
        subsystem: 'DATABASE',
        criticality: 'CRITICAL',
        mode: 'ACTIVE',
        async execute() {
          throw new Error('Connection refused by remote host')
        },
      }

      const result = await executeHealthProbe(throwingProbe)
      expect(result.status).toBe('UNHEALTHY')
      expect(result.reasonCode).toBe('UNKNOWN_ERROR')
      expect(result.message).toContain('Connection refused')
    })

    it('handles probe timeouts gracefully without crashing', async () => {
      const hangingProbe: HealthProbe = {
        name: 'hanging-test',
        subsystem: 'STORAGE',
        criticality: 'IMPORTANT',
        mode: 'ACTIVE',
        async execute() {
          await new Promise((resolve) => setTimeout(resolve, 500))
          return {
            name: 'hanging-test',
            subsystem: 'STORAGE',
            status: 'HEALTHY',
            criticality: 'IMPORTANT',
            mode: 'ACTIVE',
            reasonCode: 'OK',
            latencyMs: 500,
            timestamp: new Date().toISOString(),
          }
        },
      }

      const result = await executeHealthProbe(hangingProbe, { timeoutMs: 50 })
      expect(result.status).toBe('DEGRADED')
      expect(result.reasonCode).toBe('PROBE_TIMEOUT')
      expect(result.message).toContain('exceeded timeout')
    })

    it('executes multiple probes in parallel with Promise.allSettled isolation', async () => {
      const probeOk: HealthProbe = {
        name: 'ok-probe',
        subsystem: 'SYSTEM',
        criticality: 'CRITICAL',
        mode: 'CONFIG_ONLY',
        execute: async () => ({
          name: 'ok-probe',
          subsystem: 'SYSTEM',
          status: 'HEALTHY',
          criticality: 'CRITICAL',
          mode: 'CONFIG_ONLY',
          reasonCode: 'OK',
          latencyMs: 1,
          timestamp: new Date().toISOString(),
        }),
      }

      const probeFail: HealthProbe = {
        name: 'fail-probe',
        subsystem: 'STORAGE',
        criticality: 'IMPORTANT',
        mode: 'ACTIVE',
        execute: async () => {
          throw new Error('Storage down')
        },
      }

      const results = await runAllProbesParallel([probeOk, probeFail])
      expect(results).toHaveLength(2)
      expect(results[0].status).toBe('HEALTHY')
      expect(results[1].status).toBe('DEGRADED')
    })
  })

  // ---------------------------------------------------------------------------
  // 3. Snapshot Aggregator & Observability Integration
  // ---------------------------------------------------------------------------
  describe('getSystemHealthSnapshot', () => {
    it('aggregates custom probes and emits structured log', async () => {
      const logSpy = vi.spyOn(logger, 'info')

      const dummyProbe: HealthProbe = {
        name: 'test-custom',
        subsystem: 'SYSTEM',
        criticality: 'CRITICAL',
        mode: 'CONFIG_ONLY',
        execute: async () => ({
          name: 'test-custom',
          subsystem: 'SYSTEM',
          status: 'HEALTHY',
          criticality: 'CRITICAL',
          mode: 'CONFIG_ONLY',
          reasonCode: 'OK',
          latencyMs: 2,
          timestamp: new Date().toISOString(),
        }),
      }

      const correlationId = 'test-corr-12345'
      const snapshot = await getSystemHealthSnapshot({
        probes: [dummyProbe],
        correlationId,
      })

      expect(snapshot.status).toBe('HEALTHY')
      expect(snapshot.correlationId).toBe(correlationId)
      expect(snapshot.summary.healthyCount).toBe(1)
      expect(snapshot.summary.unhealthyCount).toBe(0)
      expect(snapshot.probes['test-custom']).toBeDefined()
      expect(snapshot.probes['test-custom'].status).toBe('HEALTHY')

      expect(logSpy).toHaveBeenCalledWith(
        'system.health.snapshot_completed',
        expect.objectContaining({
          subsystem: 'SYSTEM',
          requestId: correlationId,
          outcome: 'SUCCESS',
        })
      )
    })
  })
})
