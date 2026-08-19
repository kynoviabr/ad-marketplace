/**
 * FASE 08 — Live Supabase DEV Promotions Integration Tests
 *
 * Tests the boost domain against the real Supabase DEV database:
 * - Seed validation for boost_products and boost_prices
 * - Concurrency-safe temporal overlap exclusion constraint enforcement
 * - Adjacent and separated campaign allowance
 * - Multiple scopes (CITY vs MARKETPLACE_LOCATION)
 * - State machine transitions and cancellation
 * - RLS policy validation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestSupabaseAdmin, getTestSupabaseAnon } from '@/tests/helpers/supabase-test-client'

describe('FASE 08 — Live Supabase DEV Promotions Integration Tests', () => {
  const admin = getTestSupabaseAdmin()
  const anon = getTestSupabaseAnon()

  let testAuthUserId: string
  let testAccountId: string
  let testProfileId: string
  let spCityId: string
  let moemaLocationId: string

  let city24hProduct: any
  let city24hPrice: any
  let location24hProduct: any
  let location24hPrice: any

  const createdCampaignIds: string[] = []

  beforeAll(async () => {
    // 1. Resolve São Paulo City & Moema Location from catalog
    const { data: city } = await admin
      .from('cities')
      .select('id')
      .eq('slug', 'sao-paulo')
      .single()
    expect(city).toBeTruthy()
    spCityId = city!.id

    const { data: loc } = await admin
      .from('marketplace_locations')
      .select('id')
      .eq('city_id', spCityId)
      .eq('slug', 'moema')
      .single()
    expect(loc).toBeTruthy()
    moemaLocationId = loc!.id

    // 2. Resolve Seeded Boost Products and Prices
    const { data: products } = await admin
      .from('boost_products')
      .select(`
        id,
        code,
        scope_type,
        duration_hours,
        prices:boost_prices (
          id,
          price_code,
          amount_minor,
          currency
        )
      `)
      .in('code', ['BOOST_CITY_24H', 'BOOST_LOCATION_24H'])

    expect(products).toBeTruthy()
    expect(products!.length).toBe(2)

    city24hProduct = products!.find((p) => p.code === 'BOOST_CITY_24H')
    city24hPrice = city24hProduct.prices[0]

    location24hProduct = products!.find((p) => p.code === 'BOOST_LOCATION_24H')
    location24hPrice = location24hProduct.prices[0]

    // 3. Create synthetic test user and profile
    const testEmail = `promotions-test-${Date.now()}@test.local`
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: testEmail,
      password: 'test-password-promotions-integration',
      email_confirm: true,
    })
    expect(authError).toBeNull()
    testAuthUserId = authUser!.user!.id

    const { data: existingAcct } = await admin
      .from('account_users')
      .select('id')
      .eq('auth_user_id', testAuthUserId)
      .maybeSingle()

    if (existingAcct) {
      await admin
        .from('account_users')
        .update({
          role: 'ADVERTISER',
          status: 'ACTIVE',
          onboarding_status: 'COMPLETED',
          onboarding_step: 5,
          terms_version: '1.0',
          terms_accepted_at: new Date().toISOString(),
          privacy_version: '1.0',
          privacy_accepted_at: new Date().toISOString(),
        })
        .eq('id', existingAcct.id)
      testAccountId = existingAcct.id
    } else {
      const { data: acct } = await admin
        .from('account_users')
        .insert({
          auth_user_id: testAuthUserId,
          role: 'ADVERTISER',
          status: 'ACTIVE',
          onboarding_status: 'COMPLETED',
          onboarding_step: 5,
          terms_version: '1.0',
          terms_accepted_at: new Date().toISOString(),
          privacy_version: '1.0',
          privacy_accepted_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      testAccountId = acct!.id
    }

    // 4. Create professional profile
    const { data: prof } = await admin
      .from('professional_profiles')
      .insert({
        account_user_id: testAccountId,
        stage_name: 'Sabrina Test',
        slug: `sabrina-promo-test-${Date.now()}`,
        status: 'ACTIVE',
        content_moderation_status: 'APPROVED',
      })
      .select('id')
      .single()
    expect(prof).toBeTruthy()
    testProfileId = prof!.id

    // 5. Link Moema service area
    await admin.from('professional_profile_locations').insert({
      profile_id: testProfileId,
      location_id: moemaLocationId,
      is_primary: true,
    })
  })

  afterAll(async () => {
    // Cleanup synthetic data
    if (createdCampaignIds.length > 0) {
      await admin.from('profile_boosts').delete().in('id', createdCampaignIds)
    }
    if (testProfileId) {
      await admin.from('professional_profile_locations').delete().eq('profile_id', testProfileId)
      await admin.from('profile_boosts').delete().eq('profile_id', testProfileId)
      await admin.from('professional_profiles').delete().eq('id', testProfileId)
    }
    if (testAccountId) {
      await admin.from('account_users').delete().eq('id', testAccountId)
    }
    if (testAuthUserId) {
      await admin.auth.admin.deleteUser(testAuthUserId)
    }
  })

  it('validates boost products and prices are seeded in database', async () => {
    const { data: products, error } = await admin
      .from('boost_products')
      .select('code, scope_type, duration_hours, is_active')
      .order('sort_order', { ascending: true })

    expect(error).toBeNull()
    expect(products).toBeTruthy()
    expect(products!.length).toBeGreaterThanOrEqual(4)

    const codes = products!.map((p) => p.code)
    expect(codes).toContain('BOOST_CITY_24H')
    expect(codes).toContain('BOOST_CITY_7D')
    expect(codes).toContain('BOOST_LOCATION_24H')
    expect(codes).toContain('BOOST_LOCATION_7D')
  })

  it('creates a city boost campaign via PENDING_PAYMENT → ACTIVE lifecycle', async () => {
    const now = new Date()
    const endsAt = new Date(now.getTime() + 24 * 3600 * 1000)

    // Step 1 of lifecycle: Insert as PENDING_PAYMENT (never as ACTIVE directly)
    const { data: campaign, error: insertError } = await admin
      .from('profile_boosts')
      .insert({
        profile_id: testProfileId,
        boost_product_id: city24hProduct.id,
        boost_price_id: city24hPrice.id,
        scope_type: 'CITY',
        city_id: spCityId,
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        status: 'PENDING_PAYMENT',
        provider: 'MOCK',
      })
      .select()
      .single()

    expect(insertError).toBeNull()
    expect(campaign).toBeTruthy()
    expect(campaign!.status).toBe('PENDING_PAYMENT')

    // Step 2 of lifecycle: Provider confirms payment → transition to ACTIVE
    const { data: updated, error: updateError } = await admin
      .from('profile_boosts')
      .update({
        status: 'ACTIVE',
        provider_payment_id: `mock_pay_${Date.now()}`,
      })
      .eq('id', campaign!.id)
      .select()
      .single()

    expect(updateError).toBeNull()
    expect(updated!.status).toBe('ACTIVE')
    expect(updated!.provider_payment_id).toMatch(/^mock_pay_/)
    createdCampaignIds.push(campaign!.id)
  })

  it('enforces exclusion constraint: rejects overlapping city boost for the same profile and city', async () => {
    const now = new Date()
    // Overlapping period: starts in 6 hours, ends in 30 hours
    const overlapStarts = new Date(now.getTime() + 6 * 3600 * 1000)
    const overlapEnds = new Date(now.getTime() + 30 * 3600 * 1000)

    const { error } = await admin
      .from('profile_boosts')
      .insert({
        profile_id: testProfileId,
        boost_product_id: city24hProduct.id,
        boost_price_id: city24hPrice.id,
        scope_type: 'CITY',
        city_id: spCityId,
        starts_at: overlapStarts.toISOString(),
        ends_at: overlapEnds.toISOString(),
        status: 'ACTIVE',
        provider: 'MOCK',
      })
      .select()
      .single()

    // Must be rejected by the exclusion constraint (23P01)
    expect(error).toBeTruthy()
    expect(error!.code).toBe('23P01')
  })

  it('allows non-overlapping future campaign for the same profile and city', async () => {
    const now = new Date()
    // Future separated period: starts in 48 hours, ends in 72 hours
    const futureStarts = new Date(now.getTime() + 48 * 3600 * 1000)
    const futureEnds = new Date(now.getTime() + 72 * 3600 * 1000)

    const { data: campaign, error } = await admin
      .from('profile_boosts')
      .insert({
        profile_id: testProfileId,
        boost_product_id: city24hProduct.id,
        boost_price_id: city24hPrice.id,
        scope_type: 'CITY',
        city_id: spCityId,
        starts_at: futureStarts.toISOString(),
        ends_at: futureEnds.toISOString(),
        status: 'SCHEDULED',
        provider: 'MOCK',
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(campaign).toBeTruthy()
    expect(campaign!.status).toBe('SCHEDULED')
    createdCampaignIds.push(campaign!.id)
  })

  it('allows simultaneous location boost (different scope) during active city boost', async () => {
    const now = new Date()
    const endsAt = new Date(now.getTime() + 24 * 3600 * 1000)

    // Step 1: Insert as PENDING_PAYMENT
    const { data: campaign, error: insertError } = await admin
      .from('profile_boosts')
      .insert({
        profile_id: testProfileId,
        boost_product_id: location24hProduct.id,
        boost_price_id: location24hPrice.id,
        scope_type: 'MARKETPLACE_LOCATION',
        city_id: spCityId,
        location_id: moemaLocationId,
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        status: 'PENDING_PAYMENT',
        provider: 'MOCK',
      })
      .select()
      .single()

    expect(insertError).toBeNull()
    expect(campaign!.status).toBe('PENDING_PAYMENT')

    // Step 2: Confirm → ACTIVE
    const { data: updated, error: updateError } = await admin
      .from('profile_boosts')
      .update({ status: 'ACTIVE', provider_payment_id: `mock_loc_${Date.now()}` })
      .eq('id', campaign!.id)
      .select()
      .single()

    expect(updateError).toBeNull()
    expect(updated!.status).toBe('ACTIVE')
    createdCampaignIds.push(campaign!.id)
  })

  it('PENDING_PAYMENT → FAILED when provider declines: does not block future campaigns', async () => {
    const futureStart = new Date(Date.now() + 10 * 24 * 3600 * 1000) // +10 days
    const futureEnd = new Date(futureStart.getTime() + 24 * 3600 * 1000)

    // Insert as PENDING_PAYMENT
    const { data: campaign, error: insertError } = await admin
      .from('profile_boosts')
      .insert({
        profile_id: testProfileId,
        boost_product_id: city24hProduct.id,
        boost_price_id: city24hPrice.id,
        scope_type: 'CITY',
        city_id: spCityId,
        starts_at: futureStart.toISOString(),
        ends_at: futureEnd.toISOString(),
        status: 'PENDING_PAYMENT',
        provider: 'MOCK',
      })
      .select()
      .single()

    expect(insertError).toBeNull()
    expect(campaign!.status).toBe('PENDING_PAYMENT')

    // Provider declines → FAILED
    const { data: failed, error: failErr } = await admin
      .from('profile_boosts')
      .update({ status: 'FAILED' })
      .eq('id', campaign!.id)
      .select()
      .single()

    expect(failErr).toBeNull()
    expect(failed!.status).toBe('FAILED')

    // FAILED record does not block a NEW non-overlapping campaign for the same period
    // (FAILED is excluded from the exclusion constraint)
    const { data: newCampaign, error: newErr } = await admin
      .from('profile_boosts')
      .insert({
        profile_id: testProfileId,
        boost_product_id: city24hProduct.id,
        boost_price_id: city24hPrice.id,
        scope_type: 'CITY',
        city_id: spCityId,
        starts_at: futureStart.toISOString(),
        ends_at: futureEnd.toISOString(),
        status: 'PENDING_PAYMENT',
        provider: 'MOCK',
      })
      .select()
      .single()

    expect(newErr).toBeNull()
    expect(newCampaign!.status).toBe('PENDING_PAYMENT')
    createdCampaignIds.push(campaign!.id)
    createdCampaignIds.push(newCampaign!.id)
  })

  it('validates admin cancellation lifecycle', async () => {
    const campaignId = createdCampaignIds[0]
    const cancelReason = 'Moderação preventiva'

    const { data: updated, error } = await admin
      .from('profile_boosts')
      .update({
        status: 'CANCELED',
        canceled_at: new Date().toISOString(),
        canceled_by: testAccountId,
        cancellation_reason: cancelReason,
      })
      .eq('id', campaignId)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updated!.status).toBe('CANCELED')
    expect(updated!.cancellation_reason).toBe(cancelReason)
  })

  it('validates RLS: anon cannot read profile_boosts', async () => {
    const { data, error } = await anon
      .from('profile_boosts')
      .select('*')

    // Denied or empty due to RLS
    expect(data === null || data.length === 0).toBe(true)
  })
})

