import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAdminMediaQueue, getAdminMediaDetail } from '@/modules/admin/dal'
import type { AdminMediaQueueItem } from '@/modules/admin/types'

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

const mockAdmin = {
  from: vi.fn(),
  storage: {
    from: vi.fn(),
  },
}
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockAdmin,
}))

describe('R12.3 Admin Photo/Video Moderation Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', role: 'ADMIN', status: 'ACTIVE' })

    mockAdmin.storage.from.mockReturnValue({
      createSignedUrl: vi.fn().mockImplementation((path: string) =>
        Promise.resolve({ data: { signedUrl: `https://signed.example.com/${path}?token=safe` }, error: null })
      ),
    })
  })

  describe('1. Access Control', () => {
    it('enforces requireAdmin guard on media queue', async () => {
      mockAdmin.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      })

      await getAdminMediaQueue()
      expect(mockRequireAdmin).toHaveBeenCalledTimes(1)
    })

    it('denies access when requireAdmin rejects', async () => {
      mockRequireAdmin.mockRejectedValueOnce(new Error('Unauthorized'))
      await expect(getAdminMediaQueue()).rejects.toThrow('Unauthorized')
    })
  })

  describe('2. Photo and Video Candidate Retrieval', () => {
    const mockPhotos = [
      {
        id: 'photo-1',
        profile_id: 'prof-1',
        storage_path: 'profiles/prof-1/photo1.jpg',
        status: 'PENDING_MODERATION',
        is_primary: true,
        width: 1200,
        height: 1600,
        file_size_bytes: 204800,
        mime_type: 'image/jpeg',
        created_at: '2026-08-01T10:00:00Z',
        updated_at: '2026-08-01T10:00:00Z',
        approved_at: null,
        profile: { id: 'prof-1', stage_name: 'Isabella' },
      },
    ]

    const mockVideos = [
      {
        id: 'video-1',
        profile_id: 'prof-2',
        storage_path: 'videos/prof-2/vid1.mp4',
        poster_storage_path: 'videos/prof-2/poster.jpg',
        status: 'PENDING_MODERATION',
        duration_seconds: 15,
        file_size_bytes: 5242880,
        mime_type: 'video/mp4',
        created_at: '2026-08-01T12:00:00Z',
        updated_at: '2026-08-01T12:00:00Z',
        approved_at: null,
        profile: { id: 'prof-2', stage_name: 'Valentina' },
      },
    ]

    function setupQueueMock(photos = mockPhotos, videos = mockVideos) {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'profile_media') {
          return {
            select: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: photos, error: null }),
                in: vi.fn().mockResolvedValue({ data: photos, error: null }),
              }),
            }),
          }
        }
        if (table === 'profile_videos') {
          return {
            select: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: videos, error: null }),
                in: vi.fn().mockResolvedValue({ data: videos, error: null }),
              }),
            }),
          }
        }
        return { select: vi.fn().mockReturnThis() }
      })
    }

    it('retrieves both photos and videos in unified queue', async () => {
      setupQueueMock()
      const result = await getAdminMediaQueue({ filter: 'PENDING' })

      expect(result.items.length).toBe(2)
      expect(result.items[0].mediaType).toBe('PHOTO')
      expect(result.items[0].id).toBe('photo-1')
      expect(result.items[0].isPrimary).toBe(true)

      expect(result.items[1].mediaType).toBe('VIDEO')
      expect(result.items[1].id).toBe('video-1')
      expect(result.items[1].durationSeconds).toBe(15)
    })

    it('filters strictly by PHOTOS', async () => {
      setupQueueMock()
      const result = await getAdminMediaQueue({ filter: 'PHOTOS' })

      expect(result.items.every((i) => i.mediaType === 'PHOTO')).toBe(true)
    })

    it('filters strictly by VIDEOS', async () => {
      setupQueueMock()
      const result = await getAdminMediaQueue({ filter: 'VIDEOS' })

      expect(result.items.every((i) => i.mediaType === 'VIDEO')).toBe(true)
    })
  })

  describe('3. Ordering (Pending review first -> oldest waiting first -> tie-breaker)', () => {
    it('sorts pending review items first, then oldest createdAt, then ID', async () => {
      const mockPhotos = [
        {
          id: 'b-approved-old',
          profile_id: 'prof-1',
          storage_path: 'p1.jpg',
          status: 'APPROVED',
          is_primary: false,
          created_at: '2026-08-01T00:00:00Z',
          updated_at: '2026-08-01T00:00:00Z',
          approved_at: '2026-08-01T00:00:00Z',
          profile: { id: 'prof-1', stage_name: 'Camila' },
        },
        {
          id: 'c-pending-recent',
          profile_id: 'prof-2',
          storage_path: 'p2.jpg',
          status: 'PENDING_MODERATION',
          is_primary: false,
          created_at: '2026-08-05T00:00:00Z',
          updated_at: '2026-08-05T00:00:00Z',
          approved_at: null,
          profile: { id: 'prof-2', stage_name: 'Beatriz' },
        },
        {
          id: 'a-pending-oldest',
          profile_id: 'prof-3',
          storage_path: 'p3.jpg',
          status: 'PENDING_MODERATION',
          is_primary: true,
          created_at: '2026-08-02T00:00:00Z',
          updated_at: '2026-08-02T00:00:00Z',
          approved_at: null,
          profile: { id: 'prof-3', stage_name: 'Alessandra' },
        },
      ]

      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'profile_media') {
          return {
            select: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue({ data: mockPhotos, error: null }),
            }),
          }
        }
        if (table === 'profile_videos') {
          return {
            select: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }
        }
        return { select: vi.fn().mockReturnThis() }
      })

      const result = await getAdminMediaQueue({ filter: 'ALL' })

      // Expected order:
      // 1. a-pending-oldest (PENDING_MODERATION, 2026-08-02)
      // 2. c-pending-recent (PENDING_MODERATION, 2026-08-05)
      // 3. b-approved-old (APPROVED, 2026-08-01)
      expect(result.items.map((i) => i.id)).toEqual([
        'a-pending-oldest',
        'c-pending-recent',
        'b-approved-old',
      ])
    })
  })

  describe('4. Bounded Server-Side Pagination', () => {
    it('paginates media items and limits signed URL generation to current page slice', async () => {
      const generatePhotos = (count: number) =>
        Array.from({ length: count }, (_, i) => ({
          id: `photo-${i + 1}`,
          profile_id: `prof-${i + 1}`,
          storage_path: `photo-${i + 1}.jpg`,
          status: 'PENDING_MODERATION',
          is_primary: i === 0,
          created_at: new Date(Date.now() - i * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          approved_at: null,
          profile: { id: `prof-${i + 1}`, stage_name: `Modelo ${i + 1}` },
        }))

      const mockPhotos = generatePhotos(25)

      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'profile_media') {
          return {
            select: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: mockPhotos, error: null }),
              }),
            }),
          }
        }
        if (table === 'profile_videos') {
          return {
            select: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }
        }
        return { select: vi.fn().mockReturnThis() }
      })

      const page1 = await getAdminMediaQueue({ page: 1, pageSize: 12 })
      expect(page1.items.length).toBe(12)
      expect(page1.total).toBe(25)
      expect(page1.totalPages).toBe(3)
      expect(page1.page).toBe(1)
      expect(page1.pageSize).toBe(12)

      // Storage signed URL generation was called only 12 times (bounded slice), not 25!
      expect(mockAdmin.storage.from).toHaveBeenCalledTimes(12)
    })
  })

  describe('5. Safe Projection & Privacy Invariants', () => {
    it('strictly projects only operational safe fields and excludes sensitive KYC/identity data', async () => {
      const mockPhoto = {
        id: 'photo-safe',
        profile_id: 'prof-safe',
        storage_path: 'photo-safe.jpg',
        status: 'PENDING_MODERATION',
        is_primary: true,
        width: 800,
        height: 600,
        file_size_bytes: 102400,
        mime_type: 'image/jpeg',
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
        approved_at: null,
        // Injected unvetted fields
        legal_name: 'Nome Real Secreto',
        cpf: '000.000.000-00',
        dob: '1995-05-05',
        didit_payload: { token: 'secret' },
        profile: { id: 'prof-safe', stage_name: 'Juliana' },
      }

      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'profile_media') {
          return {
            select: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [mockPhoto], error: null }),
              }),
            }),
          }
        }
        if (table === 'profile_videos') {
          return {
            select: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }
        }
        return { select: vi.fn().mockReturnThis() }
      })

      const result = await getAdminMediaQueue()
      const item = result.items[0] as any

      expect(item.id).toBe('photo-safe')
      expect(item.stageName).toBe('Juliana')
      expect(item.mediaType).toBe('PHOTO')
      expect(item.previewUrl).toContain('https://signed.example.com')

      // Sensitive fields must NEVER leak
      expect(item.legal_name).toBeUndefined()
      expect(item.legalName).toBeUndefined()
      expect(item.cpf).toBeUndefined()
      expect(item.dob).toBeUndefined()
      expect(item.didit_payload).toBeUndefined()
    })
  })

  describe('6. Safe Detail Helper (“Revisar mídia”) & Controlled Video', () => {
    it('generates short-lived signed URLs and loads safe profile summary for video detail', async () => {
      const mockVideo = {
        id: 'video-detail-1',
        profile_id: 'prof-video-1',
        storage_path: 'videos/prof-video-1/vid.mp4',
        poster_storage_path: 'videos/prof-video-1/poster.jpg',
        status: 'PENDING_MODERATION',
        duration_seconds: 20,
        file_size_bytes: 4096000,
        mime_type: 'video/mp4',
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
        approved_at: null,
        profile: { id: 'prof-video-1', stage_name: 'Sophia' },
      }

      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'profile_media') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockVideo, error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'professional_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'prof-video-1',
                    stage_name: 'Sophia',
                    status: 'ACTIVE',
                    content_moderation_status: 'APPROVED',
                    account_user_id: 'acc-1',
                    created_at: '2026-08-01T00:00:00Z',
                    updated_at: '2026-08-01T00:00:00Z',
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
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'acc-1', status: 'ACTIVE' }, error: null }),
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
                    maybeSingle: vi.fn().mockResolvedValue({ data: { status: 'VERIFIED' }, error: null }),
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'professional_profile_locations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }
        }
        if (table === 'v_publication_eligible_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { profile_id: 'prof-video-1' }, error: null }),
              }),
            }),
          }
        }
        return { select: vi.fn().mockReturnThis() }
      })

      const detail = await getAdminMediaDetail('video-detail-1', 'VIDEO')
      expect(detail).not.toBeNull()
      expect(detail?.item.mediaType).toBe('VIDEO')
      expect(detail?.item.videoUrl).toContain('videos/prof-video-1/vid.mp4')
      expect(detail?.item.posterUrl).toContain('videos/prof-video-1/poster.jpg')
      expect(detail?.profileSummary?.stageName).toBe('Sophia')
      expect(detail?.profileSummary?.profileStatus).toBe('ACTIVE')
    })
  })
})
