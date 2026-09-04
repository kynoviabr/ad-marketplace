import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAdminProfileQueue, getAdminProfessionalSummary } from '@/modules/admin/dal'
import type { AdminProfileQueueItem } from '@/modules/admin/types'

// Mock server-only
vi.mock('server-only', () => ({}))

const redirectMock = vi.fn()
vi.mock('next/navigation', () => ({
  redirect: (url: string) => redirectMock(url),
}))

const mockRequireAccount = vi.fn()
vi.mock('@/modules/auth/dal', () => ({
  requireAccount: () => mockRequireAccount(),
}))

const mockRequireAdmin = vi.fn()
vi.mock('@/modules/moderation/guards', () => ({
  requireAdmin: () => mockRequireAdmin(),
}))

// Mock Supabase admin client
const mockAdmin = {
  from: vi.fn(),
}
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockAdmin,
}))

describe('R12.2 Admin Profile Review Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', role: 'ADMIN', status: 'ACTIVE' })
  })

  describe('1. Access Control', () => {
    it('calls requireAdmin to guard queue access', async () => {
      mockAdmin.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockReturnThis(),
          data: [],
          error: null,
        }),
      })

      await getAdminProfileQueue()
      expect(mockRequireAdmin).toHaveBeenCalledTimes(1)
    })
  })

  describe('2. Ordering (Needs review first -> oldest updated first -> tie-breaker)', () => {
    it('orders needs-review items first, then oldest waiting, then id tie-breaker', async () => {
      const mockRows = [
        {
          id: 'b-active-recent',
          stage_name: 'Beto',
          status: 'ACTIVE',
          content_moderation_status: 'APPROVED',
          account_user_id: 'acc-1',
          created_at: '2026-08-01T00:00:00Z',
          updated_at: '2026-08-10T12:00:00Z',
          account_user: { id: 'acc-1', status: 'ACTIVE', verifications: [{ status: 'VERIFIED', created_at: '2026-08-01T00:00:00Z' }] },
          locations: [{ is_primary: true, location: { name: 'Moema', city: { name: 'São Paulo' } } }],
        },
        {
          id: 'a-active-old',
          stage_name: 'Ana',
          status: 'ACTIVE',
          content_moderation_status: 'APPROVED',
          account_user_id: 'acc-2',
          created_at: '2026-08-01T00:00:00Z',
          updated_at: '2026-08-05T12:00:00Z',
          account_user: { id: 'acc-2', status: 'ACTIVE', verifications: [{ status: 'VERIFIED', created_at: '2026-08-01T00:00:00Z' }] },
          locations: [{ is_primary: true, location: { name: 'Itaim', city: { name: 'São Paulo' } } }],
        },
        {
          id: 'd-review-recent',
          stage_name: 'Diana',
          status: 'READY_FOR_REVIEW',
          content_moderation_status: 'PENDING',
          account_user_id: 'acc-3',
          created_at: '2026-08-01T00:00:00Z',
          updated_at: '2026-08-08T12:00:00Z',
          account_user: { id: 'acc-3', status: 'ACTIVE', verifications: [{ status: 'VERIFIED', created_at: '2026-08-01T00:00:00Z' }] },
          locations: [],
        },
        {
          id: 'c-review-oldest',
          stage_name: 'Carla',
          status: 'READY_FOR_REVIEW',
          content_moderation_status: 'PENDING',
          account_user_id: 'acc-4',
          created_at: '2026-08-01T00:00:00Z',
          updated_at: '2026-08-02T12:00:00Z',
          account_user: { id: 'acc-4', status: 'ACTIVE', verifications: [{ status: 'VERIFIED', created_at: '2026-08-01T00:00:00Z' }] },
          locations: [],
        },
      ]

      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              ilike: vi.fn().mockReturnThis(),
              data: mockRows,
              error: null,
            }),
          }
        }
        if (table === 'v_publication_eligible_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ profile_id: 'b-active-recent' }, { profile_id: 'a-active-old' }],
                error: null,
              }),
            }),
          }
        }
        return { select: vi.fn().mockReturnThis() }
      })

      const result = await getAdminProfileQueue({ filter: 'ALL', pageSize: 10 })

      // Expected order:
      // 1. c-review-oldest (NEEDS_REVIEW, 2026-08-02)
      // 2. d-review-recent (NEEDS_REVIEW, 2026-08-08)
      // 3. a-active-old (ACTIVE, 2026-08-05)
      // 4. b-active-recent (ACTIVE, 2026-08-10)
      expect(result.items.map((i) => i.profileId)).toEqual([
        'c-review-oldest',
        'd-review-recent',
        'a-active-old',
        'b-active-recent',
      ])
      expect(result.items[0].operationalClassification).toBe('NEEDS_REVIEW')
      expect(result.items[1].operationalClassification).toBe('NEEDS_REVIEW')
      expect(result.items[2].operationalClassification).toBe('ACTIVE')
      expect(result.items[3].operationalClassification).toBe('ACTIVE')
    })
  })

  describe('3. Filtering', () => {
    const mockRows = [
      {
        id: 'p-needs-review',
        stage_name: 'Pendente',
        status: 'READY_FOR_REVIEW',
        content_moderation_status: 'PENDING',
        account_user_id: 'acc-1',
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
        account_user: { id: 'acc-1', status: 'ACTIVE', verifications: [] },
      },
      {
        id: 'p-suspended',
        stage_name: 'Suspensa',
        status: 'SUSPENDED',
        content_moderation_status: 'APPROVED',
        account_user_id: 'acc-2',
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-02T00:00:00Z',
        account_user: { id: 'acc-2', status: 'ACTIVE', verifications: [] },
      },
      {
        id: 'p-paused',
        stage_name: 'Pausada',
        status: 'PAUSED',
        content_moderation_status: 'APPROVED',
        account_user_id: 'acc-3',
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-03T00:00:00Z',
        account_user: { id: 'acc-3', status: 'ACTIVE', verifications: [] },
      },
      {
        id: 'p-blocked',
        stage_name: 'Bloqueada',
        status: 'DRAFT',
        content_moderation_status: 'REJECTED',
        account_user_id: 'acc-4',
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-04T00:00:00Z',
        account_user: { id: 'acc-4', status: 'ACTIVE', verifications: [] },
      },
    ]

    function setupMock() {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              ilike: vi.fn().mockReturnThis(),
              data: mockRows,
              error: null,
            }),
          }
        }
        if (table === 'v_publication_eligible_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }
        }
        return { select: vi.fn().mockReturnThis() }
      })
    }

    it('filters by NEEDS_REVIEW', async () => {
      setupMock()
      const result = await getAdminProfileQueue({ filter: 'NEEDS_REVIEW' })
      expect(result.items.length).toBe(1)
      expect(result.items[0].profileId).toBe('p-needs-review')
      expect(result.items[0].operationalClassification).toBe('NEEDS_REVIEW')
    })

    it('filters by SUSPENDED', async () => {
      setupMock()
      const result = await getAdminProfileQueue({ filter: 'SUSPENDED' })
      expect(result.items.length).toBe(1)
      expect(result.items[0].profileId).toBe('p-suspended')
      expect(result.items[0].operationalClassification).toBe('SUSPENDED')
    })

    it('filters by PAUSED', async () => {
      setupMock()
      const result = await getAdminProfileQueue({ filter: 'PAUSED' })
      expect(result.items.length).toBe(1)
      expect(result.items[0].profileId).toBe('p-paused')
      expect(result.items[0].operationalClassification).toBe('PAUSED')
    })

    it('filters by BLOCKED_OR_INELIGIBLE', async () => {
      setupMock()
      const result = await getAdminProfileQueue({ filter: 'BLOCKED_OR_INELIGIBLE' })
      expect(result.items.length).toBe(1)
      expect(result.items[0].profileId).toBe('p-blocked')
      expect(result.items[0].operationalClassification).toBe('BLOCKED_OR_INELIGIBLE')
    })

    it('returns ALL operational items when filter is ALL', async () => {
      setupMock()
      const result = await getAdminProfileQueue({ filter: 'ALL' })
      expect(result.items.length).toBe(4)
    })
  })

  describe('4. Search (stage/display name only)', () => {
    it('applies ilike on stage_name when search term is provided', async () => {
      const ilikeSpy = vi.fn().mockReturnValue({
        data: [],
        error: null,
      })
      mockAdmin.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike: ilikeSpy,
          data: [],
          error: null,
        }),
      })

      await getAdminProfileQueue({ search: 'Isabella' })
      expect(ilikeSpy).toHaveBeenCalledWith('stage_name', '%Isabella%')
    })
  })

  describe('5. Bounded Server-Side Pagination', () => {
    it('bounds and paginates items server-side', async () => {
      const generateRows = (count: number) =>
        Array.from({ length: count }, (_, i) => ({
          id: `p-${i + 1}`,
          stage_name: `Profissional ${i + 1}`,
          status: 'ACTIVE',
          content_moderation_status: 'APPROVED',
          account_user_id: `acc-${i + 1}`,
          created_at: '2026-08-01T00:00:00Z',
          updated_at: new Date(Date.now() - i * 1000).toISOString(),
          account_user: { id: `acc-${i + 1}`, status: 'ACTIVE', verifications: [] },
        }))

      const mockRows = generateRows(25)

      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              ilike: vi.fn().mockReturnThis(),
              data: mockRows,
              error: null,
            }),
          }
        }
        if (table === 'v_publication_eligible_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }
        }
        return { select: vi.fn().mockReturnThis() }
      })

      // Page 1 with pageSize = 10
      const page1 = await getAdminProfileQueue({ page: 1, pageSize: 10 })
      expect(page1.items.length).toBe(10)
      expect(page1.total).toBe(25)
      expect(page1.page).toBe(1)
      expect(page1.pageSize).toBe(10)
      expect(page1.totalPages).toBe(3)

      // Page 3 with pageSize = 10
      const page3 = await getAdminProfileQueue({ page: 3, pageSize: 10 })
      expect(page3.items.length).toBe(5)
      expect(page3.page).toBe(3)
    })
  })

  describe('6. Safe Fields & Privacy Invariants', () => {
    it('strictly projects only operational safe fields and strips sensitive KYC/identity data', async () => {
      const mockRow = {
        id: 'safe-profile-1',
        stage_name: 'Bella',
        status: 'ACTIVE',
        content_moderation_status: 'APPROVED',
        account_user_id: 'acc-safe-1',
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-02T00:00:00Z',
        account_user: {
          id: 'acc-safe-1',
          status: 'ACTIVE',
          // Maliciously injected or raw sensitive fields
          legal_name: 'Maria da Silva',
          cpf: '123.456.789-00',
          dob: '1990-01-01',
          didit_session: { raw: 'token' },
          verifications: [{ status: 'VERIFIED', created_at: '2026-08-01T00:00:00Z' }],
        },
        locations: [{ is_primary: true, location: { name: 'Jardins', city: { name: 'São Paulo' } } }],
      }

      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              ilike: vi.fn().mockReturnThis(),
              data: [mockRow],
              error: null,
            }),
          }
        }
        if (table === 'v_publication_eligible_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [{ profile_id: 'safe-profile-1' }], error: null }),
            }),
          }
        }
        return { select: vi.fn().mockReturnThis() }
      })

      const result = await getAdminProfileQueue()
      expect(result.items.length).toBe(1)
      const item = result.items[0] as any

      // Allowed safe fields
      expect(item.profileId).toBe('safe-profile-1')
      expect(item.stageName).toBe('Bella')
      expect(item.profileStatus).toBe('ACTIVE')
      expect(item.verificationStatus).toBe('VERIFIED')
      expect(item.accountStatus).toBe('ACTIVE')
      expect(item.publicationState).toBe('PUBLIC')
      expect(item.primaryLocation).toBe('São Paulo — Jardins')
      expect(item.createdAt).toBe('2026-08-01T00:00:00Z')
      expect(item.updatedAt).toBe('2026-08-02T00:00:00Z')
      expect(item.operationalClassification).toBe('ACTIVE')

      // NEVER exposed
      expect(item.legal_name).toBeUndefined()
      expect(item.legalName).toBeUndefined()
      expect(item.cpf).toBeUndefined()
      expect(item.dob).toBeUndefined()
      expect(item.didit_session).toBeUndefined()
      expect(item.document).toBeUndefined()
      expect(item.biometrics).toBeUndefined()
    })
  })

  describe('7. Safe Detail (“Ver perfil operacional”) Helper', () => {
    it('returns null if profile does not exist', async () => {
      mockAdmin.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      })

      const detail = await getAdminProfessionalSummary('non-existent')
      expect(detail).toBeNull()
    })

    it('returns safe operational summary for existing profile', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'prof-detail-1',
                    stage_name: 'Camila',
                    status: 'ACTIVE',
                    content_moderation_status: 'APPROVED',
                    account_user_id: 'acc-detail-1',
                    created_at: '2026-08-01T00:00:00Z',
                    updated_at: '2026-08-02T00:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'acc-detail-1', status: 'ACTIVE' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'identity_verifications') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { status: 'VERIFIED' },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'professional_profile_locations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ is_primary: true, location: { name: 'Pinheiros', city: { name: 'São Paulo' } } }],
                error: null,
              }),
            }),
          }
        }
        if (table === 'v_publication_eligible_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { profile_id: 'prof-detail-1' },
                  error: null,
                }),
              }),
            }),
          }
        }
        return { select: vi.fn().mockReturnThis() }
      })

      const detail = await getAdminProfessionalSummary('prof-detail-1')
      expect(detail).not.toBeNull()
      expect(detail?.profileId).toBe('prof-detail-1')
      expect(detail?.stageName).toBe('Camila')
      expect(detail?.publicationState).toBe('PUBLIC')
      expect(detail?.primaryLocation).toBe('São Paulo — Pinheiros')
    })
  })
})
