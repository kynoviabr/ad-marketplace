import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { verificationStatusLabel } from '@/lib/i18n/labels'
import { authOnboardingPtBR, authOnboardingEn } from '@/lib/i18n/messages/auth-onboarding'

const ROOT = join(__dirname, '../..')
const read = (relPath: string) => readFileSync(join(ROOT, relPath), 'utf8')

// Mock hoisted stubs
const mockRequireAccount = vi.fn()
const mockGetVerification = vi.fn()
const mockGetVerificationSafe = vi.fn()
const mockCreateSession = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()
const mockEq = vi.fn()
const mockLt = vi.fn()

vi.mock('@/modules/auth/dal', () => ({
  requireAccount: () => mockRequireAccount(),
}))

vi.mock('@/modules/verification/dal', () => ({
  getVerification: (accountId: string) => mockGetVerification(accountId),
  getVerificationSafe: (accountId: string) => mockGetVerificationSafe(accountId),
}))

vi.mock('@/modules/verification/providers/factory', () => ({
  getVerificationProvider: () => ({
    providerName: 'didit',
    createSession: (...args: any[]) => mockCreateSession(...args),
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const chain: any = {
        insert: (data: any) => {
          mockInsert(table, data)
          return { error: null }
        },
        update: (data: any) => {
          mockUpdate(table, data)
          return chain
        },
        eq: (...args: any[]) => {
          mockEq(table, ...args)
          return { error: null }
        },
        lt: (...args: any[]) => {
          mockLt(table, ...args)
          return chain
        },
      }
      return chain
    },
  }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

// Import the actions under test
import {
  startVerificationAction,
  resumeVerificationAction,
  _resetVerificationSessionCache,
} from '@/modules/verification/actions'

describe('PX4.8.1 — KYC / Didit Entry & Resume Flow', () => {
  const accountId = 'acc_test_px481_uuid'

  beforeEach(async () => {
    vi.clearAllMocks()
    await _resetVerificationSessionCache()
    mockRequireAccount.mockResolvedValue({ id: accountId, onboarding_step: 3 })
    mockCreateSession.mockResolvedValue({
      providerSessionId: 'sess_new_123',
      verificationUrl: 'https://verify.didit.me/session/sess_new_123',
    })
  })

  describe('Server Action State Transitions & Idempotency', () => {
    it('NOT_STARTED: creates new session and returns verificationUrl', async () => {
      mockGetVerification.mockResolvedValue(null)

      const res = await startVerificationAction()
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.verificationUrl).toBe('https://verify.didit.me/session/sess_new_123')
      }
      expect(mockCreateSession).toHaveBeenCalledTimes(1)
      expect(mockInsert).toHaveBeenCalledWith(
        'identity_verifications',
        expect.objectContaining({
          account_user_id: accountId,
          provider: 'didit',
          provider_session_id: 'sess_new_123',
          status: 'PENDING',
        })
      )
      expect(mockUpdate).toHaveBeenCalledWith(
        'account_users',
        expect.objectContaining({ onboarding_step: 4 })
      )
    })

    it('PENDING: resumes session without error when session already exists', async () => {
      mockGetVerification.mockResolvedValue({
        id: 'verif_1',
        account_user_id: accountId,
        status: 'PENDING',
        provider_session_id: 'sess_existing_pending',
      })

      const res = await startVerificationAction()
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.verificationUrl).toBe('https://verify.didit.me/session/sess_new_123')
      }
      // Updates existing verification record with fresh session
      expect(mockUpdate).toHaveBeenCalledWith(
        'identity_verifications',
        expect.objectContaining({
          provider_session_id: 'sess_new_123',
          status: 'PENDING',
        })
      )
    })

    it('IN_PROGRESS: resumes session without error', async () => {
      mockGetVerification.mockResolvedValue({
        id: 'verif_2',
        account_user_id: accountId,
        status: 'IN_PROGRESS',
        provider_session_id: 'sess_existing_inprogress',
      })

      const res = await startVerificationAction()
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.verificationUrl).toBe('https://verify.didit.me/session/sess_new_123')
      }
      expect(mockUpdate).toHaveBeenCalledWith('identity_verifications', expect.any(Object))
    })

    it('IN_REVIEW: fails closed with clear under-review error message', async () => {
      mockGetVerification.mockResolvedValue({
        id: 'verif_3',
        account_user_id: accountId,
        status: 'IN_REVIEW',
        provider_session_id: 'sess_in_review',
      })

      const res = await startVerificationAction()
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error).toContain('em análise')
      }
      expect(mockCreateSession).not.toHaveBeenCalled()
    })

    it('VERIFIED: fails closed because account is already verified', async () => {
      mockGetVerification.mockResolvedValue({
        id: 'verif_4',
        account_user_id: accountId,
        status: 'VERIFIED',
        identity_verified: true,
        age_verified: true,
      })

      const res = await startVerificationAction()
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error).toContain('já possui verificação')
      }
      expect(mockCreateSession).not.toHaveBeenCalled()
    })

    it('EXPIRED: creates a fresh verification session', async () => {
      mockGetVerification.mockResolvedValue({
        id: 'verif_5',
        account_user_id: accountId,
        status: 'EXPIRED',
      })

      const res = await startVerificationAction()
      expect(res.success).toBe(true)
      expect(mockCreateSession).toHaveBeenCalledTimes(1)
    })

    it('REJECTED: creates a fresh verification session', async () => {
      mockGetVerification.mockResolvedValue({
        id: 'verif_6',
        account_user_id: accountId,
        status: 'REJECTED',
      })

      const res = await startVerificationAction()
      expect(res.success).toBe(true)
      expect(mockCreateSession).toHaveBeenCalledTimes(1)
    })

    it('Cache deduplication: reuses cached active session within TTL', async () => {
      mockGetVerification.mockResolvedValue({
        id: 'verif_cache',
        account_user_id: accountId,
        status: 'PENDING',
      })

      const res1 = await startVerificationAction()
      const res2 = await startVerificationAction()

      expect(res1.success).toBe(true)
      expect(res2.success).toBe(true)
      // Only 1 createSession call should have occurred due to cache
      expect(mockCreateSession).toHaveBeenCalledTimes(1)
      if (res1.success && res2.success) {
        expect(res1.data.verificationUrl).toBe(res2.data.verificationUrl)
      }
    })

    it('resumeVerificationAction alias behaves identically to startVerificationAction', async () => {
      mockGetVerification.mockResolvedValue({
        id: 'verif_7',
        account_user_id: accountId,
        status: 'PENDING',
      })

      const res = await resumeVerificationAction()
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.verificationUrl).toBe('https://verify.didit.me/session/sess_new_123')
      }
    })
  })

  describe('UI & Component Structure Invariants', () => {
    const cardCode = read('components/verification/verification-status-card.tsx')
    const cssCode = read('app/globals.css')

    it('renders distinct UI branches for all 7 states', () => {
      expect(cardCode).toContain("status === 'NOT_STARTED'")
      expect(cardCode).toContain("['PENDING', 'IN_PROGRESS'].includes(status)")
      expect(cardCode).toContain("status === 'IN_REVIEW'")
      expect(cardCode).toContain("status === 'VERIFIED' && verifiedAdult")
      expect(cardCode).toContain("status === 'EXPIRED'")
      expect(cardCode).toContain("status === 'REJECTED'")
    })

    it('PENDING / IN_PROGRESS branch provides actionable continue CTA and tertiary refresh', () => {
      expect(cardCode).toContain("t('verification.continueTitle')")
      expect(cardCode).toContain("t('verification.continueVerification')")
      expect(cardCode).toContain("onClick={startVerification}")
      expect(cardCode).toContain("className=\"verification-tertiary-action\"")
      expect(cardCode).toContain("onClick={refreshStatus}")
      expect(cardCode).toContain("t('verification.reviewProfile')")
      expect(cardCode).toContain("href=\"/onboarding/revisar\"")
    })

    it('IN_REVIEW branch renders waiting state with refresh as primary', () => {
      expect(cardCode).toContain("t('verification.underReviewTitle')")
      expect(cardCode).toContain("t('verification.underReview')")
    })

    it('EXPIRED branch offers explicit startNew CTA', () => {
      expect(cardCode).toContain("t('verification.startNew')")
    })

    it('REJECTED branch offers explicit retry CTA', () => {
      expect(cardCode).toContain("t('verification.retry')")
    })

    it('defines .verification-tertiary-action styling in globals.css', () => {
      expect(cssCode).toContain('.verification-tertiary-action')
    })
  })

  describe('i18n Canonical Labels & Copy', () => {
    it('returns exact PT-BR status labels', () => {
      expect(verificationStatusLabel('pt-BR', 'NOT_STARTED')).toBe('AGUARDANDO INÍCIO')
      expect(verificationStatusLabel('pt-BR', 'PENDING')).toBe('AGUARDANDO CONCLUSÃO')
      expect(verificationStatusLabel('pt-BR', 'IN_PROGRESS')).toBe('EM ANDAMENTO')
      expect(verificationStatusLabel('pt-BR', 'IN_REVIEW')).toBe('EM ANÁLISE')
      expect(verificationStatusLabel('pt-BR', 'VERIFIED')).toBe('VERIFICADA')
      expect(verificationStatusLabel('pt-BR', 'REJECTED')).toBe('REJEITADA')
      expect(verificationStatusLabel('pt-BR', 'EXPIRED')).toBe('EXPIRADA')
    })

    it('returns exact EN status labels', () => {
      expect(verificationStatusLabel('en', 'NOT_STARTED')).toBe('WAITING TO START')
      expect(verificationStatusLabel('en', 'PENDING')).toBe('AWAITING COMPLETION')
      expect(verificationStatusLabel('en', 'IN_PROGRESS')).toBe('IN PROGRESS')
      expect(verificationStatusLabel('en', 'IN_REVIEW')).toBe('UNDER REVIEW')
      expect(verificationStatusLabel('en', 'VERIFIED')).toBe('VERIFIED')
      expect(verificationStatusLabel('en', 'REJECTED')).toBe('REJECTED')
      expect(verificationStatusLabel('en', 'EXPIRED')).toBe('EXPIRED')
    })

    it('contains all required translation keys in PT-BR and EN', () => {
      const requiredKeys = [
        'verification.continueTitle',
        'verification.continueVerification',
        'verification.underReviewTitle',
        'verification.underReview',
        'verification.finishExternal',
        'verification.startNew',
        'verification.expired',
        'verification.expiredText',
        'verification.failed',
        'verification.failedText',
        'verification.retry',
      ] as const

      for (const key of requiredKeys) {
        expect(authOnboardingPtBR[key]).toBeDefined()
        expect(authOnboardingPtBR[key].length).toBeGreaterThan(0)
        expect(authOnboardingEn[key]).toBeDefined()
        expect(authOnboardingEn[key].length).toBeGreaterThan(0)
      }
    })
  })
})
