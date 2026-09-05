/**
 * Database Subsystem Health Probe — PX1B
 *
 * Performs a lightweight, read-only query against the Supabase database
 * to verify schema connectivity, RLS bypass for service role, and query responsiveness.
 *
 * Operational Mode: ACTIVE
 * Criticality: CRITICAL
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { HealthProbe, HealthProbeResult } from '../types'

export const databaseProbe: HealthProbe = {
  name: 'supabase-database',
  subsystem: 'DATABASE',
  criticality: 'CRITICAL',
  mode: 'ACTIVE',

  async execute(): Promise<HealthProbeResult> {
    const startTime = Date.now()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return {
        name: 'supabase-database',
        subsystem: 'DATABASE',
        status: 'UNHEALTHY',
        criticality: 'CRITICAL',
        mode: 'ACTIVE',
        reasonCode: 'CONFIG_MISSING',
        message: 'Database configuration missing (SUPABASE_URL or SERVICE_ROLE_KEY)',
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }
    }

    try {
      const admin = createAdminClient()
      const { error } = await admin
        .from('account_users')
        .select('id', { head: true, count: 'exact' })
        .limit(0)

      const latencyMs = Date.now() - startTime

      if (error) {
        return {
          name: 'supabase-database',
          subsystem: 'DATABASE',
          status: 'UNHEALTHY',
          criticality: 'CRITICAL',
          mode: 'ACTIVE',
          reasonCode: 'DATABASE_QUERY_FAILED',
          message: error.message,
          latencyMs,
          timestamp: new Date().toISOString(),
        }
      }

      return {
        name: 'supabase-database',
        subsystem: 'DATABASE',
        status: 'HEALTHY',
        criticality: 'CRITICAL',
        mode: 'ACTIVE',
        reasonCode: 'OK',
        latencyMs,
        timestamp: new Date().toISOString(),
      }
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime
      const message = err instanceof Error ? err.message : 'Database connection error'

      return {
        name: 'supabase-database',
        subsystem: 'DATABASE',
        status: 'UNHEALTHY',
        criticality: 'CRITICAL',
        mode: 'ACTIVE',
        reasonCode: 'DEPENDENCY_UNREACHABLE',
        message,
        latencyMs,
        timestamp: new Date().toISOString(),
      }
    }
  },
}
