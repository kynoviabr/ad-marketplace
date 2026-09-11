import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateSubjectLifecyclePlan } from '@/modules/privacy/lifecycle-planner'
import * as adminModule from '@/lib/supabase/admin'

describe('LGPD-02A: Subject Lifecycle Planner & Dry-Run Engine', () => {
  const mockSubjectId = '11111111-1111-4111-8111-111111111111'
  const mockProfileId = '22222222-2222-4222-8222-222222222222'

  let mockAdminClient: any
  let deleteSpy: any
  let updateSpy: any
  let insertSpy: any
  let removeStorageSpy: any
  let deleteAuthSpy: any

  beforeEach(() => {
    deleteSpy = vi.fn().mockReturnValue({ data: null, error: null })
    updateSpy = vi.fn().mockReturnValue({ data: null, error: null })
    insertSpy = vi.fn().mockReturnValue({ data: null, error: null })
    removeStorageSpy = vi.fn().mockResolvedValue({ data: null, error: null })
    deleteAuthSpy = vi.fn().mockResolvedValue({ data: null, error: null })

    mockAdminClient = {
      from: vi.fn((table: string) => {
        const queryBuilder: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(),
          single: vi.fn(),
          delete: deleteSpy,
          update: updateSpy,
          insert: insertSpy,
        }

        if (table === 'account_users') {
          queryBuilder.maybeSingle.mockResolvedValue({
            data: {
              id: mockSubjectId,
              role: 'ADVERTISER',
              status: 'ACTIVE',
              email: 'advertiser@velvet.club',
              phone: '+5511999998888',
            },
            error: null,
          })
        } else if (table === 'professional_profiles') {
          queryBuilder.maybeSingle.mockResolvedValue({
            data: {
              id: mockProfileId,
              stage_name: 'Bella Velvet',
            },
            error: null,
          })
        } else if (table === 'identity_verifications') {
          queryBuilder.eq.mockImplementation((col: string, val: string) => {
            return {
              data: [
                {
                  id: 'verif-1',
                  status: 'VERIFIED',
                  didit_session_id: 'didit-session-123',
                },
              ],
              error: null,
            }
          })
        } else if (table === 'profile_media') {
          queryBuilder.eq.mockImplementation(() => ({
            data: [
              { id: 'media-1', storage_path: `${mockProfileId}/photo1.jpg`, status: 'APPROVED' },
              { id: 'media-2', storage_path: `${mockProfileId}/photo2.jpg`, status: 'PENDING_MODERATION' },
            ],
            error: null,
          }))
        } else if (table === 'profile_videos') {
          queryBuilder.eq.mockImplementation(() => ({
            data: [
              {
                id: 'video-1',
                storage_path: `${mockProfileId}/video1.mp4`,
                poster_storage_path: `${mockProfileId}/poster1.jpg`,
              },
            ],
            error: null,
          }))
        } else if (table === 'subscriptions') {
          queryBuilder.eq.mockImplementation(() => ({
            data: [{ id: 'sub-1', plan_code: 'FOUNDER_LAUNCH', status: 'ACTIVE' }],
            error: null,
          }))
        } else if (table === 'professional_reviews') {
          queryBuilder.eq.mockImplementation((col: string) => {
            if (col === 'reviewer_account_user_id') {
              return { data: [{ id: 'review-authored-1' }], error: null }
            }
            return { count: 3, error: null }
          })
        } else if (table === 'concierge_conversations') {
          queryBuilder.eq.mockImplementation(() => ({
            data: [{ id: 'conv-1' }],
            error: null,
          }))
        } else if (table === 'data_subject_requests') {
          queryBuilder.eq.mockImplementation(() => ({
            data: [{ id: 'dsr-1' }],
            error: null,
          }))
        } else {
          // Default count or empty array
          queryBuilder.select.mockImplementation((_cols: string, opts?: any) => {
            if (opts?.count === 'exact') {
              return {
                ...queryBuilder,
                eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
                in: vi.fn().mockResolvedValue({ count: 1, error: null }),
              }
            }
            return queryBuilder
          })
        }

        return queryBuilder
      }),
      storage: {
        from: vi.fn(() => ({
          list: vi.fn().mockResolvedValue({
            data: [{ name: 'photo1.jpg' }, { name: 'photo2.jpg' }, { name: 'orphan-pic.jpg' }],
            error: null,
          }),
          remove: removeStorageSpy,
        })),
      },
      auth: {
        admin: {
          deleteUser: deleteAuthSpy,
        },
      },
    }

    vi.spyOn(adminModule, 'createAdminClient').mockReturnValue(mockAdminClient)
  })

  it('1. fails closed when subject does not exist', async () => {
    mockAdminClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    await expect(generateSubjectLifecyclePlan('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
      /not found or inaccessible/
    )
  })

  it('2. guarantees DRY-RUN mode and executionAllowed = false', async () => {
    const plan = await generateSubjectLifecyclePlan(mockSubjectId)
    expect(plan.mode).toBe('DRY_RUN')
    expect(plan.executionAllowed).toBe(false)
    expect(plan.auditStatement).toContain('DRY-RUN ONLY')
  })

  it('3. enforces Auth-last invariant (auth.users classified DELETE with isAuthLast = true)', async () => {
    const plan = await generateSubjectLifecyclePlan(mockSubjectId)
    const authItem = plan.items.find((item) => item.system === 'SUPABASE_AUTH')

    expect(authItem).toBeDefined()
    expect(authItem?.target).toBe('auth.users')
    expect(authItem?.action).toBe('DELETE')
    expect(authItem?.isAuthLast).toBe(true)
    expect(authItem?.rationale).toContain('Auth-last invariant')
  })

  it('4. strictly defaults unapproved legal retentions to REVIEW_REQUIRED (summary.RETAIN === 0)', async () => {
    const plan = await generateSubjectLifecyclePlan(mockSubjectId)
    expect(plan.summary.RETAIN).toBe(0)

    const kycItem = plan.items.find((item) => item.target === 'public.identity_verifications')
    expect(kycItem?.action).toBe('REVIEW_REQUIRED')
    expect(kycItem?.retentionStatus).toBe('DRAFT')

    const subItem = plan.items.find((item) => item.target === 'public.subscriptions')
    expect(subItem?.action).toBe('REVIEW_REQUIRED')
  })

  it('5. discovers Storage objects and marks orphan risk prevented', async () => {
    const plan = await generateSubjectLifecyclePlan(mockSubjectId)
    expect(plan.storageDiscovered.photoCount).toBeGreaterThan(0)
    expect(plan.storageDiscovered.videoCount).toBeGreaterThan(0)

    const storagePhotoItem = plan.items.find((item) => item.target === 'profile-media (bucket)')
    expect(storagePhotoItem).toBeDefined()
    expect(storagePhotoItem?.action).toBe('DELETE')
    expect(storagePhotoItem?.orphanRiskPrevented).toBe(true)
  })

  it('6. safeguards immutable audit ledgers (DSR, moderation, billing logs) with REVIEW_REQUIRED', async () => {
    const plan = await generateSubjectLifecyclePlan(mockSubjectId)

    const safeguardedItems = plan.items.filter((item) => item.auditSafeguarded)
    expect(safeguardedItems.length).toBeGreaterThan(0)

    for (const item of safeguardedItems) {
      expect(item.action).toBe('REVIEW_REQUIRED')
    }
  })

  it('7. safeguards mixed third-party reviews (authored -> ANONYMIZE, received -> REVIEW_REQUIRED)', async () => {
    const plan = await generateSubjectLifecyclePlan(mockSubjectId)

    const authoredReviewsItem = plan.items.find((item) => item.id.includes('reviews-authored'))
    expect(authoredReviewsItem).toBeDefined()
    expect(authoredReviewsItem?.action).toBe('ANONYMIZE')

    const receivedReviewsItem = plan.items.find((item) => item.id.includes('reviews-received'))
    expect(receivedReviewsItem).toBeDefined()
    expect(receivedReviewsItem?.action).toBe('REVIEW_REQUIRED')
  })

  it('8. schedules EXTERNAL_ERASURE for third-party processors (Didit and OpenAI)', async () => {
    const plan = await generateSubjectLifecyclePlan(mockSubjectId)

    const diditItem = plan.items.find((item) => item.externalProcessor === 'Didit')
    expect(diditItem).toBeDefined()
    expect(diditItem?.action).toBe('EXTERNAL_ERASURE')

    const openaiItem = plan.items.find((item) => item.externalProcessor === 'OpenAI')
    expect(openaiItem).toBeDefined()
    expect(openaiItem?.action).toBe('EXTERNAL_ERASURE')
  })

  it('9. GUARANTEES ZERO MUTATIONS: no database delete/update, no storage remove, no auth delete', async () => {
    await generateSubjectLifecyclePlan(mockSubjectId)

    expect(deleteSpy).not.toHaveBeenCalled()
    expect(updateSpy).not.toHaveBeenCalled()
    expect(insertSpy).not.toHaveBeenCalled()
    expect(removeStorageSpy).not.toHaveBeenCalled()
    expect(deleteAuthSpy).not.toHaveBeenCalled()
  })

  it('10. demonstrates determinism and idempotency on consecutive runs', async () => {
    const plan1 = await generateSubjectLifecyclePlan(mockSubjectId)
    const plan2 = await generateSubjectLifecyclePlan(mockSubjectId)

    expect(plan1.summary).toEqual(plan2.summary)
    expect(plan1.items.length).toBe(plan2.items.length)
    expect(plan1.items.map((i) => i.action)).toEqual(plan2.items.map((i) => i.action))
  })
})
