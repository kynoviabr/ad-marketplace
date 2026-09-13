import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  DSR_ALLOWED_TRANSITIONS,
  DSR_REJECTION_REASONS,
  canTransitionDsrStatus,
  validateCompletionGate,
  validateRejectionGate,
} from '@/modules/privacy/workflow'
import { adminTransitionDsrAction } from '@/modules/privacy/actions'
import * as moderationGuards from '@/modules/moderation/guards'
import * as privacyDal from '@/modules/privacy/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DsrStatus, LgpdRight } from '@/modules/privacy/types'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

describe('LGPD-02D — Admin DSR Workflow & Case Management', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // ===========================================================================
  // 1. CANONICAL TRANSITION MATRIX
  // ===========================================================================
  describe('1. Canonical Transition Matrix Integrity', () => {
    it('enforces allowed transitions from RECEIVED', () => {
      const allowed = DSR_ALLOWED_TRANSITIONS.RECEIVED
      expect(allowed).toContain('IDENTITY_VERIFICATION_REQUIRED')
      expect(allowed).toContain('IN_REVIEW')
      expect(allowed).toContain('REJECTED')
      expect(allowed).toContain('CANCELLED')
      expect(allowed).not.toContain('PROCESSING')
      expect(allowed).not.toContain('COMPLETED')
    })

    it('enforces allowed transitions from IDENTITY_VERIFICATION_REQUIRED', () => {
      const allowed = DSR_ALLOWED_TRANSITIONS.IDENTITY_VERIFICATION_REQUIRED
      expect(allowed).toContain('IN_REVIEW')
      expect(allowed).toContain('REJECTED')
      expect(allowed).toContain('CANCELLED')
      expect(allowed).not.toContain('RECEIVED')
      expect(allowed).not.toContain('PROCESSING')
      expect(allowed).not.toContain('COMPLETED')
    })

    it('enforces allowed transitions from IN_REVIEW', () => {
      const allowed = DSR_ALLOWED_TRANSITIONS.IN_REVIEW
      expect(allowed).toContain('IDENTITY_VERIFICATION_REQUIRED')
      expect(allowed).toContain('PROCESSING')
      expect(allowed).toContain('REJECTED')
      expect(allowed).toContain('CANCELLED')
      expect(allowed).not.toContain('RECEIVED')
      expect(allowed).not.toContain('COMPLETED')
    })

    it('enforces allowed transitions from PROCESSING', () => {
      const allowed = DSR_ALLOWED_TRANSITIONS.PROCESSING
      expect(allowed).toContain('COMPLETED')
      expect(allowed).toContain('REJECTED')
      expect(allowed).not.toContain('RECEIVED')
      expect(allowed).not.toContain('IN_REVIEW')
      expect(allowed).not.toContain('IDENTITY_VERIFICATION_REQUIRED')
      expect(allowed).not.toContain('CANCELLED')
    })

    it('strictly freezes terminal states (COMPLETED, REJECTED, CANCELLED)', () => {
      expect(DSR_ALLOWED_TRANSITIONS.COMPLETED).toEqual([])
      expect(DSR_ALLOWED_TRANSITIONS.REJECTED).toEqual([])
      expect(DSR_ALLOWED_TRANSITIONS.CANCELLED).toEqual([])

      const allStatuses: DsrStatus[] = [
        'RECEIVED',
        'IDENTITY_VERIFICATION_REQUIRED',
        'IN_REVIEW',
        'PROCESSING',
        'COMPLETED',
        'REJECTED',
        'CANCELLED',
      ]

      for (const terminal of ['COMPLETED', 'REJECTED', 'CANCELLED'] as DsrStatus[]) {
        for (const target of allStatuses) {
          const res = canTransitionDsrStatus(terminal, target, 'ACCESS', { isSynthetic: true })
          expect(res.allowed).toBe(false)
          expect(res.blockerCode).toBe('TERMINAL_STATUS')
        }
      }
    })

    it('blocks illegal forward or backward transitions (e.g. RECEIVED -> COMPLETED)', () => {
      const res1 = canTransitionDsrStatus('RECEIVED', 'COMPLETED', 'ACCESS', { isSynthetic: true })
      expect(res1.allowed).toBe(false)
      expect(res1.blockerCode).toBe('INVALID_TRANSITION')

      const res2 = canTransitionDsrStatus('PROCESSING', 'RECEIVED', 'ACCESS', { isSynthetic: true })
      expect(res2.allowed).toBe(false)
      expect(res2.blockerCode).toBe('INVALID_TRANSITION')

      const res3 = canTransitionDsrStatus('IN_REVIEW', 'COMPLETED', 'ACCESS', { isSynthetic: true })
      expect(res3.allowed).toBe(false)
      expect(res3.blockerCode).toBe('INVALID_TRANSITION')
    })
  })

  // ===========================================================================
  // 2. COMPLETION GATES & DESTRUCTIVE EXECUTION SHIELD
  // ===========================================================================
  describe('2. Completion Gates & Destructive Execution Shield', () => {
    it('blocks COMPLETED for real users on destructive rights with REAL_USER_LIFECYCLE_EXECUTION_DISABLED', () => {
      const destructiveRights: LgpdRight[] = ['DELETION', 'ANONYMIZATION', 'BLOCKING']

      for (const right of destructiveRights) {
        const result = validateCompletionGate(right, {
          isSynthetic: false,
          hasCompletedLifecycleExecution: true, // Even if execution is claimed, real user must be blocked
        })

        expect(result.allowed).toBe(false)
        expect(result.blockerCode).toBe('REAL_USER_LIFECYCLE_EXECUTION_DISABLED')
        expect(result.reason).toContain('desativada')
      }
    })

    it('requires completed lifecycle execution for synthetic destructive rights', () => {
      const destructiveRights: LgpdRight[] = ['DELETION', 'ANONYMIZATION', 'BLOCKING']

      for (const right of destructiveRights) {
        // Without completed execution -> BLOCKED
        const blockedRes = validateCompletionGate(right, {
          isSynthetic: true,
          hasCompletedLifecycleExecution: false,
        })
        expect(blockedRes.allowed).toBe(false)
        expect(blockedRes.blockerCode).toBe('SYNTHETIC_EXECUTION_REQUIRED')

        // With completed execution -> ALLOWED
        const allowedRes = validateCompletionGate(right, {
          isSynthetic: true,
          hasCompletedLifecycleExecution: true,
        })
        expect(allowedRes.allowed).toBe(true)
      }
    })

    it('requires export fulfillment evidence for PORTABILITY completion', () => {
      const blockedRes = validateCompletionGate('PORTABILITY', {
        isSynthetic: false,
        hasExportFulfilled: false,
      })
      expect(blockedRes.allowed).toBe(false)
      expect(blockedRes.blockerCode).toBe('FULFILLMENT_EVIDENCE_REQUIRED')

      const allowedRes = validateCompletionGate('PORTABILITY', {
        isSynthetic: false,
        hasExportFulfilled: true,
      })
      expect(allowedRes.allowed).toBe(true)
    })

    it('permits completion of non-destructive rights with justification', () => {
      const nonDestructiveRights: LgpdRight[] = [
        'CORRECTION',
        'CONSENT_REVOCATION',
        'SHARING_INFORMATION',
        'AUTOMATED_DECISION_REVIEW',
      ]

      for (const right of nonDestructiveRights) {
        // Without operator notes -> BLOCKED
        const blockedRes = validateCompletionGate(right, {
          isSynthetic: false,
        })
        expect(blockedRes.allowed).toBe(false)
        expect(blockedRes.blockerCode).toBe('OPERATOR_JUSTIFICATION_REQUIRED')

        // With operator notes -> ALLOWED
        const allowedRes = validateCompletionGate(right, {
          isSynthetic: false,
          operatorNotes: 'Atendimento concluído conforme solicitação do titular.',
        })
        expect(allowedRes.allowed).toBe(true)
      }
    })
  })

  // ===========================================================================
  // 3. REJECTION TAXONOMY & OPERATOR JUSTIFICATION GATES
  // ===========================================================================
  describe('3. Rejection Taxonomy & Operator Justification', () => {
    it('mandates a recognized reason code when rejecting', () => {
      // Missing code
      const res1 = validateRejectionGate(undefined)
      expect(res1.allowed).toBe(false)
      expect(res1.blockerCode).toBe('INVALID_REASON_CODE')

      // Invalid code
      const res2 = validateRejectionGate('BECAUSE_I_SAID_SO' as any)
      expect(res2.allowed).toBe(false)
      expect(res2.blockerCode).toBe('INVALID_REASON_CODE')
    })

    it('accepts canonical rejection reasons', () => {
      for (const code of DSR_REJECTION_REASONS) {
        if (code === 'OTHER_JUSTIFIED') continue
        const res = validateRejectionGate(code)
        expect(res.allowed).toBe(true)
      }
    })

    it('requires operatorNotes when reasonCode is OTHER_JUSTIFIED', () => {
      const blockedRes = validateRejectionGate('OTHER_JUSTIFIED', '')
      expect(blockedRes.allowed).toBe(false)
      expect(blockedRes.blockerCode).toBe('NOTE_REQUIRED_FOR_OTHER')

      const allowedRes = validateRejectionGate(
        'OTHER_JUSTIFIED',
        'Justificativa jurídica e técnica formalizada no processo interno.'
      )
      expect(allowedRes.allowed).toBe(true)
    })
  })

  // ===========================================================================
  // 4. SERVER ACTION AUTHORIZATION & INTEGRITY
  // ===========================================================================
  describe('4. Server Action: adminTransitionDsrAction', () => {
    it('rejects unauthenticated or non-admin callers', async () => {
      vi.spyOn(moderationGuards, 'requireAdmin').mockRejectedValue(new Error('Forbidden'))

      const res = await adminTransitionDsrAction({
        requestId: 'req-1',
        expectedCurrentStatus: 'RECEIVED',
        targetStatus: 'IN_REVIEW',
      })

      expect(res.success).toBe(false)
      expect(res.code).toBe('FORBIDDEN')
    })

    it('validates mandatory parameters', async () => {
      vi.spyOn(moderationGuards, 'requireAdmin').mockResolvedValue({
        id: 'admin-1',
        auth_user_id: 'auth-admin',
        role: 'ADMIN',
        status: 'ACTIVE',
      } as any)

      const res = await adminTransitionDsrAction({
        requestId: '',
        expectedCurrentStatus: 'RECEIVED',
        targetStatus: 'IN_REVIEW',
      })

      expect(res.success).toBe(false)
      expect(res.code).toBe('INVALID_PARAMETERS')
    })

    it('blocks real-user destructive requests from transitioning to COMPLETED', async () => {
      vi.spyOn(moderationGuards, 'requireAdmin').mockResolvedValue({
        id: 'admin-1',
        auth_user_id: 'auth-admin',
        role: 'ADMIN',
        status: 'ACTIVE',
      } as any)

      // Mock request from a real user
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'dsr-real-del',
          request_type: 'DELETION',
          status: 'PROCESSING',
          requester_account_user_id: 'real-user-123',
          details: {},
        },
        error: null,
      })

      const mockQuery: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockImplementation(() => mockSingle()),
      }

      const mockAdmin = {
        from: vi.fn().mockReturnValue(mockQuery),
        auth: { admin: { getUserById: vi.fn().mockResolvedValue({ data: null }) } },
      }

      vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any)

      const res = await adminTransitionDsrAction({
        requestId: 'dsr-real-del',
        expectedCurrentStatus: 'PROCESSING',
        targetStatus: 'COMPLETED',
      })

      expect(res.success).toBe(false)
      expect(res.code).toBe('REAL_USER_LIFECYCLE_EXECUTION_DISABLED')
    })

    it('delegates to atomic RPC when transition and gates succeed', async () => {
      const adminAccount = {
        id: 'admin-uuid',
        auth_user_id: 'auth-uuid',
        role: 'ADMIN' as const,
        status: 'ACTIVE' as const,
      }
      vi.spyOn(moderationGuards, 'requireAdmin').mockResolvedValue(adminAccount as any)

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'dsr-123',
          request_type: 'ACCESS',
          status: 'RECEIVED',
          requester_account_user_id: 'user-456',
          details: {},
        },
        error: null,
      })

      const mockAdmin = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: mockSingle,
            }),
          }),
        }),
      }

      vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any)

      const rpcSpy = vi.spyOn(privacyDal, 'adminTransitionDataSubjectRequest').mockResolvedValue({
        success: true,
        requestId: 'dsr-123',
        previousStatus: 'RECEIVED',
        newStatus: 'IN_REVIEW',
        eventId: 'evt-123',
        eventType: 'REVIEW_STARTED',
      })

      const res = await adminTransitionDsrAction({
        requestId: 'dsr-123',
        expectedCurrentStatus: 'RECEIVED',
        targetStatus: 'IN_REVIEW',
        operatorNotes: 'Iniciando verificação técnica',
      })

      expect(res.success).toBe(true)
      expect(rpcSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'dsr-123',
          expectedCurrentStatus: 'RECEIVED',
          targetStatus: 'IN_REVIEW',
          adminAccountId: 'admin-uuid',
          operatorNotes: 'Iniciando verificação técnica',
        })
      )
    })
  })
})
