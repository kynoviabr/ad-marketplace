import type { VerificationStatus } from '../types'

export interface CreateSessionParams {
  accountUserId: string
  callbackUrl?: string
}

export interface CreatedProviderSession {
  providerSessionId: string
  verificationUrl: string
  sessionToken?: string
}

export interface ParsedWebhookEvent {
  eventId: string
  sessionId: string
  rawStatus?: string
  vendorData?: string
  eventType: string
}

export interface AuthoritativeDecision {
  providerStatus: string
  normalizedStatus: VerificationStatus
  identityVerified: boolean
  ageVerified: boolean
  cpfVerified: boolean | null
  verifiedCountry: string | null
  verifiedAt: string | null
}

/**
 * Clean, decoupled interface for identity verification providers.
 */
export interface VerificationProvider {
  readonly providerName: string

  /** Initiates a hosted verification session */
  createSession(params: CreateSessionParams): Promise<CreatedProviderSession>

  /** Verifies the webhook signature using HMAC-SHA256 and extracts event details */
  verifyWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): Promise<ParsedWebhookEvent | null>

  /** Fetches the authoritative S2S decision from the provider */
  fetchAuthoritativeDecision(providerSessionId: string): Promise<AuthoritativeDecision>

  /** Normalizes provider-specific status strings to domain VerificationStatus */
  normalizeStatus(providerStatus: string, ageVerified: boolean): VerificationStatus
}
