import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { AccountUser } from '@/modules/auth/types'
import type { PublicationReviewState } from '@/modules/publication/types'
import { deriveDashboardPublicationStatus } from '@/modules/dashboard/status'
import { getProfessionalDashboardOverview } from '@/modules/dashboard/dal'
import { getTestSupabaseAdmin } from '../helpers/supabase-test-client'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const baseReview: PublicationReviewState = {
  profileId: 'fixture-profile', slug: 'fixture-slug', preview: null, previewPhotoUrl: null,
  primaryLocation: null, serviceAreas: [], readiness: [],
  photos: { approved: 0, pending: 0, rejected: 0, blocked: 0, statuses: [] },
  isCanonicallyEligible: false, onboardingCompleted: true, isPublic: false,
  blockingReasons: ['Defina uma região de atendimento.'], hasDataError: false,
}

describe('Velvet professional dashboard foundation — UNIT', () => {
  it('maps an actually public profile to NO AR', () => expect(deriveDashboardPublicationStatus({ ...baseReview, isPublic: true, isCanonicallyEligible: true }).label).toBe('NO AR'))
  it('keeps eligible-but-inactive distinct from public', () => expect(deriveDashboardPublicationStatus({ ...baseReview, isCanonicallyEligible: true }).label).toBe('PRONTO PARA PUBLICAR'))
  it('maps pending media to analysis', () => expect(deriveDashboardPublicationStatus({ ...baseReview, photos: { ...baseReview.photos, pending: 1 } }).label).toBe('EM ANÁLISE'))
  it('maps text moderation to analysis without exposing raw state', () => expect(deriveDashboardPublicationStatus({ ...baseReview, readiness: [{ key: 'publication', label: 'Publicação', ready: false, detail: 'Seu texto ainda está em análise.' }] }).label).toBe('EM ANÁLISE'))
  it('maps missing KYC, location or entitlement reasons to attention', () => expect(deriveDashboardPublicationStatus(baseReview).label).toBe('REQUER ATENÇÃO'))
  it('recomputes when canonical state changes', () => {
    expect(deriveDashboardPublicationStatus(baseReview).label).toBe('REQUER ATENÇÃO')
    expect(deriveDashboardPublicationStatus({ ...baseReview, isCanonicallyEligible: true, isPublic: true }).label).toBe('NO AR')
  })
})

describe('Velvet professional dashboard foundation — INTEGRATION CONTRACT', () => {
  const page = read('app/(dashboard)/dashboard/page.tsx')
  const header = read('components/dashboard/professional-dashboard-header.tsx')
  const dal = read('modules/dashboard/dal.ts')
  const publication = read('modules/publication/dal.ts')
  const proxy = read('proxy.ts')

  it('protects dashboard access and redirects incomplete onboarding through the resolver', () => {
    expect(proxy).toContain("const PROTECTED_ROUTES = ['/dashboard'")
    expect(page).toContain("if (account.onboarding_status !== 'COMPLETED') redirect('/onboarding')")
  })
  it('resolves ownership only from the authenticated account', () => {
    expect(page).toContain('const account = await requireAccount()')
    expect(page).toContain('getProfessionalDashboardOverview(account)')
    expect(publication).toContain(".eq('account_user_id', account.id)")
    expect(page).not.toMatch(/searchParams.*account|params.*profileId/)
  })
  it('reuses canonical publication readiness and entitlement', () => {
    expect(dal).toContain('getPublicationReviewState(account)')
    expect(dal).toContain('hasPublicationEntitlement(account.id)')
  })
  it('only exposes a public profile link for actual public state', () => expect(page).toContain("review.isPublic && review.slug ? `/perfil/${review.slug}` : '/onboarding/revisar'"))
  it('reuses real photo, profile, location and verification destinations', () => {
    expect(header).toContain("'/dashboard/photos'")
    expect(header).toContain("'/onboarding/seu-perfil'")
    expect(header).toContain("'/onboarding/onde-atende'")
    expect(header).toContain("'/onboarding/verificacao'")
  })
  it('shows canonical photo counts and service-area summary', () => {
    expect(page).toContain('review.photos.approved')
    expect(page).toContain('review.photos.pending')
    expect(page).toContain('review.serviceAreas.length')
  })
  it('reuses advertiser analytics and existing billing route without implementing checkout', () => {
    expect(dal).toContain('getAdvertiserMetrics(review.profileId, 30)')
    expect(page).toContain("href=\"/dashboard/analytics\"")
    expect(page).not.toContain('initiateCheckoutAction')
  })
})

describe('Velvet professional dashboard foundation — LIVE DEV', () => {
  it('resolves a completed, verified and published synthetic professional', async () => {
    const admin = getTestSupabaseAdmin()
    const { data: eligible, error } = await admin.from('v_publication_eligible_profiles').select('account_user_id, profile_slug').limit(1).maybeSingle()
    if (error || !eligible) throw new Error('No eligible synthetic DEV account available')
    const { data: original } = await admin.from('account_users').select('*').eq('id', eligible.account_user_id).single()
    if (!original || !/-sp-\d+$/.test(eligible.profile_slug)) throw new Error('Eligible account is not a known synthetic DEV fixture')
    try {
      const { data: completed, error: updateError } = await admin.from('account_users').update({ onboarding_status: 'COMPLETED', onboarding_step: 6 }).eq('id', original.id).select('*').single()
      if (updateError || !completed) throw new Error('Could not prepare completed synthetic DEV fixture')
      const overview = await getProfessionalDashboardOverview(completed as AccountUser)
      expect(overview.review.isPublic).toBe(true)
      expect(overview.status.label).toBe('NO AR')
      expect(overview.review.photos.approved).toBeGreaterThan(0)
      expect(overview.review.serviceAreas.length).toBeGreaterThan(0)
      expect(overview.review.readiness.find((item) => item.key === 'verification')?.ready).toBe(true)
    } finally {
      await admin.from('account_users').update({ onboarding_status: original.onboarding_status, onboarding_step: original.onboarding_step }).eq('id', original.id)
    }
  })
})
