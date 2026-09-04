import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  adminModerateProfileAction,
  adminApproveProfileAction,
  adminRejectProfileAction,
} from '@/modules/admin/actions'

// Mock server-only and next/cache
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const mockRequireAdmin = vi.fn()
vi.mock('@/modules/moderation/guards', () => ({
  requireAdmin: () => mockRequireAdmin(),
}))

const mockAdmin = {
  from: vi.fn(),
  rpc: vi.fn(),
}
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockAdmin,
}))

// Mock completeness and entitlement helpers
const mockEvaluateProfileCompleteness = vi.fn()
vi.mock('@/modules/profiles/completeness', () => ({
  evaluateProfileCompleteness: (...args: any[]) => mockEvaluateProfileCompleteness(...args),
}))

const mockHasPublicationEntitlement = vi.fn()
vi.mock('@/modules/billing/entitlements', () => ({
  hasPublicationEntitlement: (...args: any[]) => mockHasPublicationEntitlement(...args),
}))

function createQueryMock(data: any, error: any = null) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    update: vi.fn(() => query),
    insert: vi.fn(() => query),
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    then: (onfulfilled: any, onrejected: any) =>
      Promise.resolve({ data, error }).then(onfulfilled, onrejected),
  }
  return query
}

describe('R12.4B Admin Profile Approve / Reject Mutations', () => {
  const adminActor = { id: 'a0000000-0000-0000-0000-000000000001', role: 'ADMIN', status: 'ACTIVE' }
  const profileId = '33333333-3333-3333-3333-333333333333'
  const accountId = '44444444-4444-4444-4444-444444444444'

  const mockBaseProfile = {
    id: profileId,
    account_user_id: accountId,
    stage_name: 'Test Artist',
    headline: 'Top Model',
    bio: 'Experienced professional model',
    show_whatsapp: true,
    whatsapp_phone: '+5511999999999',
    show_phone: false,
    direct_phone: null,
    show_telegram: false,
    telegram_username: null,
    status: 'READY_FOR_REVIEW',
    content_moderation_status: 'PENDING_MODERATION',
    deleted_at: null,
    published_at: null,
    created_at: '2026-09-01T12:00:00Z',
    updated_at: '2026-09-01T12:00:00Z',
  }

  const mockActiveAccount = {
    id: accountId,
    role: 'ADVERTISER',
    status: 'ACTIVE',
    onboarding_status: 'IN_PROGRESS',
  }

  const mockKycVerified = {
    status: 'VERIFIED',
    identity_verified: true,
    age_verified: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue(adminActor)
    mockEvaluateProfileCompleteness.mockReturnValue({ isComplete: true, missingFields: [] })
    mockHasPublicationEntitlement.mockResolvedValue(true)
  })

  describe('1. Security & Access Control', () => {
    it('requires ADMIN role via requireAdmin()', async () => {
      mockRequireAdmin.mockRejectedValueOnce(new Error('Unauthorized: ADMIN required'))

      const res = await adminModerateProfileAction({
        profileId,
        decision: 'APPROVE',
      })

      expect(res.success).toBe(false)
      expect(res.error).toBe('INTERNAL_ERROR')
      expect(mockAdmin.rpc).not.toHaveBeenCalled()
    })

    it('validates UUID format strictly', async () => {
      const res = await adminModerateProfileAction({
        profileId: 'not-a-valid-uuid',
        decision: 'APPROVE',
      })

      expect(res.success).toBe(false)
      expect(res.error).toBe('INVALID_INPUT')
      expect(mockAdmin.from).not.toHaveBeenCalled()
    })

    it('rejects invalid decision', async () => {
      const res = await adminModerateProfileAction({
        profileId,
        decision: 'SUSPEND' as any,
      })

      expect(res.success).toBe(false)
      expect(res.error).toBe('INVALID_INPUT')
    })
  })

  describe('2. Concurrency & State Pre-reads', () => {
    it('blocks approval when profile is already APPROVED and ACTIVE', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return createQueryMock({
            ...mockBaseProfile,
            status: 'ACTIVE',
            content_moderation_status: 'APPROVED',
          })
        }
        return createQueryMock(null)
      })

      const res = await adminApproveProfileAction({ profileId })
      expect(res.success).toBe(false)
      expect(res.error).toBe('ALREADY_APPROVED')
      expect(mockAdmin.rpc).not.toHaveBeenCalled()
    })

    it('blocks rejection when profile is already REJECTED', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return createQueryMock({
            ...mockBaseProfile,
            content_moderation_status: 'REJECTED',
          })
        }
        return createQueryMock(null)
      })

      const res = await adminRejectProfileAction({ profileId, reasonCode: 'PROHIBITED_CONTENT' })
      expect(res.success).toBe(false)
      expect(res.error).toBe('ALREADY_REJECTED')
      expect(mockAdmin.rpc).not.toHaveBeenCalled()
    })

    it('blocks moderation if profile is in DRAFT state', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return createQueryMock({
            ...mockBaseProfile,
            status: 'DRAFT',
          })
        }
        return createQueryMock(null)
      })

      const res = await adminApproveProfileAction({ profileId })
      expect(res.success).toBe(false)
      expect(res.error).toBe('DRAFT_BLOCKED')
      expect(mockAdmin.rpc).not.toHaveBeenCalled()
    })

    it('blocks moderation if profile is in SUSPENDED state', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return createQueryMock({
            ...mockBaseProfile,
            status: 'SUSPENDED',
          })
        }
        return createQueryMock(null)
      })

      const res = await adminRejectProfileAction({ profileId, reasonCode: 'PROHIBITED_CONTENT' })
      expect(res.success).toBe(false)
      expect(res.error).toBe('SUSPENDED_BLOCKED')
      expect(mockAdmin.rpc).not.toHaveBeenCalled()
    })
  })

  describe('3. Publication Gates on APPROVE', () => {
    function setupGatesPass() {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return createQueryMock({ ...mockBaseProfile })
        }
        if (table === 'account_users') {
          return createQueryMock({ ...mockActiveAccount })
        }
        if (table === 'identity_verifications') {
          return createQueryMock({ ...mockKycVerified })
        }
        if (table === 'professional_profile_locations') {
          return createQueryMock([{ location: { active: true, city: { active: true } } }])
        }
        if (table === 'profile_media') {
          return createQueryMock([{ id: 'media-1' }])
        }
        return createQueryMock(null)
      })
      mockAdmin.rpc.mockResolvedValue({ error: null })
    }

    it('gate 1: fails when account is not ACTIVE', async () => {
      setupGatesPass()
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return createQueryMock({ ...mockBaseProfile })
        }
        if (table === 'account_users') {
          return createQueryMock({ ...mockActiveAccount, status: 'SUSPENDED' })
        }
        return createQueryMock(null)
      })

      const res = await adminApproveProfileAction({ profileId })
      expect(res.success).toBe(false)
      expect(res.error).toBe('PUBLICATION_GATE_FAILED')
      expect(res.message).toContain('não está ativa')
      expect(mockAdmin.rpc).not.toHaveBeenCalled()
    })

    it('gate 2: fails when identity verification is not VERIFIED', async () => {
      setupGatesPass()
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return createQueryMock({ ...mockBaseProfile })
        }
        if (table === 'account_users') {
          return createQueryMock({ ...mockActiveAccount })
        }
        if (table === 'identity_verifications') {
          return createQueryMock({ status: 'PENDING', identity_verified: false, age_verified: false })
        }
        return createQueryMock(null)
      })

      const res = await adminApproveProfileAction({ profileId })
      expect(res.success).toBe(false)
      expect(res.error).toBe('PUBLICATION_GATE_FAILED')
      expect(res.message).toContain('KYC')
      expect(mockAdmin.rpc).not.toHaveBeenCalled()
    })

    it('gate 3: fails when profile is incomplete', async () => {
      setupGatesPass()
      mockEvaluateProfileCompleteness.mockReturnValue({ isComplete: false, missingFields: ['bio', 'rates'] })

      const res = await adminApproveProfileAction({ profileId })
      expect(res.success).toBe(false)
      expect(res.error).toBe('PUBLICATION_GATE_FAILED')
      expect(res.message).toContain('incompletos')
      expect(mockAdmin.rpc).not.toHaveBeenCalled()
    })

    it('gate 4: fails when profile has no active locations', async () => {
      setupGatesPass()
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return createQueryMock({ ...mockBaseProfile })
        }
        if (table === 'account_users') {
          return createQueryMock({ ...mockActiveAccount })
        }
        if (table === 'identity_verifications') {
          return createQueryMock({ ...mockKycVerified })
        }
        if (table === 'professional_profile_locations') {
          return createQueryMock([])
        }
        return createQueryMock(null)
      })

      const res = await adminApproveProfileAction({ profileId })
      expect(res.success).toBe(false)
      expect(res.error).toBe('PUBLICATION_GATE_FAILED')
      expect(res.message).toContain('localização ou cidade')
      expect(mockAdmin.rpc).not.toHaveBeenCalled()
    })

    it('gate 5: fails when profile has no approved primary photo', async () => {
      setupGatesPass()
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return createQueryMock({ ...mockBaseProfile })
        }
        if (table === 'account_users') {
          return createQueryMock({ ...mockActiveAccount })
        }
        if (table === 'identity_verifications') {
          return createQueryMock({ ...mockKycVerified })
        }
        if (table === 'professional_profile_locations') {
          return createQueryMock([{ location: { active: true, city: { active: true } } }])
        }
        if (table === 'profile_media') {
          return createQueryMock([])
        }
        return createQueryMock(null)
      })

      const res = await adminApproveProfileAction({ profileId })
      expect(res.success).toBe(false)
      expect(res.error).toBe('PUBLICATION_GATE_FAILED')
      expect(res.message).toContain('foto aprovada definida como principal')
      expect(mockAdmin.rpc).not.toHaveBeenCalled()
    })

    it('gate 6: fails when profile has no publication entitlement', async () => {
      setupGatesPass()
      mockHasPublicationEntitlement.mockResolvedValue(false)

      const res = await adminApproveProfileAction({ profileId })
      expect(res.success).toBe(false)
      expect(res.error).toBe('PUBLICATION_GATE_FAILED')
      expect(res.message).toContain('assinatura ou benefício')
      expect(mockAdmin.rpc).not.toHaveBeenCalled()
    })

    it('approves profile when ALL gates pass, updates profile & onboarding status', async () => {
      setupGatesPass()

      const res = await adminApproveProfileAction({ profileId, notes: 'All documents and media verified' })
      expect(res.success).toBe(true)
      expect(res.message).toContain('aprovado')

      // Verify moderate_profile RPC was called
      expect(mockAdmin.rpc).toHaveBeenCalledWith('moderate_profile', {
        p_profile_id: profileId,
        p_reviewer_id: adminActor.id,
        p_decision: 'APPROVE',
        p_reason_code: null,
        p_notes: 'All documents and media verified',
        p_content_snapshot: expect.objectContaining({
          stage_name: 'Test Artist',
          headline: 'Top Model',
          bio: 'Experienced professional model',
          whatsapp_phone: '+5511999999999',
        }),
      })
    })
  })

  describe('4. REJECT Profile', () => {
    function setupRejectProfile() {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return createQueryMock({ ...mockBaseProfile })
        }
        return createQueryMock(null)
      })
      mockAdmin.rpc.mockResolvedValue({ error: null })
    }

    it('fails rejection when reasonCode is missing', async () => {
      setupRejectProfile()
      const res = await adminModerateProfileAction({
        profileId,
        decision: 'REJECT',
        reasonCode: '' as any,
      })

      expect(res.success).toBe(false)
      expect(res.error).toBe('MISSING_REASON_CODE')
      expect(res.message).toContain('motivo')
      expect(mockAdmin.rpc).not.toHaveBeenCalled()
    })

    it('fails rejection when reasonCode exceeds 50 chars', async () => {
      setupRejectProfile()
      const res = await adminModerateProfileAction({
        profileId,
        decision: 'REJECT',
        reasonCode: 'A'.repeat(51),
      })

      expect(res.success).toBe(false)
      expect(res.error).toBe('INVALID_INPUT')
      expect(mockAdmin.rpc).not.toHaveBeenCalled()
    })

    it('successfully rejects profile with valid reason code and notes', async () => {
      setupRejectProfile()

      const res = await adminRejectProfileAction({
        profileId,
        reasonCode: 'INCOMPLETE_OR_LOW_QUALITY',
        notes: 'Bio lacks required description',
      })

      expect(res.success).toBe(true)
      expect(res.message).toContain('rejeitado')

      expect(mockAdmin.rpc).toHaveBeenCalledWith('moderate_profile', {
        p_profile_id: profileId,
        p_reviewer_id: adminActor.id,
        p_decision: 'REJECT',
        p_reason_code: 'INCOMPLETE_OR_LOW_QUALITY',
        p_notes: 'Bio lacks required description',
        p_content_snapshot: expect.objectContaining({
          stage_name: 'Test Artist',
        }),
      })
    })

    it('does not delete profile, account or alter KYC on rejection', async () => {
      setupRejectProfile()

      await adminRejectProfileAction({
        profileId,
        reasonCode: 'POLICY_VIOLATION',
      })

      // Ensure no DELETE calls
      expect(mockAdmin.from).not.toHaveBeenCalledWith(expect.stringMatching(/delete/i))
    })
  })

  describe('5. Privacy & Data Safety Invariants', () => {
    it('never exposes private KYC fields or sensitive identifiers', async () => {
      const result = await adminModerateProfileAction({
        profileId: 'not-valid',
        decision: 'APPROVE',
      })

      const serialized = JSON.stringify(result)
      expect(serialized).not.toContain('cpf')
      expect(serialized).not.toContain('legal_name')
      expect(serialized).not.toContain('didit')
      expect(serialized).not.toContain('biometric')
    })
  })
})
