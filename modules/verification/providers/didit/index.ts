import 'server-only'
import type {
  VerificationProvider,
  CreateSessionParams,
  CreatedProviderSession,
  ParsedWebhookEvent,
  AuthoritativeDecision,
} from '../interface'
import type { VerificationStatus } from '../../types'
import { DiditClient } from './client'
import { verifyDiditWebhookSignature } from './webhook'
import { normalizeDiditStatus, extractAgeVerifiedThreshold } from './normalizer'

export interface DiditProviderOptions {
  apiKey: string
  workflowId: string
  webhookSecret: string
  baseUrl?: string
}

/**
 * Production implementation of VerificationProvider for Didit.
 */
export class DiditProvider implements VerificationProvider {
  public readonly providerName = 'didit'
  private client: DiditClient
  private webhookSecret: string

  constructor(options: DiditProviderOptions) {
    if (!options.apiKey || !options.workflowId || !options.webhookSecret) {
      throw new Error('DiditProvider requires apiKey, workflowId, and webhookSecret')
    }

    this.webhookSecret = options.webhookSecret
    this.client = new DiditClient({
      apiKey: options.apiKey,
      workflowId: options.workflowId,
      baseUrl: options.baseUrl,
    })
  }

  async createSession(params: CreateSessionParams): Promise<CreatedProviderSession> {
    const response = await this.client.createSession(
      params.accountUserId,
      params.callbackUrl,
      params.appUrlConfigured
    )
    return {
      providerSessionId: response.session_id,
      verificationUrl: response.url,
      sessionToken: response.session_token,
    }
  }

  async verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<ParsedWebhookEvent | null> {
    return verifyDiditWebhookSignature(rawBody, headers, {
      secret: this.webhookSecret,
    })
  }

  async fetchAuthoritativeDecision(providerSessionId: string): Promise<AuthoritativeDecision> {
    const decision = await this.client.getDecision(providerSessionId)
    const firstIdVerification = decision.id_verifications?.[0]

    const isDocApproved = firstIdVerification?.status?.toLowerCase() === 'approved'
    const isAgeThresholdMet = extractAgeVerifiedThreshold(firstIdVerification)

    const identityVerified = isDocApproved
    const ageVerified = isDocApproved && isAgeThresholdMet

    const normalizedStatus = this.normalizeStatus(decision.status, ageVerified)

    return {
      providerStatus: decision.status,
      normalizedStatus,
      identityVerified,
      ageVerified,
      cpfVerified: firstIdVerification ? true : null,
      verifiedCountry: firstIdVerification?.issuing_country || null,
      verifiedAt: normalizedStatus === 'VERIFIED' ? new Date().toISOString() : null,
    }
  }

  normalizeStatus(providerStatus: string, ageVerified: boolean): VerificationStatus {
    return normalizeDiditStatus(providerStatus, ageVerified)
  }
}
