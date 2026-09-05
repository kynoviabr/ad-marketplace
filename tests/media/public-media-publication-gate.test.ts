import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getApprovedMediaDeliveryUrl,
  getPublicApprovedMediaDeliveryUrl,
  getPrivateApprovedMediaDeliveryUrl,
  resolveProfilesWithMedia,
} from '@/modules/media/delivery'
import { createAdminClient } from '@/lib/supabase/admin'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

describe('Pre-PX1 Guardrail E: Media Publication Gate Enforcement', () => {
  let mockAdmin: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockAdmin = {
      from: vi.fn(),
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockImplementation((path: string, expiresIn: number) =>
            Promise.resolve({
              data: { signedUrl: `https://signed.cdn.example.com/${path}?expires=${expiresIn}` },
              error: null,
            })
          ),
        }),
      },
    }

    vi.mocked(createAdminClient).mockReturnValue(mockAdmin)
  })

  describe('1. Profile Publication State Matrix (Cases A through G)', () => {
    const eligibleProfileId = 'profile-eligible-1'
    const suspendedProfileId = 'profile-suspended-2'
    const pausedProfileId = 'profile-paused-3'
    const commercialIneligibleId = 'profile-unpaid-4'
    const kycIneligibleId = 'profile-nokyc-5'

    function setupViewMock(eligibleIds: string[]) {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'v_publication_eligible_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, val: string) => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: eligibleIds.includes(val) ? { profile_id: val } : null,
                  error: null,
                }),
              })),
              in: vi.fn().mockImplementation((col: string, vals: string[]) => ({
                data: vals.filter((id) => eligibleIds.includes(id)).map((id) => ({ profile_id: id })),
                error: null,
              })),
            }),
          }
        }
        if (table === 'profile_media') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'm-1',
                        profile_id: eligibleProfileId,
                        storage_path: `profiles/${eligibleProfileId}/photo1.jpg`,
                        status: 'APPROVED',
                        is_primary: true,
                      },
                      {
                        id: 'm-2',
                        profile_id: suspendedProfileId,
                        storage_path: `profiles/${suspendedProfileId}/photo2.jpg`,
                        status: 'APPROVED',
                        is_primary: true,
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })
    }

    it('CASE A: returns signed public URL for APPROVED media of an ELIGIBLE profile', async () => {
      setupViewMock([eligibleProfileId])

      const media = {
        profile_id: eligibleProfileId,
        status: 'APPROVED' as const,
        storage_path: `profiles/${eligibleProfileId}/photo.jpg`,
      }

      const url = await getApprovedMediaDeliveryUrl(media)
      expect(url).toBe(`https://signed.cdn.example.com/profiles/${eligibleProfileId}/photo.jpg?expires=3600`)
      expect(mockAdmin.storage.from).toHaveBeenCalledWith('profile-media')
    })

    it('CASE B: denies public delivery for SUSPENDED profile with APPROVED media', async () => {
      // Suspended profile is NOT in v_publication_eligible_profiles
      setupViewMock([eligibleProfileId])

      const media = {
        profile_id: suspendedProfileId,
        status: 'APPROVED' as const,
        storage_path: `profiles/${suspendedProfileId}/photo.jpg`,
      }

      const url = await getApprovedMediaDeliveryUrl(media)
      expect(url).toBeNull()
    })

    it('CASE C: denies public delivery for PAUSED profile with APPROVED media', async () => {
      setupViewMock([eligibleProfileId])

      const media = {
        profile_id: pausedProfileId,
        status: 'APPROVED' as const,
        storage_path: `profiles/${pausedProfileId}/photo.jpg`,
      }

      const url = await getApprovedMediaDeliveryUrl(media)
      expect(url).toBeNull()
    })

    it('CASE D: denies public delivery for COMMERCIALLY INELIGIBLE profile (expired billing)', async () => {
      setupViewMock([eligibleProfileId])

      const media = {
        profile_id: commercialIneligibleId,
        status: 'APPROVED' as const,
        storage_path: `profiles/${commercialIneligibleId}/photo.jpg`,
      }

      const url = await getApprovedMediaDeliveryUrl(media)
      expect(url).toBeNull()
    })

    it('CASE E: denies public delivery for KYC-INELIGIBLE profile with APPROVED media', async () => {
      setupViewMock([eligibleProfileId])

      const media = {
        profile_id: kycIneligibleId,
        status: 'APPROVED' as const,
        storage_path: `profiles/${kycIneligibleId}/photo.jpg`,
      }

      const url = await getApprovedMediaDeliveryUrl(media)
      expect(url).toBeNull()
    })

    it('CASE F: denies public delivery for ELIGIBLE profile when media is PENDING_MODERATION', async () => {
      setupViewMock([eligibleProfileId])

      const media = {
        profile_id: eligibleProfileId,
        status: 'PENDING_MODERATION' as const,
        storage_path: `profiles/${eligibleProfileId}/photo.jpg`,
      }

      const url = await getApprovedMediaDeliveryUrl(media)
      expect(url).toBeNull()
      // Storage createSignedUrl must never be called for non-approved media
      expect(mockAdmin.storage.from).not.toHaveBeenCalled()
    })

    it('CASE G: denies public delivery for ELIGIBLE profile when media is REJECTED', async () => {
      setupViewMock([eligibleProfileId])

      const media = {
        profile_id: eligibleProfileId,
        status: 'REJECTED' as const,
        storage_path: `profiles/${eligibleProfileId}/photo.jpg`,
      }

      const url = await getApprovedMediaDeliveryUrl(media)
      expect(url).toBeNull()
      expect(mockAdmin.storage.from).not.toHaveBeenCalled()
    })

    it('CASE H: fails closed when profile context mismatches media profile_id or storage_path', async () => {
      setupViewMock([eligibleProfileId, suspendedProfileId])

      // 1. media.profile_id differs from options.profileId
      const media = {
        profile_id: suspendedProfileId,
        status: 'APPROVED' as const,
        storage_path: `profiles/${suspendedProfileId}/photo.jpg`,
      }

      // Attacker tries to smuggle eligibleProfileId as the authorization context
      const urlMismatch = await getApprovedMediaDeliveryUrl(media, { profileId: eligibleProfileId })
      expect(urlMismatch).toBeNull()

      // 2. storage_path profile segment differs from context profileId
      const mediaWithFakeContext = {
        profile_id: eligibleProfileId,
        status: 'APPROVED' as const,
        storage_path: `profiles/${suspendedProfileId}/photo.jpg`,
      }
      const urlPathMismatch = await getApprovedMediaDeliveryUrl(mediaWithFakeContext, {
        profileId: eligibleProfileId,
      })
      expect(urlPathMismatch).toBeNull()
    })
  })

  describe('2. Privileged & Private Contexts (Cases I & J)', () => {
    it('CASE I: Admin moderation preview works for unpublished or unapproved media', async () => {
      // Admin moderation uses direct private storage signing or getPrivateApprovedMediaDeliveryUrl
      const media = {
        status: 'APPROVED' as const,
        storage_path: 'profiles/unpublished-1/photo.jpg',
      }

      const url = await getPrivateApprovedMediaDeliveryUrl(media)
      expect(url).toBe('https://signed.cdn.example.com/profiles/unpublished-1/photo.jpg?expires=900')
      // Private preview uses 15 minute (900s) TTL
    })

    it('CASE J: Owner private preview in onboarding/dashboard works via private delivery', async () => {
      const media = {
        status: 'APPROVED' as const,
        storage_path: 'profiles/owner-draft-1/photo.jpg',
      }

      // getApprovedMediaDeliveryUrl with privateBypass flag
      const url = await getApprovedMediaDeliveryUrl(media, { privateBypass: true })
      expect(url).toBe('https://signed.cdn.example.com/profiles/owner-draft-1/photo.jpg?expires=900')
    })
  })

  describe('3. Dynamic Suspension & Batch Resolution (Cases K & Batch)', () => {
    it('CASE K: immediate fail-closed on new requests when previously eligible profile becomes suspended', async () => {
      let isEligible = true

      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'v_publication_eligible_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, val: string) => ({
                maybeSingle: vi.fn().mockImplementation(() =>
                  Promise.resolve({
                    data: isEligible ? { profile_id: val } : null,
                    error: null,
                  })
                ),
              })),
            }),
          }
        }
        return {}
      })

      const media = {
        profile_id: 'prof-transition',
        status: 'APPROVED' as const,
        storage_path: 'profiles/prof-transition/photo.jpg',
      }

      // Request 1: Profile is active & eligible
      const urlBefore = await getApprovedMediaDeliveryUrl(media)
      expect(urlBefore).not.toBeNull()

      // Profile gets suspended in database
      isEligible = false

      // Request 2: Next public media request fails closed immediately
      const urlAfter = await getApprovedMediaDeliveryUrl(media)
      expect(urlAfter).toBeNull()
    })

    it('Batch: resolveProfilesWithMedia filters out ineligible profiles and delivers only to eligible', async () => {
      const eligibleId = 'prof-ok-1'
      const suspendedId = 'prof-suspended-2'

      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'v_publication_eligible_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockImplementation((col: string, vals: string[]) => ({
                data: vals.filter((id) => id === eligibleId).map((id) => ({ profile_id: id })),
                error: null,
              })),
            }),
          }
        }
        if (table === 'profile_media') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'm-1',
                        profile_id: eligibleId,
                        storage_path: `profiles/${eligibleId}/photo1.jpg`,
                        status: 'APPROVED',
                        is_primary: true,
                      },
                      {
                        id: 'm-2',
                        profile_id: suspendedId,
                        storage_path: `profiles/${suspendedId}/photo2.jpg`,
                        status: 'APPROVED',
                        is_primary: true,
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const candidates = [{ id: eligibleId }, { id: suspendedId }]
      const results = await resolveProfilesWithMedia(candidates)

      expect(results).toHaveLength(2)

      const eligibleResult = results.find((r) => r.id === eligibleId)
      expect(eligibleResult?.mediaUrl).toBe(
        `https://signed.cdn.example.com/profiles/${eligibleId}/photo1.jpg?expires=3600`
      )

      const suspendedResult = results.find((r) => r.id === suspendedId)
      expect(suspendedResult?.mediaUrl).toBeNull()
    })
  })
})
