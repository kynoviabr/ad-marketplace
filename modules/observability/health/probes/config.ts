/**
 * Application Configuration Health Probe — PX1B
 *
 * Validates baseline environment variables and runtime secrets required
 * for secure platform operations.
 *
 * Operational Mode: CONFIG_ONLY
 * Criticality: CRITICAL
 */

import type { HealthProbe, HealthProbeResult } from '../types'

export const configProbe: HealthProbe = {
  name: 'app-config',
  subsystem: 'SYSTEM',
  criticality: 'CRITICAL',
  mode: 'CONFIG_ONLY',

  async execute(): Promise<HealthProbeResult> {
    const startTime = Date.now()

    const checks = {
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      hasAbusePepper: Boolean(process.env.ABUSE_PEPPER),
    }

    const criticalMissing: string[] = []
    if (!checks.hasSupabaseUrl) criticalMissing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!checks.hasAnonKey) criticalMissing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    if (!checks.hasServiceRoleKey) criticalMissing.push('SUPABASE_SERVICE_ROLE_KEY')

    const warningMissing: string[] = []
    if (!checks.hasAbusePepper) warningMissing.push('ABUSE_PEPPER')

    const latencyMs = Date.now() - startTime

    if (criticalMissing.length > 0) {
      return {
        name: 'app-config',
        subsystem: 'SYSTEM',
        status: 'UNHEALTHY',
        criticality: 'CRITICAL',
        mode: 'CONFIG_ONLY',
        reasonCode: 'CONFIG_MISSING',
        message: `Missing critical environment variables: ${criticalMissing.join(', ')}`,
        latencyMs,
        timestamp: new Date().toISOString(),
        metadata: {
          ...checks,
          missingCount: criticalMissing.length + warningMissing.length,
        },
      }
    }

    if (warningMissing.length > 0) {
      return {
        name: 'app-config',
        subsystem: 'SYSTEM',
        status: 'DEGRADED',
        criticality: 'CRITICAL',
        mode: 'CONFIG_ONLY',
        reasonCode: 'CONFIG_MISSING',
        message: `Missing operational environment variables: ${warningMissing.join(', ')}`,
        latencyMs,
        timestamp: new Date().toISOString(),
        metadata: {
          ...checks,
          missingCount: warningMissing.length,
        },
      }
    }

    return {
      name: 'app-config',
      subsystem: 'SYSTEM',
      status: 'HEALTHY',
      criticality: 'CRITICAL',
      mode: 'CONFIG_ONLY',
      reasonCode: 'OK',
      latencyMs,
      timestamp: new Date().toISOString(),
      metadata: {
        ...checks,
        missingCount: 0,
      },
    }
  },
}
