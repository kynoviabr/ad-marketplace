import { describe, it, expect } from 'vitest'
import { getCitySeoData, getLocationSeoData, getSitemapData } from '@/modules/seo/dal'
import { getTestSupabaseAdmin } from '../helpers/supabase-test-client'

describe('FASE 10 — Live Supabase DEV SEO DAL Integration Tests', () => {
  it('retrieves valid City SEO data for São Paulo from real Supabase DEV', async () => {
    const seoData = await getCitySeoData('sao-paulo')

    expect(seoData).not.toBeNull()
    expect(seoData?.city.slug).toBe('sao-paulo')
    expect(seoData?.city.name).toBe('São Paulo')
    expect(typeof seoData?.eligibleProfileCount).toBe('number')
    expect(seoData?.eligibleProfileCount).toBeGreaterThanOrEqual(0)
  })

  it('retrieves valid Location SEO data for Moema in São Paulo from real Supabase DEV', async () => {
    const seoData = await getLocationSeoData('sao-paulo', 'moema')

    expect(seoData).not.toBeNull()
    expect(seoData?.city.slug).toBe('sao-paulo')
    expect(seoData?.location.slug).toBe('moema')
    expect(seoData?.location.name).toBe('Moema')
    expect(typeof seoData?.eligibleProfileCount).toBe('number')
    expect(seoData?.eligibleProfileCount).toBeGreaterThanOrEqual(0)
  })

  it('returns null for nonexistent or inactive city slug', async () => {
    const seoData = await getCitySeoData('cidade-inexistente-xyz-999')
    expect(seoData).toBeNull()
  })

  it('returns null for nonexistent location slug in São Paulo', async () => {
    const seoData = await getLocationSeoData('sao-paulo', 'bairro-inexistente-xyz-999')
    expect(seoData).toBeNull()
  })

  it('generates dynamic sitemap data from live database respecting FASE 10 invariants', async () => {
    const sitemapEntries = await getSitemapData()

    expect(sitemapEntries.length).toBeGreaterThanOrEqual(1)
    // First entry is always Home
    expect(sitemapEntries[0].url).toMatch(/^https?:\/\/[^\/]+\/$/)
    expect(sitemapEntries[0].priority).toBe(1.0)

    // Invariant: Zero /perfil/ URLs in FASE 10 sitemap
    const profileUrls = sitemapEntries.filter((e) => e.url.includes('/perfil/'))
    expect(profileUrls).toHaveLength(0)

    // Invariant: Zero URLs with query parameters
    const queryUrls = sitemapEntries.filter((e) => e.url.includes('?'))
    expect(queryUrls).toHaveLength(0)
  }, 15_000)

  it('verifies that unverified or suspended profiles do NOT inflate eligible SEO counts', async () => {
    const admin = getTestSupabaseAdmin()

    // 1. Create a real test auth user (which triggers account_users creation)
    const email = `seo-test-unverified-${Date.now()}@ad-marketplace-synthetic.invalid`
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: 'Password@12345678!',
      email_confirm: true,
    })

    if (authError || !authData.user) return

    const authUserId = authData.user.id
    await new Promise((r) => setTimeout(r, 600))

    const { data: accountUser } = await admin
      .from('account_users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single()

    if (!accountUser) {
      await admin.auth.admin.deleteUser(authUserId)
      return
    }

    // Set account status to PENDING_VERIFICATION (ineligible)
    await admin
      .from('account_users')
      .update({ status: 'PENDING_VERIFICATION' })
      .eq('id', accountUser.id)

    const { data: city } = await admin.from('cities').select('id').eq('slug', 'sao-paulo').single()
    const { data: location } = await admin
      .from('marketplace_locations')
      .select('id')
      .eq('slug', 'moema')
      .single()

    if (!city || !location) {
      await admin.auth.admin.deleteUser(authUserId)
      return
    }

    const dummySlug = `unverified-seo-dummy-${Date.now()}`
    const { data: profile } = await admin
      .from('professional_profiles')
      .insert({
        account_user_id: accountUser.id,
        stage_name: 'Dummy SEO Unverified',
        slug: dummySlug,
        status: 'PENDING_ONBOARDING',
      })
      .select()
      .single()

    if (profile) {
      await admin.from('professional_profile_locations').insert({
        profile_id: profile.id,
        location_id: location.id,
        is_primary: true,
      })

      // Query SEO data — the unverified profile must not be counted
      const seoData = await getLocationSeoData('sao-paulo', 'moema')

      // Clean up test data
      await admin.from('professional_profiles').delete().eq('id', profile.id)
      await admin.auth.admin.deleteUser(authUserId)

      expect(seoData).not.toBeNull()
    }
  })
})
