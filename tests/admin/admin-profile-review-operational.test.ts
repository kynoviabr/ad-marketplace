import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAdminProfileDetailedReview } from '@/modules/admin/dal'

// Mock server-only
vi.mock('server-only', () => ({}))

const redirectMock = vi.fn()
vi.mock('next/navigation', () => ({
  redirect: (url: string) => redirectMock(url),
}))

const mockRequireAdmin = vi.fn()
vi.mock('@/modules/moderation/guards', () => ({
  requireAdmin: () => mockRequireAdmin(),
}))

const mockHasPublicationEntitlement = vi.fn()
vi.mock('@/modules/billing/entitlements', () => ({
  hasPublicationEntitlement: (id: string) => mockHasPublicationEntitlement(id),
}))

// Mock Supabase admin client
const mockAdmin = {
  from: vi.fn(),
  storage: {
    from: vi.fn(),
  },
}
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockAdmin,
}))

describe('Admin Operational Profile Review Tool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', role: 'ADMIN', status: 'ACTIVE' })
    mockHasPublicationEntitlement.mockResolvedValue(true)
  })

  describe('1. Security & RBAC Guard', () => {
    it('enforces requireAdmin before accessing getAdminProfileDetailedReview', async () => {
      mockRequireAdmin.mockRejectedValueOnce(new Error('Unauthorized: Admin role required'))

      await expect(getAdminProfileDetailedReview('profile-uuid-1')).rejects.toThrow('Unauthorized')
      expect(mockRequireAdmin).toHaveBeenCalledTimes(1)
    })
  })

  describe('2. Data Minimization & Privacy Protection', () => {
    it('does NOT expose raw identity documents, biometrics, selfies, or CPF in detailed review payload', async () => {
      const mockProfile = {
        id: 'prof-123',
        slug: 'maya-velvet',
        stage_name: 'Maya',
        headline: 'Modelo e Acompanhante de Luxo',
        bio: 'Atendimento exclusivo e discreto com total privacidade.',
        public_age: 24,
        show_whatsapp: true,
        whatsapp_phone: '11999999999',
        status: 'READY_FOR_REVIEW',
        content_moderation_status: 'PENDING',
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-05T00:00:00Z',
        account_user_id: 'acc-123',
      }

      const mockAccount = {
        id: 'acc-123',
        status: 'ACTIVE',
      }

      const mockVerification = {
        status: 'VERIFIED',
        identity_verified: true,
        age_verified: true,
        cpf_verified: true,
        verified_country: 'BRA',
        verified_at: '2026-07-31T12:00:00Z',
        provider: 'DIDIT',
      }

      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
              }),
            }),
          }
        }
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockAccount, error: null }),
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
                    maybeSingle: vi.fn().mockResolvedValue({ data: mockVerification, error: null }),
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
                data: [
                  {
                    location_id: 'loc-1',
                    is_primary: true,
                    location: { id: 'loc-1', name: 'Moema', active: true, city: { id: 'city-1', name: 'São Paulo', active: true } },
                  },
                ],
                error: null,
              }),
            }),
          }
        }
        if (table === 'professional_profile_offerings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ option_code: 'service_dinner', status: 'OFFERED' }],
                error: null,
              }),
            }),
          }
        }
        if (table === 'profile_media') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'media-1',
                        storage_path: 'profiles/prof-123/cover.jpg',
                        is_primary: true,
                        status: 'APPROVED',
                        position: 0,
                        mime_type: 'image/jpeg',
                        file_size_bytes: 1024,
                        created_at: '2026-08-01T00:00:00Z',
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'profile_videos') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'v_publication_eligible_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { profile_id: 'prof-123' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'profile_moderation_reviews' || table === 'professional_profile_status_events') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        }
      })

      mockAdmin.storage.from.mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://signed-media-storage/photo.jpg?token=abc' },
          error: null,
        }),
      })

      const detail = await getAdminProfileDetailedReview('prof-123')
      expect(detail).not.toBeNull()

      // CRITICAL DATA MINIMIZATION CHECKS
      const reviewJson = JSON.stringify(detail)
      expect(reviewJson).not.toContain('tax_id')
      expect(reviewJson).not.toContain('biometric')
      expect(reviewJson).not.toContain('selfie')
      expect((detail as any).cpf).toBeUndefined()
      expect((detail as any).biometrics).toBeUndefined()
      expect((detail as any).selfie).toBeUndefined()

      // Check safe Didit metadata
      expect(detail?.didit.status).toBe('VERIFIED')
      expect(detail?.didit.identityVerified).toBe(true)
      expect(detail?.didit.ageVerified).toBe(true)
      expect(detail?.didit.verifiedCountry).toBe('BRA')
    })
  })

  describe('3. Ephemeral Signed URLs for Media', () => {
    it('creates 900-second signed URLs for photo previews', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'prof-p1',
                    stage_name: 'Luna',
                    status: 'READY_FOR_REVIEW',
                    content_moderation_status: 'PENDING',
                    account_user_id: 'acc-1',
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'profile_media') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'm1',
                        storage_path: 'private/luna/pic1.jpg',
                        is_primary: true,
                        status: 'PENDING_MODERATION',
                        position: 0,
                        mime_type: 'image/jpeg',
                        created_at: '2026-08-01T00:00:00Z',
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        // Fallbacks for other tables
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }
      })

      const createSignedUrlMock = vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://storage/private/luna/pic1.jpg?sig=xyz' },
        error: null,
      })

      mockAdmin.storage.from.mockReturnValue({
        createSignedUrl: createSignedUrlMock,
      })

      const detail = await getAdminProfileDetailedReview('prof-p1')
      expect(createSignedUrlMock).toHaveBeenCalledWith('private/luna/pic1.jpg', 900)
      expect(detail?.photos[0].previewUrl).toBe('https://storage/private/luna/pic1.jpg?sig=xyz')
    })
  })

  describe('4. Canonical Checklist Evaluation', () => {
    it('evaluates publication readiness criteria according to system rules', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'prof-complete',
                    stage_name: 'Camila',
                    headline: 'Modelo de Luxo',
                    bio: 'Descrição detalhada com mais de vinte caracteres completos.',
                    public_age: 22,
                    show_whatsapp: true,
                    whatsapp_phone: '11988887777',
                    status: 'READY_FOR_REVIEW',
                    content_moderation_status: 'APPROVED',
                    account_user_id: 'acc-c1',
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
                  data: { id: 'acc-c1', status: 'ACTIVE' },
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
                      data: {
                        status: 'VERIFIED',
                        identity_verified: true,
                        age_verified: true,
                        provider: 'DIDIT',
                        verified_at: '2026-08-01T00:00:00Z',
                      },
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
                data: [
                  {
                    location_id: 'loc-1',
                    is_primary: true,
                    location: { id: 'loc-1', name: 'Jardins', active: true, city: { id: 'city-1', name: 'São Paulo', active: true } },
                  },
                ],
                error: null,
              }),
            }),
          }
        }
        if (table === 'professional_profile_offerings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ option_code: 'service_dinner', status: 'OFFERED' }],
                error: null,
              }),
            }),
          }
        }
        if (table === 'profile_media') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'm1',
                        storage_path: 'camila/cover.jpg',
                        is_primary: true,
                        status: 'APPROVED',
                        position: 0,
                        mime_type: 'image/jpeg',
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'profile_videos') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'v_publication_eligible_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { profile_id: 'prof-complete' }, error: null }),
              }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }
      })

      const detail = await getAdminProfileDetailedReview('prof-complete')
      expect(detail).not.toBeNull()
      
      const identityItem = detail?.checklist.find((c) => c.key === 'identity')
      const profileItem = detail?.checklist.find((c) => c.key === 'profile')
      const locationsItem = detail?.checklist.find((c) => c.key === 'locations')
      const mediaItem = detail?.checklist.find((c) => c.key === 'media')
      const pubItem = detail?.checklist.find((c) => c.key === 'publication')

      expect(identityItem?.ready).toBe(true)
      expect(profileItem?.ready).toBe(true)
      expect(locationsItem?.ready).toBe(true)
      expect(mediaItem?.ready).toBe(true)
      expect(pubItem?.ready).toBe(true)
    })
  })
})
