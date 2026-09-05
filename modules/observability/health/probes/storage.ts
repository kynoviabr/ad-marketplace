/**
 * Storage Subsystem Health Probe — PX1B
 *
 * Performs a safe, non-mutating bucket inspection against Supabase Storage.
 * Verifies bucket existence and permissions without file creation, deletion, or modification.
 *
 * Operational Mode: ACTIVE
 * Criticality: IMPORTANT
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { HealthProbe, HealthProbeResult } from '../types'

const MEDIA_BUCKET = 'profile-media'

export const storageProbe: HealthProbe = {
  name: 'supabase-storage',
  subsystem: 'STORAGE',
  criticality: 'IMPORTANT',
  mode: 'ACTIVE',

  async execute(): Promise<HealthProbeResult> {
    const startTime = Date.now()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return {
        name: 'supabase-storage',
        subsystem: 'STORAGE',
        status: 'DEGRADED',
        criticality: 'IMPORTANT',
        mode: 'ACTIVE',
        reasonCode: 'CONFIG_MISSING',
        message: 'Storage credentials missing',
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }
    }

    try {
      const admin = createAdminClient()
      const { data, error } = await admin.storage.getBucket(MEDIA_BUCKET)
      const latencyMs = Date.now() - startTime

      if (error) {
        return {
          name: 'supabase-storage',
          subsystem: 'STORAGE',
          status: 'DEGRADED',
          criticality: 'IMPORTANT',
          mode: 'ACTIVE',
          reasonCode: 'STORAGE_UNAVAILABLE',
          message: error.message,
          latencyMs,
          timestamp: new Date().toISOString(),
          metadata: { bucket: MEDIA_BUCKET },
        }
      }

      return {
        name: 'supabase-storage',
        subsystem: 'STORAGE',
        status: 'HEALTHY',
        criticality: 'IMPORTANT',
        mode: 'ACTIVE',
        reasonCode: 'OK',
        latencyMs,
        timestamp: new Date().toISOString(),
        metadata: {
          bucket: MEDIA_BUCKET,
          isPublic: data?.public ?? false,
        },
      }
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime
      const message = err instanceof Error ? err.message : 'Storage connection failed'

      return {
        name: 'supabase-storage',
        subsystem: 'STORAGE',
        status: 'DEGRADED',
        criticality: 'IMPORTANT',
        mode: 'ACTIVE',
        reasonCode: 'STORAGE_UNAVAILABLE',
        message,
        latencyMs,
        timestamp: new Date().toISOString(),
        metadata: { bucket: MEDIA_BUCKET },
      }
    }
  },
}
