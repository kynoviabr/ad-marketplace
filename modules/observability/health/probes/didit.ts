/**
 * Didit KYC Subsystem Health Probe — PX1B
 *
 * Verifies Didit KYC provider configuration readiness and webhook secret presence.
 * Performs zero external network calls; never fakes live reachability.
 *
 * Operational Mode: CONFIG_ONLY
 * Criticality: IMPORTANT
 */

import type { HealthProbe, HealthProbeResult } from '../types'

export const diditProbe: HealthProbe = {
  name: 'didit-kyc',
  subsystem: 'KYC',
  criticality: 'IMPORTANT',
  mode: 'CONFIG_ONLY',

  async execute(): Promise<HealthProbeResult> {
    const startTime = Date.now()

    const apiKey = process.env.DIDIT_API_KEY
    const webhookSecret = process.env.DIDIT_WEBHOOK_SECRET
    const workflowId = process.env.DIDIT_WORKFLOW_ID
    const baseUrl = process.env.DIDIT_API_BASE_URL || 'https://verification.didit.me'

    const hasApiKey = Boolean(apiKey)
    const hasWebhookSecret = Boolean(webhookSecret)
    const hasWorkflowId = Boolean(workflowId)

    const isFullyConfigured = hasApiKey && hasWebhookSecret && hasWorkflowId

    if (!isFullyConfigured) {
      return {
        name: 'didit-kyc',
        subsystem: 'KYC',
        status: 'DEGRADED',
        criticality: 'IMPORTANT',
        mode: 'CONFIG_ONLY',
        reasonCode: 'CONFIG_MISSING',
        message: 'Didit KYC credentials or workflow parameters are partially or completely unconfigured',
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        metadata: {
          hasApiKey,
          hasWebhookSecret,
          hasWorkflowId,
          configured: false,
        },
      }
    }

    return {
      name: 'didit-kyc',
      subsystem: 'KYC',
      status: 'HEALTHY',
      criticality: 'IMPORTANT',
      mode: 'CONFIG_ONLY',
      reasonCode: 'OK',
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      metadata: {
        configured: true,
        baseUrl,
      },
    }
  },
}
