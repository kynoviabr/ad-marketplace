import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  classifyOperationalStatus,
  getOperationalStatusLabel,
} from '@/modules/admin/operational-status'
import { projectSafeProfessionalSummary } from '@/modules/admin/dal'
import type { ProfileStatus } from '@/modules/profiles/types'
import type { UserStatus } from '@/modules/auth/types'
import type { VerificationStatus } from '@/modules/verification/types'

// Mock server-only modules
vi.mock('server-only', () => ({}))

const redirectMock = vi.fn()
vi.mock('next/navigation', () => ({
  redirect: (url: string) => redirectMock(url),
}))

const mockRequireAccount = vi.fn()
vi.mock('@/modules/auth/dal', () => ({
  requireAccount: () => mockRequireAccount(),
}))

const mockGetVerificationSafe = vi.fn()
vi.mock('@/modules/verification/dal', () => ({
  getVerificationSafe: (id: string) => mockGetVerificationSafe(id),
}))

const mockCanProceed = vi.fn()
vi.mock('@/modules/verification/gates', () => ({
  canProceedToProfessionalProfile: (v: any) => mockCanProceed(v),
}))

const mockSupabaseAdmin = {
  from: vi.fn(),
}
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockSupabaseAdmin,
}))

describe('R12.1 Admin Operations Foundation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Operational Status Model (Classification)', () => {
    it('classifies as SUSPENDED when account is SUSPENDED', () => {
      const result = classifyOperationalStatus({
        profileStatus: 'ACTIVE',
        accountStatus: 'SUSPENDED',
        contentModerationStatus: 'APPROVED',
        verificationStatus: 'VERIFIED',
        isCanonicallyEligible: true,
      })
      expect(result).toBe('SUSPENDED')
    })

    it('classifies as SUSPENDED when profile is SUSPENDED', () => {
      const result = classifyOperationalStatus({
        profileStatus: 'SUSPENDED',
        accountStatus: 'ACTIVE',
        contentModerationStatus: 'APPROVED',
        verificationStatus: 'VERIFIED',
        isCanonicallyEligible: true,
      })
      expect(result).toBe('SUSPENDED')
    })

    it('classifies as NEEDS_REVIEW when content_moderation_status is PENDING', () => {
      const result = classifyOperationalStatus({
        profileStatus: 'ACTIVE',
        accountStatus: 'ACTIVE',
        contentModerationStatus: 'PENDING',
        verificationStatus: 'VERIFIED',
      })
      expect(result).toBe('NEEDS_REVIEW')
    })

    it('classifies as NEEDS_REVIEW when content_moderation_status is FLAGGED', () => {
      const result = classifyOperationalStatus({
        profileStatus: 'ACTIVE',
        accountStatus: 'ACTIVE',
        contentModerationStatus: 'FLAGGED',
        verificationStatus: 'VERIFIED',
      })
      expect(result).toBe('NEEDS_REVIEW')
    })

    it('classifies as NEEDS_REVIEW when profile is READY_FOR_REVIEW', () => {
      const result = classifyOperationalStatus({
        profileStatus: 'READY_FOR_REVIEW',
        accountStatus: 'ACTIVE',
        contentModerationStatus: 'APPROVED',
        verificationStatus: 'VERIFIED',
      })
      expect(result).toBe('NEEDS_REVIEW')
    })

    it('classifies as NEEDS_REVIEW when verificationStatus is IN_REVIEW', () => {
      const result = classifyOperationalStatus({
        profileStatus: 'READY_FOR_REVIEW',
        accountStatus: 'ACTIVE',
        contentModerationStatus: 'APPROVED',
        verificationStatus: 'IN_REVIEW',
      })
      expect(result).toBe('NEEDS_REVIEW')
    })

    it('classifies as PAUSED when profileStatus is PAUSED', () => {
      const result = classifyOperationalStatus({
        profileStatus: 'PAUSED',
        accountStatus: 'ACTIVE',
        contentModerationStatus: 'APPROVED',
        verificationStatus: 'VERIFIED',
      })
      expect(result).toBe('PAUSED')
    })

    it('classifies as ACTIVE when profile is ACTIVE, account is ACTIVE and canonically eligible', () => {
      const result = classifyOperationalStatus({
        profileStatus: 'ACTIVE',
        accountStatus: 'ACTIVE',
        contentModerationStatus: 'APPROVED',
        verificationStatus: 'VERIFIED',
        isCanonicallyEligible: true,
      })
      expect(result).toBe('ACTIVE')
    })

    it('classifies as BLOCKED_OR_INELIGIBLE when verification is REJECTED', () => {
      const result = classifyOperationalStatus({
        profileStatus: 'DRAFT',
        accountStatus: 'ACTIVE',
        contentModerationStatus: 'APPROVED',
        verificationStatus: 'REJECTED',
      })
      expect(result).toBe('BLOCKED_OR_INELIGIBLE')
    })

    it('classifies as BLOCKED_OR_INELIGIBLE when content moderation is REJECTED', () => {
      const result = classifyOperationalStatus({
        profileStatus: 'DRAFT',
        accountStatus: 'ACTIVE',
        contentModerationStatus: 'REJECTED',
        verificationStatus: 'VERIFIED',
      })
      expect(result).toBe('BLOCKED_OR_INELIGIBLE')
    })

    it('provides localized human-readable labels for all classifications', () => {
      expect(getOperationalStatusLabel('NEEDS_REVIEW', 'pt-BR')).toBe('Requer revisão')
      expect(getOperationalStatusLabel('NEEDS_REVIEW', 'en')).toBe('Needs review')
      expect(getOperationalStatusLabel('ACTIVE', 'pt-BR')).toBe('Ativo')
      expect(getOperationalStatusLabel('ACTIVE', 'en')).toBe('Active')
      expect(getOperationalStatusLabel('PAUSED', 'pt-BR')).toBe('Pausado')
      expect(getOperationalStatusLabel('PAUSED', 'en')).toBe('Paused')
      expect(getOperationalStatusLabel('SUSPENDED', 'pt-BR')).toBe('Suspenso')
      expect(getOperationalStatusLabel('SUSPENDED', 'en')).toBe('Suspended')
      expect(getOperationalStatusLabel('BLOCKED_OR_INELIGIBLE', 'pt-BR')).toBe('Bloqueado / Inelegível')
      expect(getOperationalStatusLabel('BLOCKED_OR_INELIGIBLE', 'en')).toBe('Blocked / Ineligible')
    })
  })

  describe('2. Admin Professional Summary Safe Field Projection (Privacy)', () => {
    it('projects ONLY the 9 operational-safe fields and strictly strips sensitive data', () => {
      const rawWithSensitiveData = {
        profileId: 'prof-1234',
        stageName: 'Camila Velvet',
        profileStatus: 'ACTIVE' as ProfileStatus,
        verificationStatus: 'VERIFIED' as VerificationStatus,
        accountStatus: 'ACTIVE' as UserStatus,
        publicationState: 'PUBLIC' as const,
        primaryLocation: 'São Paulo — Jardins',
        createdAt: '2026-08-01T12:00:00Z',
        updatedAt: '2026-09-01T12:00:00Z',
        // SENSITIVE DATA THAT MUST NEVER LEAK:
        legal_name: 'Maria da Silva',
        cpf: '123.456.789-00',
        dob: '1995-05-15',
        document_front_image: 'https://storage/private/doc-front.jpg',
        document_back_image: 'https://storage/private/doc-back.jpg',
        biometric_payload: { liveness_score: 0.99, face_match: true },
        didit_raw_payload: { session_token: 'secret_didit_token' },
        stripe_customer_id: 'cus_secret123',
        auth_token: 'bearer-token-xyz',
      }

      const projected = projectSafeProfessionalSummary(rawWithSensitiveData)

      // Verify the 9 operational-safe fields exist and match
      expect(projected.profileId).toBe('prof-1234')
      expect(projected.stageName).toBe('Camila Velvet')
      expect(projected.profileStatus).toBe('ACTIVE')
      expect(projected.verificationStatus).toBe('VERIFIED')
      expect(projected.accountStatus).toBe('ACTIVE')
      expect(projected.publicationState).toBe('PUBLIC')
      expect(projected.primaryLocation).toBe('São Paulo — Jardins')
      expect(projected.createdAt).toBe('2026-08-01T12:00:00Z')
      expect(projected.updatedAt).toBe('2026-09-01T12:00:00Z')

      // Strictly verify sensitive data is NOT exposed
      expect(projected).not.toHaveProperty('legal_name')
      expect(projected).not.toHaveProperty('cpf')
      expect(projected).not.toHaveProperty('dob')
      expect(projected).not.toHaveProperty('document_front_image')
      expect(projected).not.toHaveProperty('document_back_image')
      expect(projected).not.toHaveProperty('biometric_payload')
      expect(projected).not.toHaveProperty('didit_raw_payload')
      expect(projected).not.toHaveProperty('stripe_customer_id')
      expect(projected).not.toHaveProperty('auth_token')

      // Verify exactly 9 keys exist
      const keys = Object.keys(projected).sort()
      expect(keys).toEqual([
        'accountStatus',
        'createdAt',
        'primaryLocation',
        'profileId',
        'profileStatus',
        'publicationState',
        'stageName',
        'updatedAt',
        'verificationStatus',
      ])
    })
  })

  describe('3. Access Control & Authorization Barriers', () => {
    it('allows ADMIN accounts to pass requireAdmin barrier', async () => {
      const { requireAdmin } = await import('@/modules/moderation/guards')
      mockRequireAccount.mockResolvedValueOnce({
        id: 'admin-user-1',
        role: 'ADMIN',
        status: 'ACTIVE',
      })

      const adminAccount = await requireAdmin()
      expect(adminAccount.role).toBe('ADMIN')
      expect(redirectMock).not.toHaveBeenCalled()
    })

    it('denies CLIENT accounts and redirects directly to /cliente', async () => {
      const { requireAdmin } = await import('@/modules/moderation/guards')
      mockRequireAccount.mockResolvedValueOnce({
        id: 'client-user-1',
        role: 'CLIENT',
        status: 'ACTIVE',
      })

      await requireAdmin()
      expect(redirectMock).toHaveBeenCalledWith('/cliente')
    })

    it('denies completed ADVERTISER accounts and redirects to /dashboard', async () => {
      const { requireAdmin } = await import('@/modules/moderation/guards')
      mockRequireAccount.mockResolvedValueOnce({
        id: 'advertiser-user-completed',
        role: 'ADVERTISER',
        status: 'ACTIVE',
        onboarding_status: 'COMPLETED',
        onboarding_step: 6,
      })

      await requireAdmin()
      expect(redirectMock).toHaveBeenCalledWith('/dashboard')
    })

    it('denies incomplete ADVERTISER accounts and redirects to current onboarding step', async () => {
      const { requireAdmin } = await import('@/modules/moderation/guards')

      // 1. Step 1 (or 0) -> /onboarding/voce
      mockRequireAccount.mockResolvedValueOnce({
        id: 'adv-step-1',
        role: 'ADVERTISER',
        status: 'ACTIVE',
        onboarding_status: 'NOT_STARTED',
        onboarding_step: 1,
      })
      await requireAdmin()
      expect(redirectMock).toHaveBeenCalledWith('/onboarding/voce')

      // 2. Step 2 -> /onboarding/seu-perfil
      mockRequireAccount.mockResolvedValueOnce({
        id: 'adv-step-2',
        role: 'ADVERTISER',
        status: 'ACTIVE',
        onboarding_status: 'IN_PROGRESS',
        onboarding_step: 2,
      })
      await requireAdmin()
      expect(redirectMock).toHaveBeenCalledWith('/onboarding/seu-perfil')

      // 3. Step 3 -> /onboarding/onde-atende
      mockRequireAccount.mockResolvedValueOnce({
        id: 'adv-step-3',
        role: 'ADVERTISER',
        status: 'ACTIVE',
        onboarding_status: 'IN_PROGRESS',
        onboarding_step: 3,
      })
      await requireAdmin()
      expect(redirectMock).toHaveBeenCalledWith('/onboarding/onde-atende')

      // 4. Step 4 unverified -> /onboarding/verificacao
      mockRequireAccount.mockResolvedValueOnce({
        id: 'adv-step-4-unverified',
        role: 'ADVERTISER',
        status: 'ACTIVE',
        onboarding_status: 'IN_PROGRESS',
        onboarding_step: 4,
      })
      mockGetVerificationSafe.mockResolvedValueOnce({ status: 'PENDING', identityVerified: false, ageVerified: false })
      mockCanProceed.mockReturnValueOnce(false)
      await requireAdmin()
      expect(redirectMock).toHaveBeenCalledWith('/onboarding/verificacao')

      // 5. Step 5 verified -> /onboarding/fotos
      mockRequireAccount.mockResolvedValueOnce({
        id: 'adv-step-5-verified',
        role: 'ADVERTISER',
        status: 'ACTIVE',
        onboarding_status: 'IN_PROGRESS',
        onboarding_step: 5,
      })
      mockGetVerificationSafe.mockResolvedValueOnce({ status: 'VERIFIED', identityVerified: true, ageVerified: true })
      mockCanProceed.mockReturnValueOnce(true)
      await requireAdmin()
      expect(redirectMock).toHaveBeenCalledWith('/onboarding/fotos')

      // 6. Step 6 verified -> /onboarding/revisar
      mockRequireAccount.mockResolvedValueOnce({
        id: 'adv-step-6-verified',
        role: 'ADVERTISER',
        status: 'ACTIVE',
        onboarding_status: 'IN_PROGRESS',
        onboarding_step: 6,
      })
      mockGetVerificationSafe.mockResolvedValueOnce({ status: 'VERIFIED', identityVerified: true, ageVerified: true })
      mockCanProceed.mockReturnValueOnce(true)
      await requireAdmin()
      expect(redirectMock).toHaveBeenCalledWith('/onboarding/revisar')
    })
  })

  describe('4. Admin Operations DAL and Real Database Counts', () => {
    it('getAdminOperationsOverview returns real database counts and structures', async () => {
      mockRequireAccount.mockResolvedValueOnce({
        id: 'admin-user-1',
        role: 'ADMIN',
        status: 'ACTIVE',
      })

      const chainMock = (count: number, data: any[] = []) => {
        const obj: any = {
          select: vi.fn().mockImplementation(() => obj),
          eq: vi.fn().mockImplementation(() => obj),
          is: vi.fn().mockImplementation(() => obj),
          or: vi.fn().mockImplementation(() => obj),
          order: vi.fn().mockImplementation(() => obj),
          limit: vi.fn().mockImplementation(() => obj),
          then: (onfulfilled: any, onrejected?: any) =>
            Promise.resolve({ count, data, error: null }).then(onfulfilled, onrejected),
        }
        return obj
      }

      // Setup table mocks
      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return chainMock(3, [
            {
              id: 'prof-1',
              stage_name: 'Profissional A',
              status: 'READY_FOR_REVIEW',
              content_moderation_status: 'PENDING',
              account_user_id: 'acc-1',
              updated_at: '2026-09-04T12:00:00Z',
            },
          ])
        }
        if (table === 'profile_media') {
          return chainMock(7, [{ id: 'media-1', profile_id: 'prof-1', created_at: '2026-09-04T12:00:00Z' }])
        }
        if (table === 'profile_videos') {
          return chainMock(2, [{ id: 'video-1', profile_id: 'prof-1', created_at: '2026-09-04T12:05:00Z' }])
        }
        if (table === 'profile_moderation_reviews') {
          return chainMock(1, [
            {
              id: 'rev-1',
              profile_id: 'prof-1',
              reviewer_id: 'admin-1',
              decision: 'APPROVE',
              notes: 'Auditado',
              created_at: '2026-09-04T11:00:00Z',
              profile: { stage_name: 'Profissional A' },
            },
          ])
        }
        if (table === 'media_moderation_reviews') {
          return chainMock(0, [])
        }
        if (table === 'billing_admin_audit_logs') {
          return chainMock(0, [])
        }
        return chainMock(0, [])
      })

      const { getAdminOperationsOverview } = await import('@/modules/admin/dal')
      const overview = await getAdminOperationsOverview()

      expect(overview.profilesRequiringAttention.count).toBe(3)
      expect(overview.profilesRequiringAttention.items).toHaveLength(1)
      expect(overview.profilesRequiringAttention.items[0].stageName).toBe('Profissional A')

      expect(overview.mediaRequiringAttention.photosCount).toBe(7)
      expect(overview.mediaRequiringAttention.videosCount).toBe(2)
      expect(overview.mediaRequiringAttention.totalCount).toBe(9)

      expect(overview.recentActivity).toHaveLength(1)
      expect(overview.recentActivity[0].action).toContain('Perfil: Aprovado')
    })

    it('getAdminProfessionalSummary returns only safe fields from database queries', async () => {
      mockRequireAccount.mockResolvedValueOnce({
        id: 'admin-user-1',
        role: 'ADMIN',
        status: 'ACTIVE',
      })

      const chainMock = (data: any) => {
        const obj: any = {
          select: vi.fn().mockImplementation(() => obj),
          eq: vi.fn().mockImplementation(() => obj),
          order: vi.fn().mockImplementation(() => obj),
          limit: vi.fn().mockImplementation(() => obj),
          maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
          then: (onfulfilled: any, onrejected?: any) =>
            Promise.resolve({ data, error: null }).then(onfulfilled, onrejected),
        }
        return obj
      }

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return chainMock({
            id: 'prof-abc',
            stage_name: 'Isabella Velvet',
            status: 'ACTIVE',
            content_moderation_status: 'APPROVED',
            account_user_id: 'acc-abc',
            created_at: '2026-08-10T10:00:00Z',
            updated_at: '2026-09-01T15:00:00Z',
          })
        }
        if (table === 'account_users') {
          return chainMock({ id: 'acc-abc', status: 'ACTIVE' })
        }
        if (table === 'identity_verifications') {
          return chainMock({ status: 'VERIFIED' })
        }
        if (table === 'professional_profile_locations') {
          return chainMock([
            {
              is_primary: true,
              location: { name: 'Moema', city: { name: 'São Paulo' } },
            },
          ])
        }
        if (table === 'v_publication_eligible_profiles') {
          return chainMock({ profile_id: 'prof-abc' })
        }
        return chainMock(null)
      })

      const { getAdminProfessionalSummary } = await import('@/modules/admin/dal')
      const summary = await getAdminProfessionalSummary('prof-abc')

      expect(summary).not.toBeNull()
      expect(summary?.profileId).toBe('prof-abc')
      expect(summary?.stageName).toBe('Isabella Velvet')
      expect(summary?.profileStatus).toBe('ACTIVE')
      expect(summary?.verificationStatus).toBe('VERIFIED')
      expect(summary?.accountStatus).toBe('ACTIVE')
      expect(summary?.publicationState).toBe('PUBLIC')
      expect(summary?.primaryLocation).toBe('São Paulo — Moema')
      expect(summary?.createdAt).toBe('2026-08-10T10:00:00Z')
      expect(summary?.updatedAt).toBe('2026-09-01T15:00:00Z')

      // Assert privacy invariants
      expect(summary).not.toHaveProperty('cpf')
      expect(summary).not.toHaveProperty('legal_name')
      expect(summary).not.toHaveProperty('biometrics')
    })
  })
})

