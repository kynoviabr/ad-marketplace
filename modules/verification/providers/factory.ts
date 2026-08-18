import 'server-only'
import type { VerificationProvider } from './interface'
import { DiditProvider } from './didit'
import { MockVerificationProvider } from './mock'

export class ProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProviderConfigurationError'
  }
}

/**
 * Instantiates the appropriate VerificationProvider according to environment configuration.
 *
 * Production Invariant:
 * In production (NODE_ENV === 'production'), if Didit credentials are not configured,
 * it fails closed with ProviderConfigurationError. It NEVER silently activates MockVerificationProvider.
 */
export function getVerificationProvider(): VerificationProvider {
  const isProduction = process.env.NODE_ENV === 'production'
  const useMockExplicit = process.env.USE_MOCK_KYC_PROVIDER === 'true'

  const apiKey = process.env.DIDIT_API_KEY
  const workflowId = process.env.DIDIT_WORKFLOW_ID
  const webhookSecret = process.env.DIDIT_WEBHOOK_SECRET
  const baseUrl = process.env.DIDIT_API_BASE_URL

  const isDiditConfigured = Boolean(apiKey && workflowId && webhookSecret)

  if (isProduction) {
    if (useMockExplicit) {
      throw new ProviderConfigurationError('Mock verification provider is strictly prohibited in production')
    }
    if (!isDiditConfigured) {
      throw new ProviderConfigurationError('Didit KYC credentials are required in production (DIDIT_API_KEY, DIDIT_WORKFLOW_ID, DIDIT_WEBHOOK_SECRET)')
    }
    return new DiditProvider({
      apiKey: apiKey!,
      workflowId: workflowId!,
      webhookSecret: webhookSecret!,
      baseUrl,
    })
  }

  // Development / Test environments:
  if (isDiditConfigured && !useMockExplicit) {
    return new DiditProvider({
      apiKey: apiKey!,
      workflowId: workflowId!,
      webhookSecret: webhookSecret!,
      baseUrl,
    })
  }

  return new MockVerificationProvider({
    webhookSecret: webhookSecret || 'mock_webhook_secret_for_testing',
  })
}
