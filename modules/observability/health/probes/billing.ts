/**
 * Billing Subsystem Health Probe — PX1B
 *
 * Verifies payment provider configuration and webhook readiness.
 * Performs zero test checkouts and creates zero synthetic subscriptions.
 *
 * Operational Mode: CONFIG_ONLY
 * Criticality: IMPORTANT
 */

import type { HealthProbe, HealthProbeResult } from '../types'

export const billingProbe: HealthProbe = {
  name: 'billing-provider',
  subsystem: 'BILLING',
  criticality: 'IMPORTANT',
  mode: 'CONFIG_ONLY',

  async execute(): Promise<HealthProbeResult> {
    const startTime = Date.now()

    const provider = (process.env.PAYMENT_PROVIDER || 'MOCK').toUpperCase()
    const webhookSecret = process.env.BILLING_WEBHOOK_SECRET

    // In DEV / pre-production, MOCK provider is the official active provider
    if (provider === 'MOCK') {
      return {
        name: 'billing-provider',
        subsystem: 'BILLING',
        status: 'HEALTHY',
        criticality: 'IMPORTANT',
        mode: 'CONFIG_ONLY',
        reasonCode: 'OK',
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        metadata: {
          provider: 'MOCK',
          mockMode: true,
          realProcessingEnabled: false,
        },
      }
    }

    // When configured with a real payment gateway, webhook secret is required
    const hasWebhookSecret = Boolean(webhookSecret)

    if (!hasWebhookSecret) {
      return {
        name: 'billing-provider',
        subsystem: 'BILLING',
        status: 'DEGRADED',
        criticality: 'IMPORTANT',
        mode: 'CONFIG_ONLY',
        reasonCode: 'CONFIG_MISSING',
        message: `Payment provider '${provider}' configured but BILLING_WEBHOOK_SECRET is missing`,
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        metadata: {
          provider,
          hasWebhookSecret: false,
        },
      }
    }

    return {
      name: 'billing-provider',
      subsystem: 'BILLING',
      status: 'HEALTHY',
      criticality: 'IMPORTANT',
      mode: 'CONFIG_ONLY',
      reasonCode: 'OK',
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      metadata: {
        provider,
        hasWebhookSecret: true,
      },
    }
  },
}
