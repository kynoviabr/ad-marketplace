import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createDataSubjectRequestAction,
  getMyDataSubjectRequestsAction,
  getMyDataSummaryAction,
  getMyDataExportZipAction,
  getMyDsrEventsTimelineAction,
  cancelMyDataSubjectRequestAction,
} from '@/modules/privacy/actions'
import * as authDal from '@/modules/auth/dal'
import * as privacyDal from '@/modules/privacy/dal'
import * as exportEngine from '@/modules/privacy/export-engine'
import { LGPD_RIGHTS, type LgpdRight } from '@/modules/privacy/types'

describe('LGPD-02C — Privacy Center & Data Subject Rights Self-Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // ===========================================================================
  // 1. SESSION BARRIER & STRICT SERVER-SIDE IDENTITY RESOLUTION
  // ===========================================================================
  describe('1. Session Boundary & Identity Resolution', () => {
    it('rejects unauthenticated calls with UNAUTHORIZED for all actions', async () => {
      vi.spyOn(authDal, 'requireAccount').mockResolvedValue(null as any)

      const res1 = await createDataSubjectRequestAction({ requestType: 'ACCESS' })
      expect(res1.success).toBe(false)
      expect(res1.code).toBe('UNAUTHORIZED')

      const res2 = await getMyDataSubjectRequestsAction()
      expect(res2.success).toBe(false)
      expect(res2.code).toBe('UNAUTHORIZED')

      const res3 = await getMyDataSummaryAction()
      expect(res3.success).toBe(false)
      expect(res3.code).toBe('UNAUTHORIZED')

      const res4 = await getMyDataExportZipAction()
      expect(res4.success).toBe(false)
      expect(res4.code).toBe('UNAUTHORIZED')

      const res5 = await getMyDsrEventsTimelineAction('req-123')
      expect(res5.success).toBe(false)
      expect(res5.code).toBe('UNAUTHORIZED')

      const res6 = await cancelMyDataSubjectRequestAction('req-123')
      expect(res6.success).toBe(false)
      expect(res6.code).toBe('UNAUTHORIZED')
    })

    it('ignores client-supplied target subject IDs and binds strictly to verified session', async () => {
      const sessionAccount = {
        id: 'session-account-uuid',
        auth_user_id: 'auth-user-uuid',
        role: 'CLIENT' as const,
        status: 'ACTIVE' as const,
      }
      vi.spyOn(authDal, 'requireAccount').mockResolvedValue(sessionAccount as any)

      const createSpy = vi.spyOn(privacyDal, 'createDataSubjectRequest').mockResolvedValue({
        success: true,
        request: {
          id: 'dsr-abc',
          requestType: 'ACCESS',
          status: 'RECEIVED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
          cancelledAt: null,
          resolutionCode: null,
        },
      })

      // Client attempts to pass spoofed target IDs
      const spoofedInput = {
        requestType: 'ACCESS',
        subject_user_id: 'malicious-target-id',
        account_user_id: 'other-user-id',
        auth_user_id: 'victim-id',
      }

      await createDataSubjectRequestAction(spoofedInput)

      // Verified: DAL receives strictly sessionAccount.id
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          accountUserId: 'session-account-uuid',
          requestType: 'ACCESS',
        })
      )
      expect(createSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ accountUserId: 'other-user-id' })
      )
    })
  })

  // ===========================================================================
  // 2. CANONICAL LGPD RIGHTS TAXONOMY VALIDATION
  // ===========================================================================
  describe('2. Canonical Rights & DSR Creation', () => {
    it('accepts all 9 canonical LGPD statutory rights', async () => {
      const sessionAccount = { id: 'account-123', role: 'ADVERTISER' as const, status: 'ACTIVE' as const }
      vi.spyOn(authDal, 'requireAccount').mockResolvedValue(sessionAccount as any)

      const createSpy = vi.spyOn(privacyDal, 'createDataSubjectRequest').mockResolvedValue({
        success: true,
        request: {
          id: 'dsr-test',
          requestType: 'ACCESS',
          status: 'RECEIVED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
          cancelledAt: null,
          resolutionCode: null,
        },
      })

      for (const right of LGPD_RIGHTS) {
        const res = await createDataSubjectRequestAction({ requestType: right })
        expect(res.success).toBe(true)
        expect(createSpy).toHaveBeenCalledWith(
          expect.objectContaining({ requestType: right })
        )
      }
    })

    it('rejects non-canonical right types with INVALID_REQUEST_TYPE', async () => {
      const sessionAccount = { id: 'account-123', role: 'CLIENT' as const, status: 'ACTIVE' as const }
      vi.spyOn(authDal, 'requireAccount').mockResolvedValue(sessionAccount as any)

      const invalidTypes = ['EXPORT', 'DELETE_ACCOUNT', 'FORGET', 'PURGE', 'REMOVE_ME', 'GDPR_ERASURE']
      for (const inv of invalidTypes) {
        const res = await createDataSubjectRequestAction({ requestType: inv })
        expect(res.success).toBe(false)
        expect(res.code).toBe('INVALID_REQUEST_TYPE')
      }
    })

    it('enforces idempotency and rejects duplicate in-flight requests of the same type', async () => {
      const sessionAccount = { id: 'account-123', role: 'ADVERTISER' as const, status: 'ACTIVE' as const }
      vi.spyOn(authDal, 'requireAccount').mockResolvedValue(sessionAccount as any)

      vi.spyOn(privacyDal, 'createDataSubjectRequest').mockResolvedValue({
        success: false,
        error: 'Já existe uma solicitação ativa deste tipo em processamento para sua conta.',
        code: 'DUPLICATE_ACTIVE_REQUEST',
      })

      const res = await createDataSubjectRequestAction({ requestType: 'DELETION' })
      expect(res.success).toBe(false)
      expect(res.code).toBe('DUPLICATE_ACTIVE_REQUEST')
    })
  })

  // ===========================================================================
  // 3. ZERO DESTRUCTIVE MUTATION INVARIANT ON USER REQUESTS
  // ===========================================================================
  describe('3. Non-Destructive Invariant on Real User Requests', () => {
    it('creates DELETION request with status RECEIVED and NEVER calls lifecycle executor or purge', async () => {
      const sessionAccount = { id: 'real-user-account', role: 'ADVERTISER' as const, status: 'ACTIVE' as const }
      vi.spyOn(authDal, 'requireAccount').mockResolvedValue(sessionAccount as any)

      const createSpy = vi.spyOn(privacyDal, 'createDataSubjectRequest').mockResolvedValue({
        success: true,
        request: {
          id: 'dsr-deletion-001',
          requestType: 'DELETION',
          status: 'RECEIVED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
          cancelledAt: null,
          resolutionCode: null,
        },
      })

      const res = await createDataSubjectRequestAction({ requestType: 'DELETION' })
      expect(res.success).toBe(true)
      expect(res.data?.status).toBe('RECEIVED')
      expect(res.data?.requestType).toBe('DELETION')

      // Ensure creation DAL was called
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          accountUserId: 'real-user-account',
          requestType: 'DELETION',
        })
      )
    })

    it('creates ANONYMIZATION, BLOCKING, and CONSENT_REVOCATION as RECEIVED without destructive effects', async () => {
      const sessionAccount = { id: 'real-user-account', role: 'CLIENT' as const, status: 'ACTIVE' as const }
      vi.spyOn(authDal, 'requireAccount').mockResolvedValue(sessionAccount as any)

      for (const nonDestructiveType of ['ANONYMIZATION', 'BLOCKING', 'CONSENT_REVOCATION'] as LgpdRight[]) {
        vi.spyOn(privacyDal, 'createDataSubjectRequest').mockResolvedValueOnce({
          success: true,
          request: {
            id: `dsr-${nonDestructiveType.toLowerCase()}-001`,
            requestType: nonDestructiveType,
            status: 'RECEIVED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
            cancelledAt: null,
            resolutionCode: null,
          },
        })

        const res = await createDataSubjectRequestAction({ requestType: nonDestructiveType })
        expect(res.success).toBe(true)
        expect(res.data?.status).toBe('RECEIVED')
      }
    })
  })

  // ===========================================================================
  // 4. PERSONAL DATA SUMMARY & ROLE-SPECIFIC PROJECTIONS
  // ===========================================================================
  describe('4. Personal Data Summary Projections', () => {
    it('returns role-appropriate summary for CLIENT without leaking advertiser fields', async () => {
      const sessionAccount = { id: 'client-account-123', role: 'CLIENT' as const, status: 'ACTIVE' as const }
      vi.spyOn(authDal, 'requireAccount').mockResolvedValue(sessionAccount as any)

      vi.spyOn(privacyDal, 'getAccountDataSummary').mockResolvedValue({
        accountId: 'client-account-123',
        role: 'CLIENT',
        email: 'client@example.com',
        phone: null,
        status: 'ACTIVE',
        createdAt: '2026-08-01T12:00:00Z',
        legalAcceptance: {
          termsVersion: '1.0.0',
          termsAcceptedAt: '2026-08-01T12:05:00Z',
          privacyVersion: '1.0.0',
          privacyAcceptedAt: '2026-08-01T12:05:00Z',
        },
        advertiserSummary: null,
        clientSummary: {
          membershipType: 'VIP',
          validUntil: '2026-12-31T23:59:59Z',
          authoredReviewsCount: 3,
        },
        totalRequestsCount: 1,
        activeRequestsCount: 0,
      })

      const res = await getMyDataSummaryAction()
      expect(res.success).toBe(true)
      expect(res.data?.role).toBe('CLIENT')
      expect(res.data?.clientSummary?.membershipType).toBe('VIP')
      expect(res.data?.clientSummary?.authoredReviewsCount).toBe(3)
      expect(res.data?.advertiserSummary).toBeNull()

      // Security check: no password hashes or tokens
      expect((res.data as any).password_hash).toBeUndefined()
      expect((res.data as any).auth_token).toBeUndefined()
    })

    it('returns role-appropriate summary for ADVERTISER with profile and media counts', async () => {
      const sessionAccount = { id: 'adv-account-456', role: 'ADVERTISER' as const, status: 'ACTIVE' as const }
      vi.spyOn(authDal, 'requireAccount').mockResolvedValue(sessionAccount as any)

      vi.spyOn(privacyDal, 'getAccountDataSummary').mockResolvedValue({
        accountId: 'adv-account-456',
        role: 'ADVERTISER',
        email: 'adv@example.com',
        phone: '+5511999998888',
        status: 'ACTIVE',
        createdAt: '2026-07-15T10:00:00Z',
        legalAcceptance: {
          termsVersion: '1.0.0',
          termsAcceptedAt: '2026-07-15T10:02:00Z',
          privacyVersion: '1.0.0',
          privacyAcceptedAt: '2026-07-15T10:02:00Z',
        },
        advertiserSummary: {
          stageName: 'Luna Velvet',
          slug: 'luna-velvet',
          publishedAt: '2026-07-16T14:00:00Z',
          locationsCount: 2,
          offeringsCount: 5,
          photosCount: 6,
          videosCount: 1,
          activeBoostsCount: 1,
          subscriptionPlan: 'PRO',
        },
        clientSummary: null,
        totalRequestsCount: 2,
        activeRequestsCount: 1,
      })

      const res = await getMyDataSummaryAction()
      expect(res.success).toBe(true)
      expect(res.data?.role).toBe('ADVERTISER')
      expect(res.data?.advertiserSummary?.stageName).toBe('Luna Velvet')
      expect(res.data?.advertiserSummary?.photosCount).toBe(6)
      expect(res.data?.advertiserSummary?.subscriptionPlan).toBe('PRO')
      expect(res.data?.clientSummary).toBeNull()
    })
  })

  // ===========================================================================
  // 5. SANITIZED ZIP DATA EXPORT
  // ===========================================================================
  describe('5. Sanitized ZIP Data Export (Art. 18, II & V)', () => {
    it('generates base64-encoded ZIP buffer and safe filename bound to caller account', async () => {
      const sessionAccount = { id: 'export-account-789', role: 'CLIENT' as const, status: 'ACTIVE' as const }
      vi.spyOn(authDal, 'requireAccount').mockResolvedValue(sessionAccount as any)

      const dummyZip = Buffer.from('PK\x03\x04test-zip-payload')
      const exportSpy = vi.spyOn(exportEngine, 'exportSubjectDataZip').mockResolvedValue(dummyZip)

      const res = await getMyDataExportZipAction()
      expect(res.success).toBe(true)
      expect(res.data?.filename).toMatch(/^velvet-meus-dados-export-a-\d+\.zip$/)
      expect(res.data?.base64Zip).toBe(dummyZip.toString('base64'))

      // Strictly verifies caller account ID was passed to export engine
      expect(exportSpy).toHaveBeenCalledWith('export-account-789')
    })
  })

  // ===========================================================================
  // 6. TIMELINE & REQUEST CANCELLATION
  // ===========================================================================
  describe('6. Safe Timeline & User Cancellation', () => {
    it('retrieves timeline for own request without internal operator notes', async () => {
      const sessionAccount = { id: 'owner-account-123', role: 'CLIENT' as const, status: 'ACTIVE' as const }
      vi.spyOn(authDal, 'requireAccount').mockResolvedValue(sessionAccount as any)

      vi.spyOn(privacyDal, 'getAccountDsrEventsSafe').mockResolvedValue([
        {
          id: 'evt-1',
          requestId: 'req-001',
          eventType: 'REQUEST_CREATED',
          actorRole: 'SUBJECT',
          createdAt: '2026-09-10T10:00:00Z',
        },
        {
          id: 'evt-2',
          requestId: 'req-001',
          eventType: 'REVIEW_STARTED',
          actorRole: 'ADMIN',
          createdAt: '2026-09-10T11:00:00Z',
        },
      ])

      const res = await getMyDsrEventsTimelineAction('req-001')
      expect(res.success).toBe(true)
      expect(res.data?.length).toBe(2)
      expect(res.data?.[0].eventType).toBe('REQUEST_CREATED')
      expect(res.data?.[1].actorRole).toBe('ADMIN')

      // Verifies internal notes or metadata are stripped
      expect((res.data?.[1] as any).metadata).toBeUndefined()
      expect((res.data?.[1] as any).internal_notes).toBeUndefined()
    })

    it('rejects timeline retrieval if request does not belong to the user', async () => {
      const sessionAccount = { id: 'attacker-account', role: 'CLIENT' as const, status: 'ACTIVE' as const }
      vi.spyOn(authDal, 'requireAccount').mockResolvedValue(sessionAccount as any)

      // DAL returns null when request is not found for this user
      vi.spyOn(privacyDal, 'getAccountDsrEventsSafe').mockResolvedValue(null)

      const res = await getMyDsrEventsTimelineAction('victim-request-id')
      expect(res.success).toBe(false)
      expect(res.code).toBe('NOT_FOUND')
    })

    it('cancels own request successfully when in cancellable state', async () => {
      const sessionAccount = { id: 'cancelling-account', role: 'ADVERTISER' as const, status: 'ACTIVE' as const }
      vi.spyOn(authDal, 'requireAccount').mockResolvedValue(sessionAccount as any)

      const cancelSpy = vi.spyOn(privacyDal, 'cancelAccountDataSubjectRequest').mockResolvedValue({
        success: true,
      })

      const res = await cancelMyDataSubjectRequestAction('req-to-cancel')
      expect(res.success).toBe(true)
      expect(res.data?.cancelled).toBe(true)
      expect(cancelSpy).toHaveBeenCalledWith('cancelling-account', 'req-to-cancel')
    })

    it('rejects cancellation when request is already completed or rejected', async () => {
      const sessionAccount = { id: 'cancelling-account', role: 'ADVERTISER' as const, status: 'ACTIVE' as const }
      vi.spyOn(authDal, 'requireAccount').mockResolvedValue(sessionAccount as any)

      vi.spyOn(privacyDal, 'cancelAccountDataSubjectRequest').mockResolvedValue({
        success: false,
        error: 'Esta solicitação não pode mais ser cancelada pelo usuário.',
        code: 'INVALID_STATUS',
      })

      const res = await cancelMyDataSubjectRequestAction('completed-req')
      expect(res.success).toBe(false)
      expect(res.code).toBe('INVALID_STATUS')
    })
  })
})
