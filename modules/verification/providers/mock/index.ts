import { createHmac, timingSafeEqual } from 'node:crypto'
import type {
  VerificationProvider,
  CreateSessionParams,
  CreatedProviderSession,
  ParsedWebhookEvent,
  AuthoritativeDecision,
} from '../interface'
import type { VerificationStatus } from '../../types'

export type MockScenario =
  | 'VERIFIED_ADULT'
  | 'REJECTED_UNDERAGE'
  | 'REJECTED_DOCUMENT'
  | 'IN_REVIEW'
  | 'EXPIRED'
  | 'PENDING'

export interface MockProviderOptions {
  webhookSecret?: string
  defaultScenario?: MockScenario
}

/**
 * Deterministic Mock Verification Provider for unit and integration testing.
 */
export class MockVerificationProvider implements VerificationProvider {
  public readonly providerName = 'mock'
  private webhookSecret: string
  private defaultScenario: MockScenario
  private sessionScenarios: Map<string, MockScenario> = new Map()

  constructor(options: MockProviderOptions = {}) {
    this.webhookSecret = options.webhookSecret || 'mock_webhook_secret_for_testing'
    this.defaultScenario = options.defaultScenario || 'VERIFIED_ADULT'
  }

  public setScenarioForSession(sessionId: string, scenario: MockScenario) {
    this.sessionScenarios.set(sessionId, scenario)
  }

  async createSession(params: CreateSessionParams): Promise<CreatedProviderSession> {
    const sessionId = `mock_sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    this.sessionScenarios.set(sessionId, this.defaultScenario)

    return {
      providerSessionId: sessionId,
      verificationUrl: `https://mock.verification.local/session/${sessionId}?user=${params.accountUserId}`,
      sessionToken: `mock_tok_${sessionId}`,
    }
  }

  async verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<ParsedWebhookEvent | null> {
    const signatureHeader = headers['x-signature-v2'] || headers['X-Signature-V2']
    if (!signatureHeader || typeof signatureHeader !== 'string') {
      return null
    }

    const cleanSignature = signatureHeader.replace(/^sha256=/, '')
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex')

    const expectedBuf = Buffer.from(expected, 'utf8')
    const receivedBuf = Buffer.from(cleanSignature, 'utf8')

    if (expectedBuf.length !== receivedBuf.length) {
      return null
    }

    if (!timingSafeEqual(expectedBuf, receivedBuf)) {
      return null
    }

    try {
      const parsed = JSON.parse(rawBody.toString('utf8'))
      return {
        eventId: parsed.event_id || `mock_evt_${Date.now()}`,
        sessionId: parsed.data?.session_id || parsed.session_id,
        rawStatus: parsed.data?.status || parsed.status,
        vendorData: parsed.data?.vendor_data || parsed.vendor_data,
        eventType: parsed.webhook_type || parsed.event_type || 'status.updated',
      }
    } catch {
      return null
    }
  }

  async fetchAuthoritativeDecision(providerSessionId: string): Promise<AuthoritativeDecision> {
    const scenario = this.sessionScenarios.get(providerSessionId) || this.defaultScenario

    switch (scenario) {
      case 'VERIFIED_ADULT':
        return {
          providerStatus: 'Approved',
          normalizedStatus: 'VERIFIED',
          identityVerified: true,
          ageVerified: true,
          cpfVerified: true,
          verifiedCountry: 'BR',
          verifiedAt: new Date().toISOString(),
        }

      case 'REJECTED_UNDERAGE':
        return {
          providerStatus: 'Approved', // Provider approved document, but age < 18
          normalizedStatus: 'REJECTED',
          identityVerified: true,
          ageVerified: false, // Underage!
          cpfVerified: true,
          verifiedCountry: 'BR',
          verifiedAt: null,
        }

      case 'REJECTED_DOCUMENT':
        return {
          providerStatus: 'Declined',
          normalizedStatus: 'REJECTED',
          identityVerified: false,
          ageVerified: false,
          cpfVerified: null,
          verifiedCountry: null,
          verifiedAt: null,
        }

      case 'IN_REVIEW':
        return {
          providerStatus: 'In Review',
          normalizedStatus: 'IN_REVIEW',
          identityVerified: false,
          ageVerified: false,
          cpfVerified: null,
          verifiedCountry: 'BR',
          verifiedAt: null,
        }

      case 'EXPIRED':
        return {
          providerStatus: 'Expired',
          normalizedStatus: 'EXPIRED',
          identityVerified: false,
          ageVerified: false,
          cpfVerified: null,
          verifiedCountry: null,
          verifiedAt: null,
        }

      case 'PENDING':
      default:
        return {
          providerStatus: 'Awaiting User',
          normalizedStatus: 'PENDING',
          identityVerified: false,
          ageVerified: false,
          cpfVerified: null,
          verifiedCountry: null,
          verifiedAt: null,
        }
    }
  }

  normalizeStatus(providerStatus: string, ageVerified: boolean): VerificationStatus {
    const normalized = providerStatus.toLowerCase()
    if (normalized === 'approved') {
      return ageVerified ? 'VERIFIED' : 'REJECTED'
    }
    if (normalized === 'declined') return 'REJECTED'
    if (normalized === 'in review') return 'IN_REVIEW'
    if (normalized === 'in progress' || normalized === 'resubmitted') return 'IN_PROGRESS'
    if (normalized === 'expired' || normalized === 'kyc expired' || normalized === 'abandoned') return 'EXPIRED'
    if (normalized === 'awaiting user' || normalized === 'not started') return 'PENDING'
    return 'REJECTED'
  }
}
