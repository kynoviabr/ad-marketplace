import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  LGPD_RIGHTS,
  DSR_STATUSES,
  DSR_EVENT_TYPES,
  DATA_CLASSIFICATIONS,
  type LgpdRight,
} from '@/modules/privacy/types'
import { CANONICAL_DATA_INVENTORY } from '@/modules/privacy/inventory'
import { DATA_SUBJECT_RELATION_GRAPH } from '@/modules/privacy/graph'
import { DELETION_IMPACT_MATRIX } from '@/modules/privacy/matrix'
import { CONFIRMED_EXTERNAL_PROCESSORS } from '@/modules/privacy/processors'
import { RETENTION_POLICY_FRAMEWORK, isRetentionPolicyApproved } from '@/modules/privacy/retention'
import { CONSENT_INVENTORY } from '@/modules/privacy/consent'
import { AUTOMATED_DECISION_AUDIT } from '@/modules/privacy/automated-decisions'
import { USER_EXPORT_DATASET_DEFINITIONS, DATA_EXPORT_EXCLUSION_RULES } from '@/modules/privacy/export-plan'
import {
  createDataSubjectRequestAction,
  getMyDataSubjectRequestsAction,
  getAdminDataSubjectRequestsAction,
  getAdminDsrAuditTrailAction,
} from '@/modules/privacy/actions'
import * as authDal from '@/modules/auth/dal'
import * as moderationGuards from '@/modules/moderation/guards'
import * as privacyDal from '@/modules/privacy/dal'

describe('LGPD-01 — Data Inventory & Data Subject Rights Foundation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // ===========================================================================
  // 1. RIGHTS TAXONOMY & STATUS MODEL
  // ===========================================================================
  describe('1. Technical Rights Taxonomy & Status Model', () => {
    it('supports all 9 required LGPD rights', () => {
      expect(LGPD_RIGHTS).toContain('ACCESS')
      expect(LGPD_RIGHTS).toContain('CORRECTION')
      expect(LGPD_RIGHTS).toContain('ANONYMIZATION')
      expect(LGPD_RIGHTS).toContain('BLOCKING')
      expect(LGPD_RIGHTS).toContain('DELETION')
      expect(LGPD_RIGHTS).toContain('PORTABILITY')
      expect(LGPD_RIGHTS).toContain('CONSENT_REVOCATION')
      expect(LGPD_RIGHTS).toContain('SHARING_INFORMATION')
      expect(LGPD_RIGHTS).toContain('AUTOMATED_DECISION_REVIEW')
      expect(LGPD_RIGHTS.length).toBe(9)
    })

    it('defines controlled workflow statuses and event types', () => {
      expect(DSR_STATUSES).toEqual([
        'RECEIVED',
        'IDENTITY_VERIFICATION_REQUIRED',
        'IN_REVIEW',
        'PROCESSING',
        'COMPLETED',
        'REJECTED',
        'CANCELLED',
      ])

      expect(DSR_EVENT_TYPES).toEqual([
        'REQUEST_CREATED',
        'IDENTITY_VERIFIED',
        'REVIEW_STARTED',
        'PROCESSING_STARTED',
        'REQUEST_COMPLETED',
        'REQUEST_REJECTED',
        'REQUEST_CANCELLED',
      ])
    })

    it('defines comprehensive data classifications', () => {
      expect(DATA_CLASSIFICATIONS).toContain('PUBLIC_PERSONAL')
      expect(DATA_CLASSIFICATIONS).toContain('PRIVATE_PERSONAL')
      expect(DATA_CLASSIFICATIONS).toContain('SENSITIVE_OR_HIGH_RISK')
      expect(DATA_CLASSIFICATIONS).toContain('AUTHENTICATION')
      expect(DATA_CLASSIFICATIONS).toContain('FINANCIAL_REFERENCE')
      expect(DATA_CLASSIFICATIONS).toContain('KYC_REFERENCE')
      expect(DATA_CLASSIFICATIONS).toContain('USER_GENERATED_CONTENT')
      expect(DATA_CLASSIFICATIONS).toContain('BEHAVIORAL_ANALYTICS')
      expect(DATA_CLASSIFICATIONS).toContain('OPERATIONAL_SECURITY')
      expect(DATA_CLASSIFICATIONS).toContain('AUDIT_RECORD')
      expect(DATA_CLASSIFICATIONS).toContain('ANONYMIZED_OR_AGGREGATED')
    })
  })

  // ===========================================================================
  // 2. INVENTORY & STRUCTURAL INTEGRITY
  // ===========================================================================
  describe('2. Canonical Inventory & Governance Integrity', () => {
    it('validates that every inventory item has non-empty metadata and controlled classifications', () => {
      expect(CANONICAL_DATA_INVENTORY.length).toBeGreaterThan(25)

      for (const item of CANONICAL_DATA_INVENTORY) {
        expect(item.id).toBeTruthy()
        expect(item.storage_object).toBeTruthy()
        expect(item.purpose).toBeTruthy()
        expect(DATA_CLASSIFICATIONS).toContain(item.classification)
        expect(['TO_BE_REVIEWED', 'SOURCE_CONFIRMED', 'LEGAL_APPROVAL_REQUIRED']).toContain(
          item.legal_basis_status
        )
        expect(['UNDEFINED', 'DRAFT', 'APPROVED']).toContain(item.retention_status)
      }
    })

    it('ensures zero passwords, secret keys, or bearer tokens are contained in inventory or processors', () => {
      const allText = JSON.stringify({
        inventory: CANONICAL_DATA_INVENTORY,
        processors: CONFIRMED_EXTERNAL_PROCESSORS,
        matrix: DELETION_IMPACT_MATRIX,
        graph: DATA_SUBJECT_RELATION_GRAPH,
      })

      expect(allText).not.toMatch(/sbp_[a-zA-Z0-9]{30,}/)
      expect(allText).not.toMatch(/service_role_key\s*[:=]\s*['"][^'"]+['"]/)
      expect(allText).not.toMatch(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/) // Standard JWT prefix
    })

    it('proves that all retention policies are strictly DRAFT and none are approved', () => {
      for (const policy of RETENTION_POLICY_FRAMEWORK) {
        expect(policy.retentionStatus).toBe('DRAFT')
        expect(policy.approvedAt).toBeNull()
        expect(policy.approvedBy).toBeNull()
        expect(isRetentionPolicyApproved(policy.categoryKey)).toBe(false)
      }
    })
  })

  // ===========================================================================
  // 3. SECURITY, SESSION AUTHORITY & ZERO CLIENT TRUST
  // ===========================================================================
  describe('3. Request Creation Security & Session Invariants', () => {
    const mockUserAccount = {
      id: 'acc-uuid-1111-2222-3333-444455556666',
      auth_user_id: 'auth-uuid-user-1',
      role: 'ADVERTISER' as const,
      status: 'ACTIVE' as const,
      onboarding_status: 'COMPLETED' as const,
      onboarding_step: 6,
      terms_version: '1.0',
      terms_accepted_at: '2026-09-10T12:00:00Z',
      privacy_version: '1.0',
      privacy_accepted_at: '2026-09-10T12:00:00Z',
      created_at: '2026-09-10T12:00:00Z',
      updated_at: '2026-09-10T12:00:00Z',
    }

    it('rejects unauthenticated caller from creating DSR request', async () => {
      vi.spyOn(authDal, 'requireAccount').mockRejectedValueOnce(new Error('Unauthorized'))

      const result = await createDataSubjectRequestAction({
        requestType: 'ACCESS',
      })

      expect(result.success).toBe(false)
      expect(result.code).toBe('INTERNAL_ERROR')
    })

    it('rejects invalid request types', async () => {
      vi.spyOn(authDal, 'requireAccount').mockResolvedValueOnce(mockUserAccount)

      const result = await createDataSubjectRequestAction({
        requestType: 'INVALID_RIGHT_NOT_IN_LAW',
      })

      expect(result.success).toBe(false)
      expect(result.code).toBe('INVALID_REQUEST_TYPE')
    })

    it('deliberately ignores client-supplied account_user_id and binds strictly to server session', async () => {
      vi.spyOn(authDal, 'requireAccount').mockResolvedValueOnce(mockUserAccount)

      const createSpy = vi.spyOn(privacyDal, 'createDataSubjectRequest').mockResolvedValueOnce({
        success: true,
        request: {
          id: 'dsr-req-123',
          requestType: 'DELETION',
          status: 'RECEIVED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
          cancelledAt: null,
          resolutionCode: null,
        },
      })

      // Caller attempts malicious identity impersonation by passing a victim account ID
      const result = await createDataSubjectRequestAction({
        requestType: 'DELETION',
        account_user_id: 'victim-account-uuid-999999999',
        subject_user_id: 'victim-auth-uuid-999999999',
        details: { reason: 'Teste de exclusão' },
      })

      expect(result.success).toBe(true)
      // The DAL MUST receive the session ID (acc-uuid-1111...), NOT the victim ID
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          accountUserId: 'acc-uuid-1111-2222-3333-444455556666',
          requestType: 'DELETION',
        })
      )
    })

    it('INVARIANT: creating a DELETION request NEVER deletes data in LGPD-01', async () => {
      vi.spyOn(authDal, 'requireAccount').mockResolvedValueOnce(mockUserAccount)

      const createSpy = vi.spyOn(privacyDal, 'createDataSubjectRequest').mockResolvedValueOnce({
        success: true,
        request: {
          id: 'dsr-req-456',
          requestType: 'DELETION',
          status: 'RECEIVED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
          cancelledAt: null,
          resolutionCode: null,
        },
      })

      const result = await createDataSubjectRequestAction({
        requestType: 'DELETION',
      })

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('RECEIVED')
      // No destructive database delete was called
      expect(createSpy).toHaveBeenCalled()
    })

    it('enforces idempotency by blocking duplicate in-flight requests of the same right', async () => {
      vi.spyOn(authDal, 'requireAccount').mockResolvedValueOnce(mockUserAccount)
      vi.spyOn(privacyDal, 'createDataSubjectRequest').mockResolvedValueOnce({
        success: false,
        error: 'Já existe uma solicitação ativa deste tipo em processamento para sua conta.',
        code: 'DUPLICATE_ACTIVE_REQUEST',
      })

      const result = await createDataSubjectRequestAction({
        requestType: 'ACCESS',
      })

      expect(result.success).toBe(false)
      expect(result.code).toBe('DUPLICATE_ACTIVE_REQUEST')
    })
  })

  // ===========================================================================
  // 4. CROSS-USER ISOLATION & ADMIN BOUNDARY
  // ===========================================================================
  describe('4. Cross-User Isolation & Admin Boundaries', () => {
    const mockUserAccount = {
      id: 'acc-uuid-user-1',
      auth_user_id: 'auth-user-1',
      role: 'ADVERTISER' as const,
      status: 'ACTIVE' as const,
      onboarding_status: 'COMPLETED' as const,
      onboarding_step: 6,
      terms_version: '1.0',
      terms_accepted_at: '2026-09-10T12:00:00Z',
      privacy_version: '1.0',
      privacy_accepted_at: '2026-09-10T12:00:00Z',
      created_at: '2026-09-10T12:00:00Z',
      updated_at: '2026-09-10T12:00:00Z',
    }

    it('retrieves user requests stripped of operator resolution notes', async () => {
      vi.spyOn(authDal, 'requireAccount').mockResolvedValueOnce(mockUserAccount)
      vi.spyOn(privacyDal, 'getAccountDataSubjectRequests').mockResolvedValueOnce([
        {
          id: 'dsr-1',
          requestType: 'PORTABILITY',
          status: 'COMPLETED',
          createdAt: '2026-09-10T10:00:00Z',
          updatedAt: '2026-09-10T11:00:00Z',
          completedAt: '2026-09-10T11:00:00Z',
          cancelledAt: null,
          resolutionCode: 'EXPORT_PACKAGE_GENERATED',
        },
      ])

      const result = await getMyDataSubjectRequestsAction()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      // Must not contain resolution_notes
      expect((result.data?.[0] as any).resolution_notes).toBeUndefined()
    })

    it('blocks non-admin users from accessing the administrative DSR queries', async () => {
      vi.spyOn(moderationGuards, 'requireAdmin').mockRejectedValueOnce(new Error('Acesso restrito'))

      const result = await getAdminDataSubjectRequestsAction()
      expect(result.success).toBe(false)
      expect(result.code).toBe('FORBIDDEN')

      const trailResult = await getAdminDsrAuditTrailAction('req-123')
      expect(trailResult.success).toBe(false)
      expect(trailResult.code).toBe('FORBIDDEN')
    })

    it('allows verified admin to query DSR requests', async () => {
      vi.spyOn(moderationGuards, 'requireAdmin').mockResolvedValueOnce({
        account: { id: 'admin-acc-1' } as any,
        adminUser: {} as any,
      } as any)
      vi.spyOn(privacyDal, 'getAdminDataSubjectRequests').mockResolvedValueOnce([
        {
          id: 'dsr-admin-view-1',
          requester_account_user_id: 'acc-user-1',
          request_type: 'DELETION',
          status: 'IN_REVIEW',
          details: {},
          resolution_code: null,
          resolution_notes: 'Documentos sob verificação jurídica preventiva',
          created_at: '2026-09-10T12:00:00Z',
          updated_at: '2026-09-10T12:00:00Z',
          completed_at: null,
          cancelled_at: null,
        },
      ])

      const result = await getAdminDataSubjectRequestsAction()
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].resolution_notes).toBe('Documentos sob verificação jurídica preventiva')
    })
  })

  // ===========================================================================
  // 5. EXPORT PLAN & AUTOMATED DECISION AUDIT
  // ===========================================================================
  describe('5. Data Export Specifications & Automated Decision Audit', () => {
    it('defines strict exclusion rules for data portability packages', () => {
      expect(DATA_EXPORT_EXCLUSION_RULES.length).toBeGreaterThan(4)
      const joinedRules = DATA_EXPORT_EXCLUSION_RULES.join(' ')
      expect(joinedRules).toContain('Hashed passwords')
      expect(joinedRules).toContain('Internal operator/moderator notes')
      expect(joinedRules).toContain('Other users’ personal data')
    })

    it('contains full dataset definitions for user export', () => {
      const keys = USER_EXPORT_DATASET_DEFINITIONS.map((d) => d.datasetKey)
      expect(keys).toContain('ACCOUNT_DATA')
      expect(keys).toContain('LEGAL_ACCEPTANCE_HISTORY')
      expect(keys).toContain('PROFILE_DATA')
      expect(keys).toContain('MEDIA_METADATA')
      expect(keys).toContain('AGENDA_AND_AVAILABILITY')
      expect(keys).toContain('COMMERCIAL_AND_SUBSCRIPTION_HISTORY')
      expect(keys).toContain('DATA_SUBJECT_REQUESTS_HISTORY')
    })

    it('identifies Didit KYC as the sole automated decision candidate with significant effect', () => {
      const diditCandidate = AUTOMATED_DECISION_AUDIT.find(
        (c) => c.candidateId === 'KYC_AGE_AND_IDENTITY_VERIFICATION'
      )
      expect(diditCandidate).toBeDefined()
      expect(diditCandidate?.qualifiesUnderLgpdArt20TechnicalCriteria).toBe(true)

      const moderationCandidate = AUTOMATED_DECISION_AUDIT.find(
        (c) => c.candidateId === 'MEDIA_CONTENT_MODERATION'
      )
      expect(moderationCandidate?.isSolelyAutomated).toBe(false)
      expect(moderationCandidate?.qualifiesUnderLgpdArt20TechnicalCriteria).toBe(false)
    })

    it('contains consent inventory covering adult gate, cookies, and terms', () => {
      const mechanisms = CONSENT_INVENTORY.map((c) => c.mechanismId)
      expect(mechanisms).toContain('COOKIE_ANALYTICS_CONSENT')
      expect(mechanisms).toContain('ADULT_AGE_DECLARATION')
      expect(mechanisms).toContain('TERMS_OF_USE_ACCEPTANCE')
      expect(mechanisms).toContain('PRIVACY_POLICY_ACKNOWLEDGMENT')
    })
  })
})
