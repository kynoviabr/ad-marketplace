import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SubmitReviewSchema, ReviewResponseSchema, ReportReviewSchema } from '@/modules/reviews/schemas'
import { PUBLIC_REVIEW_PREVIEW_LIMIT, PUBLIC_REVIEW_PAGE_SIZE } from '@/modules/reviews/dal'
import { getBoundedReviewPreviews } from '@/components/public/profile-reviews-preview'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')
const migration = read('supabase/migrations/20260902190846_real_reviews.sql')
const publicDal = read('modules/reviews/dal.ts')
const actions = read('modules/reviews/actions.ts')
const moderation = read('modules/moderation/actions.ts')
const profilePage = read('app/(public)/perfil/[slug]/page.tsx')
const jsonLd = read('modules/seo/structured-data.ts')

describe('Velvet R8 real reviews', () => {
  it.each([1, 2, 3, 4, 5])('accepts rating %i', (rating) => {
    expect(SubmitReviewSchema.safeParse({ profileId: crypto.randomUUID(), rating, comment: '' }).success).toBe(true)
  })

  it.each([0, 6, 2.5])('rejects invalid rating %s', (rating) => {
    expect(SubmitReviewSchema.safeParse({ profileId: crypto.randomUUID(), rating }).success).toBe(false)
  })

  it('enforces one row per reviewer/profile and a moderation gate', () => {
    expect(migration).toContain('UNIQUE (professional_profile_id, reviewer_account_user_id)')
    expect(migration).toContain("DEFAULT 'PENDING'")
    expect(actions).toContain("moderation_status: 'PENDING'")
    expect(publicDal).toContain(".eq('moderation_status', 'APPROVED')")
  })

  it('aggregates and previews approved reviews only with bounded output', () => {
    expect(PUBLIC_REVIEW_PREVIEW_LIMIT).toBe(3)
    expect(PUBLIC_REVIEW_PAGE_SIZE).toBe(10)
    const previews = Array.from({ length: 9 }, (_, index) => ({ id: String(index), rating: 5, body: null, authorLabel: 'Membro Velvet' }))
    expect(getBoundedReviewPreviews({ averageRating: 5, totalReviews: 9, previews })).toHaveLength(3)
    expect(profilePage).toContain('PUBLIC_REVIEW_PREVIEW_LIMIT')
  })

  it('supports one moderated professional response and review reports', () => {
    expect(ReviewResponseSchema.safeParse({ reviewId: crypto.randomUUID(), response: 'Obrigada.' }).success).toBe(true)
    expect(ReportReviewSchema.safeParse({ reviewId: crypto.randomUUID(), reason: 'OTHER' }).success).toBe(true)
    expect(migration).toContain('review_id UUID NOT NULL UNIQUE')
    expect(migration).toContain('CREATE TABLE public.review_reports')
    expect(moderation).toContain('professional_review_moderation_events')
  })

  it('keeps reviewer identity private and client roles locked out', () => {
    expect(migration).toContain('REVOKE ALL ON TABLE public.professional_reviews FROM PUBLIC, anon, authenticated')
    expect(publicDal).not.toMatch(/email|legal_name|auth_user_id/)
    expect(publicDal).toContain("authorLabel: 'Velvet member'")
  })

  it('does not add review or aggregate rating JSON-LD', () => {
    expect(jsonLd).not.toMatch(/AggregateRating|Review/)
  })

  it('contains no destructive migration statements', () => {
    expect(migration).not.toMatch(/\b(DROP|TRUNCATE|DELETE\s+FROM|ALTER\s+TABLE[^;]*DROP)\b/i)
  })
})
