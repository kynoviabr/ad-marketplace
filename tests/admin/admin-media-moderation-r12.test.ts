import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  adminModerateMediaAction,
  adminApproveMediaAction,
  adminRejectMediaAction,
  VALID_MODERATION_REASON_CODES,
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

describe('R12.4A Admin Media Approve / Reject Mutations', () => {
  const adminActor = { id: 'a0000000-0000-0000-0000-000000000001', role: 'ADMIN', status: 'ACTIVE' }
  const photoId = '11111111-1111-1111-1111-111111111111'
  const videoId = '22222222-2222-2222-2222-222222222222'
  const profileId = '33333333-3333-3333-3333-333333333333'

  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue(adminActor)
  })

  describe('1. Security & Access Control', () => {
    it('requires ADMIN role via requireAdmin()', async () => {
      mockRequireAdmin.mockRejectedValueOnce(new Error('Unauthorized: ADMIN required'))

      const res = await adminModerateMediaAction({
        mediaId: photoId,
        mediaType: 'PHOTO',
        decision: 'APPROVE',
      })

      expect(res.success).toBe(false)
      expect(res.error).toBe('INTERNAL_ERROR')
      expect(mockAdmin.rpc).not.toHaveBeenCalled()
    })

    it('validates UUID format strictly', async () => {
      const res = await adminModerateMediaAction({
        mediaId: 'invalid-not-uuid',
        mediaType: 'PHOTO',
        decision: 'APPROVE',
      })

      expect(res.success).toBe(false)
      expect(res.error).toBe('INVALID_INPUT')
      expect(mockAdmin.from).not.toHaveBeenCalled()
    })

    it('rejects invalid mediaType', async () => {
      const res = await adminModerateMediaAction({
        mediaId: photoId,
        mediaType: 'DOCUMENT' as any,
        decision: 'APPROVE',
      })

      expect(res.success).toBe(false)
      expect(res.error).toBe('INVALID_INPUT')
    })
  })

  describe('2. Photo Moderation (profile_media & moderate_media RPC)', () => {
    it('approves pending photo and calls atomic moderate_media RPC', async () => {
      mockAdmin.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: photoId,
                  status: 'PENDING_MODERATION',
                  profile_id: profileId,
                  approved_at: null,
                  is_primary: true,
                  deleted_at: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      mockAdmin.rpc.mockResolvedValue({ error: null })

      const res = await adminApproveMediaAction(photoId, 'PHOTO')

      expect(res.success).toBe(true)
      expect(mockAdmin.rpc).toHaveBeenCalledWith('moderate_media', {
        p_media_id: photoId,
        p_reviewer_id: adminActor.id,
        p_decision: 'APPROVE',
        p_reason_code: null,
        p_notes: null,
      })
    })

    it('rejects pending photo with mandatory reason code and optional notes', async () => {
      mockAdmin.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: photoId,
                  status: 'PENDING_MODERATION',
                  profile_id: profileId,
                  approved_at: null,
                  is_primary: false,
                  deleted_at: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      mockAdmin.rpc.mockResolvedValue({ error: null })

      const res = await adminRejectMediaAction({
        mediaId: photoId,
        mediaType: 'PHOTO',
        reasonCode: 'LOW_QUALITY_OR_BLURRY',
        notes: 'Foto com resolução muito baixa.',
      })

      expect(res.success).toBe(true)
      expect(mockAdmin.rpc).toHaveBeenCalledWith('moderate_media', {
        p_media_id: photoId,
        p_reviewer_id: adminActor.id,
        p_decision: 'REJECT',
        p_reason_code: 'LOW_QUALITY_OR_BLURRY',
        p_notes: 'Foto com resolução muito baixa.',
      })
    })

    it('blocks photo rejection if reason code is missing', async () => {
      const res = await adminModerateMediaAction({
        mediaId: photoId,
        mediaType: 'PHOTO',
        decision: 'REJECT',
      })

      expect(res.success).toBe(false)
      expect(res.error).toBe('MISSING_REASON_CODE')
      expect(mockAdmin.rpc).not.toHaveBeenCalled()
    })
  })

  describe('3. Video Moderation (profile_videos & audit events)', () => {
    it('approves pending video, preserves approved_at if present, updates profile recency', async () => {
      const existingApprovedAt = '2026-08-10T12:00:00Z'
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'profile_videos') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: videoId,
                      status: 'PENDING_MODERATION',
                      profile_id: profileId,
                      approved_at: existingApprovedAt,
                      deleted_at: null,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: { id: videoId }, error: null }),
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'profile_video_moderation_events') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        if (table === 'professional_profiles') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }
        }
        return {}
      })

      const res = await adminApproveMediaAction(videoId, 'VIDEO')
      expect(res.success).toBe(true)
    })

    it('rejects pending video with reason code and records audit event', async () => {
      const updateVideoMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: videoId }, error: null }),
            }),
          }),
        }),
      })

      const insertAuditEventMock = vi.fn().mockResolvedValue({ error: null })
      const updateProfileMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'profile_videos') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: videoId,
                      status: 'PENDING_MODERATION',
                      profile_id: profileId,
                      approved_at: null,
                      deleted_at: null,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: updateVideoMock,
          }
        }
        if (table === 'profile_video_moderation_events') {
          return {
            insert: insertAuditEventMock,
          }
        }
        if (table === 'professional_profiles') {
          return {
            update: updateProfileMock,
          }
        }
        return {}
      })

      const res = await adminRejectMediaAction({
        mediaId: videoId,
        mediaType: 'VIDEO',
        reasonCode: 'WATERMARK_OR_PROMOTIONAL',
        notes: 'Contém logotipo externo não autorizado.',
      })

      expect(res.success).toBe(true)
      expect(updateVideoMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'REJECTED',
          moderated_by: adminActor.id,
          moderation_reason: 'WATERMARK_OR_PROMOTIONAL: Contém logotipo externo não autorizado.',
          approved_at: null,
        })
      )
      expect(insertAuditEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          video_id: videoId,
          moderator_account_user_id: adminActor.id,
          decision: 'REJECT',
          reason: 'WATERMARK_OR_PROMOTIONAL: Contém logotipo externo não autorizado.',
        })
      )
      expect(updateProfileMock).toHaveBeenCalled()
    })

    it('blocks video rejection without reason code', async () => {
      const res = await adminModerateMediaAction({
        mediaId: videoId,
        mediaType: 'VIDEO',
        decision: 'REJECT',
      })

      expect(res.success).toBe(false)
      expect(res.error).toBe('MISSING_REASON_CODE')
    })
  })

  describe('4. Concurrency Guard & Fail-Closed Behavior', () => {
    it('fails closed if photo is already APPROVED', async () => {
      mockAdmin.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: photoId,
                  status: 'APPROVED',
                  profile_id: profileId,
                  approved_at: '2026-08-01T10:00:00Z',
                  deleted_at: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      const res = await adminApproveMediaAction(photoId, 'PHOTO')
      expect(res.success).toBe(false)
      expect(res.error).toBe('ALREADY_APPROVED')
      expect(res.currentStatus).toBe('APPROVED')
      expect(mockAdmin.rpc).not.toHaveBeenCalled()
    })

    it('fails closed if photo is already REJECTED', async () => {
      mockAdmin.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: photoId,
                  status: 'REJECTED',
                  profile_id: profileId,
                  approved_at: null,
                  deleted_at: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      const res = await adminRejectMediaAction({
        mediaId: photoId,
        mediaType: 'PHOTO',
        reasonCode: 'LOW_QUALITY_OR_BLURRY',
      })
      expect(res.success).toBe(false)
      expect(res.error).toBe('ALREADY_REJECTED')
      expect(res.currentStatus).toBe('REJECTED')
      expect(mockAdmin.rpc).not.toHaveBeenCalled()
    })

    it('fails closed if video is already APPROVED', async () => {
      mockAdmin.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: videoId,
                  status: 'APPROVED',
                  profile_id: profileId,
                  approved_at: '2026-08-01T10:00:00Z',
                  deleted_at: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      const res = await adminApproveMediaAction(videoId, 'VIDEO')
      expect(res.success).toBe(false)
      expect(res.error).toBe('ALREADY_APPROVED')
    })

    it('returns NOT_FOUND when media item does not exist or was deleted', async () => {
      mockAdmin.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      })

      const res = await adminApproveMediaAction(photoId, 'PHOTO')
      expect(res.success).toBe(false)
      expect(res.error).toBe('NOT_FOUND')
    })
  })

  describe('5. Reason Codes Invariant', () => {
    it('verifies all expected reason codes are supported', () => {
      expect(VALID_MODERATION_REASON_CODES).toEqual([
        'UNDERAGE_SUSPICION',
        'EXPLICIT_ILLEGAL_CONTENT',
        'LOW_QUALITY_OR_BLURRY',
        'WATERMARK_OR_PROMOTIONAL',
        'NON_HUMAN_OR_MISMATCH',
        'VIOLENCE_OR_COERCION',
        'OTHER_POLICY_VIOLATION',
      ])
    })
  })
})
