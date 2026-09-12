import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateAgeBucket,
  getPrivacyProcessors,
  getPrivacyRetentionPolicies,
  getPrivacyRisksAndPendingDecisions,
  exportPrivacyAggregatedCsv,
  type AgeBucket,
} from '@/modules/privacy/operations-dal'
import { LGPD_RIGHTS } from '@/modules/privacy/types'
import { ptBRMessages, enMessages } from '@/lib/i18n/catalog'
import {
  getAdminPrivacyOperationsSummaryAction,
  getAdminPrivacyRequestsAction,
  getAdminPrivacyRequestDetailAction,
  getAdminPrivacyExecutionsAction,
  getAdminPrivacyExecutionDetailAction,
  exportAdminPrivacyReportCsvAction,
} from '@/modules/privacy/actions'

// Mock requireAdmin from moderation guards
vi.mock('@/modules/moderation/guards', () => ({
  requireAdmin: vi.fn(),
}))

// Mock Supabase admin client for DAL tests
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'data_subject_requests') {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [
                {
                  id: 'dsr-001',
                  request_type: 'DELETION',
                  status: 'RECEIVED',
                  requester_account_user_id: 'real-user-1',
                  created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
                  updated_at: new Date().toISOString(),
                  details: {},
                },
                {
                  id: 'dsr-002',
                  request_type: 'PORTABILITY',
                  status: 'COMPLETED',
                  requester_account_user_id: 'synth-user-1',
                  created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
                  updated_at: new Date().toISOString(),
                  details: { synthetic: true, reason: 'LGPD synthetic fixture test' },
                },
              ],
              error: null,
            })),
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({
                data: {
                  id: 'dsr-001',
                  request_type: 'DELETION',
                  status: 'RECEIVED',
                  requester_account_user_id: 'real-user-1',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  details: {},
                },
                error: null,
              })),
            })),
          })),
        }
      }
      if (table === 'account_users') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({
              data: [
                { id: 'real-user-1', role: 'ADVERTISER', auth_user_id: 'auth-1' },
                { id: 'synth-user-1', role: 'ADVERTISER', auth_user_id: 'auth-synth' },
              ],
              error: null,
            })),
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({
                data: { id: 'real-user-1', role: 'ADVERTISER' },
                error: null,
              })),
            })),
          })),
        }
      }
      if (table === 'privacy_lifecycle_executions') {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [
                {
                  id: 'exec-001',
                  mode: 'SYNTHETIC_DESTRUCTIVE',
                  status: 'COMPLETED',
                  current_phase: 'COMPLETED',
                  subject_email: 'synthetic-lgpd-advertiser-01@ad-marketplace-synthetic.invalid',
                  metadata: {
                    deleteCount: 1,
                    deleteRecordCount: 32,
                    anonymizeCount: 1,
                    reviewRequiredCount: 6,
                  },
                  created_at: new Date().toISOString(),
                },
              ],
              error: null,
            })),
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({
                data: {
                  id: 'exec-001',
                  mode: 'SYNTHETIC_DESTRUCTIVE',
                  status: 'COMPLETED',
                  current_phase: 'COMPLETED',
                  plan_fingerprint: 'd62a83a068f4ac8a25bbf28225bab64d2e44a2bb9f030491954f9bf12a08290b',
                  subject_email: 'synthetic-lgpd-advertiser-01@ad-marketplace-synthetic.invalid',
                  metadata: { deleteCount: 1, reviewRequiredCount: 6 },
                  started_at: new Date().toISOString(),
                  completed_at: new Date().toISOString(),
                },
                error: null,
              })),
            })),
          })),
        }
      }
      if (table === 'privacy_lifecycle_execution_events' || table === 'data_subject_request_events') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({
                data: [
                  {
                    id: 'ev-1',
                    phase: 'COMPLETED',
                    event_type: 'EXECUTION_COMPLETED',
                    actor: 'SYSTEM',
                    created_at: new Date().toISOString(),
                    metadata: { safeCount: 5 },
                  },
                ],
                error: null,
              })),
            })),
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        }
      }
      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      }
    }),
  })),
}))

describe('LGPD-02B.1 — Admin Privacy Operations & Reporting Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Security & requireAdmin Protection
  describe('1. Security & Access Control (requireAdmin)', () => {
    it('blocks unauthenticated access or non-admin roles for summary action', async () => {
      const { requireAdmin } = await import('@/modules/moderation/guards')
      vi.mocked(requireAdmin).mockRejectedValueOnce(new Error('Acesso restrito a administradores.'))

      const res = await getAdminPrivacyOperationsSummaryAction()
      expect(res.success).toBe(false)
      expect(res.code).toBe('FORBIDDEN')
    })

    it('blocks non-admin for requests list action', async () => {
      const { requireAdmin } = await import('@/modules/moderation/guards')
      vi.mocked(requireAdmin).mockRejectedValueOnce(new Error('Acesso restrito a administradores.'))

      const res = await getAdminPrivacyRequestsAction()
      expect(res.success).toBe(false)
      expect(res.code).toBe('FORBIDDEN')
    })

    it('blocks non-admin for request detail action', async () => {
      const { requireAdmin } = await import('@/modules/moderation/guards')
      vi.mocked(requireAdmin).mockRejectedValueOnce(new Error('Acesso restrito a administradores.'))

      const res = await getAdminPrivacyRequestDetailAction('dsr-123')
      expect(res.success).toBe(false)
      expect(res.code).toBe('FORBIDDEN')
    })

    it('blocks non-admin for executions list action', async () => {
      const { requireAdmin } = await import('@/modules/moderation/guards')
      vi.mocked(requireAdmin).mockRejectedValueOnce(new Error('Acesso restrito a administradores.'))

      const res = await getAdminPrivacyExecutionsAction()
      expect(res.success).toBe(false)
      expect(res.code).toBe('FORBIDDEN')
    })

    it('blocks non-admin for execution detail action', async () => {
      const { requireAdmin } = await import('@/modules/moderation/guards')
      vi.mocked(requireAdmin).mockRejectedValueOnce(new Error('Acesso restrito a administradores.'))

      const res = await getAdminPrivacyExecutionDetailAction('exec-123')
      expect(res.success).toBe(false)
      expect(res.code).toBe('FORBIDDEN')
    })

    it('blocks non-admin for CSV export action', async () => {
      const { requireAdmin } = await import('@/modules/moderation/guards')
      vi.mocked(requireAdmin).mockRejectedValueOnce(new Error('Acesso restrito a administradores.'))

      const res = await exportAdminPrivacyReportCsvAction()
      expect(res.success).toBe(false)
      expect(res.code).toBe('FORBIDDEN')
    })
  })

  // 2. Request Age Buckets & No Fake SLA
  describe('2. Request Age Calculation (No Fake SLA)', () => {
    it('categorizes under 24 hours correctly', () => {
      const now = new Date(Date.now() - 2 * 3600 * 1000).toISOString()
      const { bucket } = calculateAgeBucket(now)
      expect(bucket).toBe('< 24h')
    })

    it('categorizes 1-5 days correctly', () => {
      const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
      const { bucket } = calculateAgeBucket(twoDaysAgo)
      expect(bucket).toBe('1–5 days')
    })

    it('categorizes 6-15 days correctly', () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
      const { bucket } = calculateAgeBucket(tenDaysAgo)
      expect(bucket).toBe('6–15 days')
    })

    it('categorizes 16-30 days correctly', () => {
      const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString()
      const { bucket } = calculateAgeBucket(twentyDaysAgo)
      expect(bucket).toBe('16–30 days')
    })

    it('categorizes over 30 days correctly', () => {
      const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString()
      const { bucket } = calculateAgeBucket(fortyDaysAgo)
      expect(bucket).toBe('> 30 days')
    })

    it('does not contain prohibited SLA violation strings', () => {
      const validBuckets: AgeBucket[] = ['< 24h', '1–5 days', '6–15 days', '16–30 days', '> 30 days']
      for (const b of validBuckets) {
        expect(b).not.toMatch(/late|overdue|non-compliant|breached/i)
      }
    })
  })

  // 3. Canonical Vocabulary & Types
  describe('3. Canonical DSR Types & Vocabulary', () => {
    it('contains strictly the 9 canonical LGPD rights', () => {
      expect(LGPD_RIGHTS).toHaveLength(9)
      expect(LGPD_RIGHTS).toEqual([
        'ACCESS',
        'CORRECTION',
        'ANONYMIZATION',
        'BLOCKING',
        'DELETION',
        'PORTABILITY',
        'CONSENT_REVOCATION',
        'SHARING_INFORMATION',
        'AUTOMATED_DECISION_REVIEW',
      ])
    })

    it('does NOT contain parallel or non-canonical vocabulary', () => {
      expect((LGPD_RIGHTS as readonly string[]).includes('EXPORT')).toBe(false)
      expect((LGPD_RIGHTS as readonly string[]).includes('PENDING')).toBe(false)
    })
  })

  // 4. Processors Canonical Inventory
  describe('4. External Processors Inventory Invariants', () => {
    it('sources processors from CONFIRMED_EXTERNAL_PROCESSORS', () => {
      const processors = getPrivacyProcessors()
      expect(processors.length).toBeGreaterThanOrEqual(5)

      const names = processors.map((p) => p.system)
      expect(names).toContain('Supabase Inc.')
      expect(names).toContain('Vercel Inc.')
      expect(names).toContain('Didit (Didit Verification)')
      expect(names).toContain('OpenAI, L.L.C.')
      expect(names).toContain('Payment Provider (Currently Mock)')
    })

    it('enforces OpenAI as CONFIGURED_BUT_DISABLED', () => {
      const processors = getPrivacyProcessors()
      const openAi = processors.find((p) => p.system.includes('OpenAI'))
      expect(openAi).toBeDefined()
      expect(openAi?.status).toBe('CONFIGURED_BUT_DISABLED')
    })

    it('enforces Didit contract as NOT_REVIEWED', () => {
      const processors = getPrivacyProcessors()
      const didit = processors.find((p) => p.system.includes('Didit'))
      expect(didit).toBeDefined()
      expect(didit?.contractReviewStatus).toBe('NOT_REVIEWED')
      expect(didit?.deletionCapability).toBe('UNKNOWN')
    })

    it('enforces Mock Payment as MOCK_ONLY', () => {
      const processors = getPrivacyProcessors()
      const payment = processors.find((p) => p.system.includes('Payment'))
      expect(payment).toBeDefined()
      expect(payment?.status).toBe('MOCK_ONLY')
    })
  })

  // 5. Retention Framework Invariants
  describe('5. Read-Only Retention Framework Invariants', () => {
    it('ensures all retention policies are strictly DRAFT and UNDEFINED', () => {
      const policies = getPrivacyRetentionPolicies()
      expect(policies.length).toBeGreaterThanOrEqual(4)

      for (const policy of policies) {
        expect(policy.policyVersion).toContain('DRAFT')
        expect(policy.durationDraftDays).toBeNull()
        expect(policy.approvedAt).toBeNull()
        expect(policy.approvedBy).toBeNull()
        expect(policy.legalBasisStatus).toBe('LEGAL_APPROVAL_REQUIRED')
      }
    })
  })

  // 6. CSV Export Minimization & PII Safety
  describe('6. Aggregated Non-PII CSV Export', () => {
    it('generates valid CSV with strictly aggregated non-PII columns', async () => {
      const csv = await exportPrivacyAggregatedCsv({ period: '30d' })

      const lines = csv.split('\n')
      expect(lines[0]).toBe('Period,Dimension,Category,Count,Percentage,Notes')

      // Assert no sensitive PII keywords exist in output
      expect(csv).not.toMatch(/password|secret|token|hash|salt|cpf|rg|biometric/i)
      expect(csv).not.toMatch(/@gmail\.com|@hotmail\.com|whatsapp|phone/i)

      // Assert canonical dimensions are exported
      expect(csv).toContain('"REQUEST_TYPE"')
      expect(csv).toContain('"REQUEST_STATUS"')
      expect(csv).toContain('"REQUEST_AGE_BUCKET"')
      expect(csv).toContain('"LIFECYCLE_OUTCOME"')
      expect(csv).toContain('"VOLUME_SUMMARY"')
    })
  })

  // 7. Source-Driven Risks & Pending Decisions
  describe('7. Consolidated Risks & Pending Decisions', () => {
    it('reports canonical source-driven risks', async () => {
      const risks = await getPrivacyRisksAndPendingDecisions({ includeSynthetic: true })
      expect(risks.length).toBeGreaterThanOrEqual(4)

      const ids = risks.map((r) => r.id)
      expect(ids).toContain('RISK-RET-DRAFT')
      expect(ids).toContain('RISK-DPA-PENDING')
      expect(ids).toContain('RISK-DIDIT-ERASURE')
      expect(ids).toContain('RISK-OPENAI-STAGED')

      // All statutory risks require legal review
      const retRisk = risks.find((r) => r.id === 'RISK-RET-DRAFT')
      expect(retRisk?.legalReviewRequired).toBe(true)
      expect(retRisk?.severity).toBe('HIGH')
    })
  })

  // 8. Translation Coverage
  describe('8. PT-BR and EN Translation Coverage', () => {
    const requiredKeys = [
      'admin.privacyTabOverview',
      'admin.privacyTabRequests',
      'admin.privacyTabExecutions',
      'admin.privacyTabReports',
      'admin.privacyTabProcessors',
      'admin.privacyTabRetention',
      'admin.privacyTabAudit',
      'admin.privacyTabRisks',
      'admin.includeSynthetic',
      'admin.syntheticDevBadge',
      'admin.realOperationalBadge',
      'admin.btnExportCsv',
      'admin.retentionDraftNotice',
    ] as const

    it('has all required keys defined in ptBRMessages', () => {
      for (const key of requiredKeys) {
        expect(ptBRMessages[key]).toBeDefined()
        expect(ptBRMessages[key].length).toBeGreaterThan(0)
      }
    })

    it('has all required keys defined in enMessages', () => {
      for (const key of requiredKeys) {
        expect(enMessages[key]).toBeDefined()
        expect(enMessages[key].length).toBeGreaterThan(0)
      }
    })
  })

  // 9. Zero Destructive Buttons Invariant
  describe('9. Zero Destructive Buttons / Controls Invariant', () => {
    it('verifies that no destructive action exports exist in operations dal or actions', async () => {
      const actions = await import('@/modules/privacy/actions')
      const exportedNames = Object.keys(actions)

      // Ensure no generic delete user, purge, or force delete is exposed
      expect(exportedNames).not.toContain('deleteUserAction')
      expect(exportedNames).not.toContain('deleteAccountAction')
      expect(exportedNames).not.toContain('forceDeleteAction')
      expect(exportedNames).not.toContain('purgeDatabaseAction')
      expect(exportedNames).not.toContain('executeDeletionAction')
    })
  })
})
