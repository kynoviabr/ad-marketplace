/**
 * FASE 09 — Live Supabase DEV Analytics Integration Tests
 *
 * Tests the analytics domain against the real Supabase DEV database:
 * - Table schema and constraint validation
 * - RLS policy validation: anon denied all raw events
 * - Ingestion of PROFILE_IMPRESSION and CONTACT_WHATSAPP_CLICKED
 * - Server-side sponsored attribution resolution
 * - BOOST_ACTIVATED lifecycle event idempotency (event_key uniqueness)
 * - Deterministic daily metrics aggregation into profile_daily_metrics and platform_daily_metrics
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestSupabaseAdmin, getTestSupabaseAnon } from '@/tests/helpers/supabase-test-client'
import { ingestClientEvent, recordBoostActivatedEvent, recordSearchPerformedEvent } from '@/modules/analytics/write'
import { aggregateDailyMetrics } from '@/modules/analytics/aggregation'

describe('FASE 09 — Live Supabase DEV Analytics Integration Tests', () => {
  const admin = getTestSupabaseAdmin()
  const anon = getTestSupabaseAnon()

  let testAuthUserId: string
  let testAccountId: string
  let testProfileId: string
  let testProfileSlug: string
  let spCityId: string
  let moemaLocationId: string
  let boostCampaignId: string

  const createdEventIds: string[] = []

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
      .eq('slug', 'moema')
      .single()
    expect(loc).toBeTruthy()
    moemaLocationId = loc!.id

    // 2. Create test advertiser user, account & profile
    const testEmail = `fase09-analytics-test-${Date.now()}@admarketplace.test`
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
    })
    expect(authError).toBeNull()
    testAuthUserId = authData.user!.id

    // Poll for account_users record created by trigger
    for (let i = 0; i < 10; i++) {
      const { data: acct } = await admin
        .from('account_users')
        .select('id')
        .eq('auth_user_id', testAuthUserId)
        .maybeSingle()
      if (acct) {
        testAccountId = acct.id
        break
      }
      await new Promise((r) => setTimeout(r, 200))
    }
    expect(testAccountId).toBeTruthy()

    // 3. Create professional profile
    testProfileSlug = `prof-analytics-test-${Date.now()}`
    const { data: prof, error: profErr } = await admin
      .from('professional_profiles')
      .insert({
        account_user_id: testAccountId,
        stage_name: 'Analytics Test Profile',
        slug: testProfileSlug,
        status: 'ACTIVE',
        content_moderation_status: 'APPROVED',
      })
      .select('id')
      .single()

    expect(profErr).toBeNull()
    testProfileId = prof!.id

    // 4. Link Moema location
    await admin.from('professional_profile_locations').insert({
      profile_id: testProfileId,
      location_id: moemaLocationId,
      is_primary: true,
    })

    // 5. Create active boost campaign fixture
    const { data: product } = await admin
      .from('boost_products')
      .select('id')
      .eq('code', 'BOOST_CITY_24H')
      .single()

    const { data: price } = await admin
      .from('boost_prices')
      .select('id')
      .eq('boost_product_id', product!.id)
      .eq('is_active', true)
      .limit(1)
      .single()

    const now = new Date()
    const ends = new Date(now.getTime() + 24 * 3600 * 1000)

    const { data: campaign, error: campErr } = await admin
      .from('profile_boosts')
      .insert({
        profile_id: testProfileId,
        boost_product_id: product!.id,
        boost_price_id: price!.id,
        scope_type: 'CITY',
        city_id: spCityId,
        location_id: null,
        starts_at: now.toISOString(),
        ends_at: ends.toISOString(),
        status: 'ACTIVE',
        provider: 'MOCK',
      })
      .select('id')
      .single()

    expect(campErr).toBeNull()
    boostCampaignId = campaign!.id
  })

  afterAll(async () => {
    // Cleanup fixtures
    if (boostCampaignId) {
      await admin.from('profile_boosts').delete().eq('id', boostCampaignId)
    }
    if (testProfileId) {
      await admin.from('analytics_events').delete().eq('profile_id', testProfileId)
      await admin.from('profile_daily_metrics').delete().eq('profile_id', testProfileId)
      await admin.from('professional_profile_locations').delete().eq('profile_id', testProfileId)
      await admin.from('professional_profiles').delete().eq('id', testProfileId)
    }
    if (testAuthUserId) {
      await admin.auth.admin.deleteUser(testAuthUserId)
    }
  })

  it('RLS: anon client CANNOT read from analytics_events table', async () => {
    const { data, error } = await anon.from('analytics_events').select('*').limit(5)
    expect(data === null || data.length === 0).toBe(true)
  })

  it('RLS: anon client CANNOT insert into analytics_events table', async () => {
    const { error } = await anon.from('analytics_events').insert({
      event_type: 'PROFILE_IMPRESSION',
      occurred_at: new Date().toISOString(),
    })
    expect(error).toBeTruthy()
  })

  it('records a server-authoritative SEARCH_PERFORMED event', async () => {
    await recordSearchPerformedEvent({
      cityId: spCityId,
      locationId: moemaLocationId,
      resultPage: 1,
      totalProfiles: 42,
      sponsoredCount: 4,
      hasFilters: true,
    })

    const { data: rows } = await admin
      .from('analytics_events')
      .select('*')
      .eq('event_type', 'SEARCH_PERFORMED')
      .eq('city_id', spCityId)
      .eq('location_id', moemaLocationId)
      .order('received_at', { ascending: false })
      .limit(1)

    expect(rows && rows.length > 0).toBe(true)
    const row = rows![0]
    expect(row.total_profiles).toBe(42)
    expect(row.sponsored_count).toBe(4)
    expect(row.has_filters).toBe(true)
    expect(row.profile_id).toBeNull()
    expect(row.visitor_session_id).toBeNull()
  })

  it('ingests client PROFILE_IMPRESSION with server-authoritative sponsored attribution', async () => {
    const sessionUuid = '11112222-3333-4444-5555-666677778888'

    const res = await ingestClientEvent({
      event_type: 'PROFILE_IMPRESSION',
      profile_slug: testProfileSlug,
      city_slug: 'sao-paulo',
      location_slug: 'moema',
      placement_type: 'SPONSORED',
      result_page: 1,
      result_position: 0,
      occurred_at: new Date().toISOString(),
      visitor_session_id: sessionUuid,
    })

    expect(res.success).toBe(true)

    // Verify row in database
    const { data: rows } = await admin
      .from('analytics_events')
      .select('*')
      .eq('profile_id', testProfileId)
      .eq('event_type', 'PROFILE_IMPRESSION')
      .order('received_at', { ascending: false })
      .limit(1)

    expect(rows && rows.length > 0).toBe(true)
    const row = rows![0]
    expect(row.placement_type).toBe('SPONSORED')
    expect(row.boost_campaign_id).toBe(boostCampaignId) // Correct server-resolved campaign ID
    expect(row.visitor_session_id).toBe(sessionUuid)
  })

  it('ingests CONTACT_WHATSAPP_CLICKED event', async () => {
    const sessionUuid = '11112222-3333-4444-5555-666677778888'

    const res = await ingestClientEvent({
      event_type: 'CONTACT_WHATSAPP_CLICKED',
      profile_slug: testProfileSlug,
      city_slug: 'sao-paulo',
      placement_type: 'ORGANIC',
      occurred_at: new Date().toISOString(),
      visitor_session_id: sessionUuid,
    })

    expect(res.success).toBe(true)

    const { data: rows } = await admin
      .from('analytics_events')
      .select('*')
      .eq('profile_id', testProfileId)
      .eq('event_type', 'CONTACT_WHATSAPP_CLICKED')
      .order('received_at', { ascending: false })
      .limit(1)

    expect(rows && rows.length > 0).toBe(true)
    const row = rows![0]
    expect(row.placement_type).toBe('ORGANIC')
    expect(row.boost_campaign_id).toBeNull()
  })

  it('enforces idempotency on BOOST_ACTIVATED lifecycle events via event_key', async () => {
    const campaignFixture = {
      id: boostCampaignId,
      profile_id: testProfileId,
      city_id: spCityId,
      location_id: null,
      starts_at: new Date().toISOString(),
    }

    // Call 1: initial insertion
    await recordBoostActivatedEvent(campaignFixture)

    // Call 2: retry (should be handled silently as idempotent no-op)
    await recordBoostActivatedEvent(campaignFixture)

    const { data: rows } = await admin
      .from('analytics_events')
      .select('id, event_key')
      .eq('event_key', `boost_activated:${boostCampaignId}`)

    // Exactly 1 row must exist in the database despite two calls
    expect(rows?.length).toBe(1)
  })

  it('executes daily aggregation into profile_daily_metrics deterministically', async () => {
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())

    const result = await aggregateDailyMetrics(todayStr)
    expect(result.metricDate).toBe(todayStr)

    // Check that profile_daily_metrics row was upserted
    const { data: profMetrics } = await admin
      .from('profile_daily_metrics')
      .select('*')
      .eq('profile_id', testProfileId)
      .eq('metric_date', todayStr)
      .single()

    expect(profMetrics).toBeTruthy()
    expect(profMetrics.impressions_total).toBeGreaterThanOrEqual(1)
    expect(profMetrics.whatsapp_clicks).toBeGreaterThanOrEqual(1)

    // Check that platform_daily_metrics row was upserted
    const { data: platMetrics } = await admin
      .from('platform_daily_metrics')
      .select('*')
      .eq('metric_date', todayStr)
      .single()

    expect(platMetrics).toBeTruthy()
    expect(platMetrics.impressions_total).toBeGreaterThanOrEqual(1)
    expect(platMetrics.whatsapp_clicks_total).toBeGreaterThanOrEqual(1)
  })
})
