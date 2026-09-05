/**
 * Email & OTP Subsystem Health Probe — PX1B
 *
 * Verifies passwordless OTP delivery readiness and channel feature flags.
 * Performs zero test email/SMS/WhatsApp dispatches.
 *
 * Operational Mode: CONFIG_ONLY
 * Criticality: IMPORTANT
 */

import type { HealthProbe, HealthProbeResult } from '../types'

export const emailOtpProbe: HealthProbe = {
  name: 'email-otp',
  subsystem: 'EMAIL_OTP',
  criticality: 'IMPORTANT',
  mode: 'CONFIG_ONLY',

  async execute(): Promise<HealthProbeResult> {
    const startTime = Date.now()

    const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
    const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const emailOtpEnabled = process.env.NEXT_PUBLIC_EMAIL_OTP_ENABLED === 'true'
    const whatsappOtpEnabled = process.env.NEXT_PUBLIC_WHATSAPP_OTP_ENABLED === 'true'

    // Supabase Auth is the underlying provider for Email OTP
    const isAuthAvailable = hasSupabaseUrl && hasAnonKey

    if (!isAuthAvailable) {
      return {
        name: 'email-otp',
        subsystem: 'EMAIL_OTP',
        status: 'DEGRADED',
        criticality: 'IMPORTANT',
        mode: 'CONFIG_ONLY',
        reasonCode: 'CONFIG_MISSING',
        message: 'Underlying Supabase Auth configuration missing for OTP services',
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        metadata: {
          emailOtpEnabled,
          whatsappOtpEnabled,
          isAuthAvailable: false,
        },
      }
    }

    return {
      name: 'email-otp',
      subsystem: 'EMAIL_OTP',
      status: 'HEALTHY',
      criticality: 'IMPORTANT',
      mode: 'CONFIG_ONLY',
      reasonCode: 'OK',
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      metadata: {
        emailOtpEnabled,
        whatsappOtpEnabled,
        isAuthAvailable: true,
      },
    }
  },
}
