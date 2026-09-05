/**
 * Auth Subsystem Health Probe — PX1B
 *
 * Verifies Supabase Auth configuration readiness and client initialization.
 * Zero synthetic user creation, zero test token generation.
 *
 * Operational Mode: CONFIG_ONLY
 * Criticality: CRITICAL
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { HealthProbe, HealthProbeResult } from '../types'

export const authProbe: HealthProbe = {
  name: 'supabase-auth',
  subsystem: 'AUTH',
  criticality: 'CRITICAL',
  mode: 'CONFIG_ONLY',

  async execute(): Promise<HealthProbeResult> {
    const startTime = Date.now()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return {
        name: 'supabase-auth',
        subsystem: 'AUTH',
        status: 'UNHEALTHY',
        criticality: 'CRITICAL',
        mode: 'CONFIG_ONLY',
        reasonCode: 'CONFIG_MISSING',
        message: 'Auth configuration missing required environment variables',
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        metadata: {
          hasSupabaseUrl: Boolean(supabaseUrl),
          hasAnonKey: Boolean(anonKey),
          hasServiceRoleKey: Boolean(serviceRoleKey),
        },
      }
    }

    try {
      new URL(supabaseUrl)
    } catch {
      return {
        name: 'supabase-auth',
        subsystem: 'AUTH',
        status: 'UNHEALTHY',
        criticality: 'CRITICAL',
        mode: 'CONFIG_ONLY',
        reasonCode: 'CONFIG_INVALID',
        message: 'NEXT_PUBLIC_SUPABASE_URL is not a valid URL',
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }
    }

    try {
      const admin = createAdminClient()
      const authAvailable = Boolean(admin && admin.auth && typeof admin.auth.getUser === 'function')

      if (!authAvailable) {
        return {
          name: 'supabase-auth',
          subsystem: 'AUTH',
          status: 'UNHEALTHY',
          criticality: 'CRITICAL',
          mode: 'CONFIG_ONLY',
          reasonCode: 'AUTH_NOT_VERIFIABLE',
          message: 'Supabase admin auth client failed to initialize',
          latencyMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        }
      }

      return {
        name: 'supabase-auth',
        subsystem: 'AUTH',
        status: 'HEALTHY',
        criticality: 'CRITICAL',
        mode: 'CONFIG_ONLY',
        reasonCode: 'OK',
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        metadata: {
          authServiceReady: true,
          adminClientReady: true,
        },
      }
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime
      const message = err instanceof Error ? err.message : 'Auth probe failed to initialize client'

      return {
        name: 'supabase-auth',
        subsystem: 'AUTH',
        status: 'UNHEALTHY',
        criticality: 'CRITICAL',
        mode: 'CONFIG_ONLY',
        reasonCode: 'AUTH_NOT_VERIFIABLE',
        message,
        latencyMs,
        timestamp: new Date().toISOString(),
      }
    }
  },
}
