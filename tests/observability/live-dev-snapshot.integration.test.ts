/**
 * Live DEV Integration Test: getSystemHealthSnapshot
 *
 * Runs against authorized DEV Supabase (mwzlunkkyigxzjpnybxj).
 */
import { describe, it, expect } from 'vitest'
import { getSystemHealthSnapshot } from '@/modules/observability/health'

describe('PX1B Live DEV System Health Snapshot', () => {
  it('evaluates all 7 canonical probes against live DEV environment', async () => {
    const startTime = Date.now()
    const snapshot = await getSystemHealthSnapshot({
      correlationId: 'dev-val-live-001',
      timeoutMs: 5000,
    })
    const totalElapsed = Date.now() - startTime

    console.log('\n==================================================')
    console.log('LIVE DEV SYSTEM HEALTH SNAPSHOT REPORT')
    console.log('==================================================')
    console.log('Overall Status:', snapshot.status)
    console.log('Total Latency (ms):', snapshot.totalLatencyMs)
    console.log('Summary:', JSON.stringify(snapshot.summary, null, 2))
    console.log('Probes Breakdown:')
    for (const [name, probe] of Object.entries(snapshot.probes)) {
      console.log(`- ${name} [${probe.subsystem}]: status=${probe.status}, mode=${probe.mode}, crit=${probe.criticality}, latency=${probe.latencyMs}ms, reason=${probe.reasonCode}`)
      if (probe.message) console.log(`    message: ${probe.message}`)
      if (probe.metadata) console.log(`    metadata:`, JSON.stringify(probe.metadata))
    }
    console.log('==================================================\n')

    expect(snapshot).toBeDefined()
    expect(snapshot.summary.totalCount).toBe(7)
    expect(snapshot.probes['supabase-database']).toBeDefined()
    expect(snapshot.probes['supabase-auth']).toBeDefined()
    expect(snapshot.probes['supabase-storage']).toBeDefined()
    expect(snapshot.probes['didit-kyc']).toBeDefined()
    expect(snapshot.probes['billing-provider']).toBeDefined()
    expect(snapshot.probes['email-otp']).toBeDefined()
    expect(snapshot.probes['app-config']).toBeDefined()

    // Critical subsystem: database probe should be healthy against DEV DB
    expect(snapshot.probes['supabase-database'].status).toBe('HEALTHY')
    expect(snapshot.probes['supabase-auth'].status).toBe('HEALTHY')
  })
})
