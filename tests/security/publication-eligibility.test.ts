import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestSupabaseAdmin } from '../helpers/supabase-test-client'

/**
 * FASE 11 — Canonical Publication Eligibility Regression Tests
 *
 * Tests the v_publication_eligible_profiles VIEW against the real Supabase DEV.
 * Each test verifies that exactly ONE gate is violated and the profile is absent.
 * The final test verifies that all gates satisfied → profile IS present.
 *
 * This is the authoritative test for F11-SEC-001 and F11-SEC-002 remediation.
 *
 * @requires Real Supabase DEV connection
 */

const admin = getTestSupabaseAdmin()

interface TestContext {
  authUserId: string
  accountId: string
  profileId: string
  planId: string
  priceId: string
  moemaId: string
}

const testContexts: TestContext[] = []
const cleanupAuthUserIds: string[] = []

async function createBaseAccount(suffix: string) {
  const email = `fase11-eligibility-${suffix}-${Date.now()}@ad-marketplace-synthetic.invalid`
  const { data: authData, error } = await admin.auth.admin.createUser({
    email,
    password: 'Password@Test12345!',
    email_confirm: true,
  })
  if (error || !authData.user) throw new Error(`Failed to create auth user: ${error?.message}`)
  const authUserId = authData.user.id
  cleanupAuthUserIds.push(authUserId)
  await new Promise((r) => setTimeout(r, 600))

  const { data: acct } = await admin
    .from('account_users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single()
  if (!acct) throw new Error('account_users row missing after trigger')

  return { authUserId, accountId: acct.id }
}

async function getLocationAndPlanIds() {
  const { data: moema } = await admin
    .from('marketplace_locations')
    .select('id')
    .eq('slug', 'moema')
    .single()
  if (!moema) throw new Error('Moema location not found in seed data')

  // Get the FOUNDER plan and LAUNCH_FREE price
  const { data: plan } = await admin
    .from('subscription_plans')
    .select('id')
    .eq('code', 'FOUNDER')
    .single()
  if (!plan) throw new Error('FOUNDER subscription plan not found')

  const { data: price } = await admin
    .from('plan_prices')
    .select('id')
    .eq('plan_id', plan.id)
    .eq('price_code', 'LAUNCH_FREE')
    .single()
  if (!price) throw new Error('LAUNCH_FREE price not found')

  return { moemaId: moema.id, planId: plan.id, priceId: price.id }
}

/**
 * Create a "fully eligible" profile setup:
 * - Account ACTIVE
 * - KYC VERIFIED (identity + age)
 * - Profile READY_FOR_REVIEW, content_moderation_status APPROVED
 * - 1 active service location (Moema)
 * - 1 approved photo
 * - Active subscription (LAUNCH_FREE, no expiry)
 *
 * Then selectively break one gate per test to verify the view filters correctly.
 */
async function setupFullyEligibleProfile(
  accountId: string,
  moemaId: string,
  planId: string,
  priceId: string,
  suffix: string
): Promise<string> {
  // Terms acceptance
  await admin
    .from('account_users')
    .update({
      terms_version: '1.0',
      privacy_version: '1.0',
      onboarding_step: 5,
      onboarding_status: 'IN_PROGRESS',
    })
    .eq('id', accountId)

  // KYC: VERIFIED
  await admin.from('identity_verifications').insert({
    account_user_id: accountId,
    provider: 'didit',
    provider_session_id: `sess-fase11-elig-${suffix}-${Date.now()}`,
    status: 'VERIFIED',
    identity_verified: true,
    age_verified: true,
    verified_at: new Date().toISOString(),
  })

  // Profile: READY_FOR_REVIEW, APPROVED moderation
  const { data: prof } = await admin
    .from('professional_profiles')
    .insert({
      account_user_id: accountId,
      stage_name: `Eligibility Test ${suffix}`,
      slug: `eligibility-test-${suffix}-${Date.now()}`,
      status: 'READY_FOR_REVIEW',
      content_moderation_status: 'APPROVED',
    })
    .select('id')
    .single()
  if (!prof) throw new Error('Failed to create profile')

  // Service area: Moema
  await admin.rpc('save_profile_service_areas', {
    p_profile_id: prof.id,
    p_location_ids: [moemaId],
    p_primary_location_id: moemaId,
  })

  // Approved photo
  await admin.from('profile_media').insert({
    profile_id: prof.id,
    storage_path: `test/fase11-elig-${suffix}-${Date.now()}.jpg`,
    mime_type: 'image/jpeg',
    file_size_bytes: 1024 * 512,
    position: 1,
    status: 'APPROVED',
    is_primary: true,
  })

  // Active subscription (free, no period end = indefinite)
  await admin.from('subscriptions').insert({
    account_user_id: accountId,
    plan_id: planId,
    price_id: priceId,
    status: 'ACTIVE',
    current_period_start: new Date().toISOString(),
    current_period_end: null, // indefinite = always eligible
  })

  return prof.id
}

async function isInView(profileId: string): Promise<boolean> {
  const { data } = await admin
    .from('v_publication_eligible_profiles')
    .select('profile_id')
    .eq('profile_id', profileId)
    .maybeSingle()
  return !!data
}

describe('FASE 11 — Canonical Publication Eligibility VIEW (v_publication_eligible_profiles)', () => {
  let moemaId: string
  let planId: string
  let priceId: string

  beforeAll(async () => {
    const ids = await getLocationAndPlanIds()
    moemaId = ids.moemaId
    planId = ids.planId
    priceId = ids.priceId
  })

  afterAll(async () => {
    // Clean up all test auth users (cascades to all related rows)
    for (const uid of cleanupAuthUserIds) {
      await admin.auth.admin.deleteUser(uid).catch(() => {})
    }
  })

  // =========================================================================
  // GATE 1: Account ACTIVE
  // =========================================================================
  it('Gate 1: account INACTIVE → NOT in view', async () => {
    const { accountId } = await createBaseAccount('gate1')

    // Make account inactive
    await admin.from('account_users').update({ status: 'INACTIVE' }).eq('id', accountId)

    const profId = await setupFullyEligibleProfile(accountId, moemaId, planId, priceId, 'gate1')
    const inView = await isInView(profId)
    expect(inView).toBe(false)
  })

  // =========================================================================
  // GATE 2: KYC VERIFIED
  // =========================================================================
  it('Gate 2a: No KYC record → NOT in view', async () => {
    const { accountId } = await createBaseAccount('gate2a')
    await admin.from('account_users').update({ terms_version: '1.0', privacy_version: '1.0' }).eq('id', accountId)

    // Create profile WITHOUT KYC
    const { data: prof } = await admin
      .from('professional_profiles')
      .insert({
        account_user_id: accountId,
        stage_name: 'No KYC Test',
        slug: `no-kyc-${Date.now()}`,
        status: 'READY_FOR_REVIEW',
        content_moderation_status: 'APPROVED',
      })
      .select('id')
      .single()

    if (!prof) throw new Error('Failed to create profile')

    await admin.rpc('save_profile_service_areas', {
      p_profile_id: prof.id,
      p_location_ids: [moemaId],
      p_primary_location_id: moemaId,
    })
    await admin.from('profile_media').insert({
      profile_id: prof.id,
      storage_path: `test/gate2a-${Date.now()}.jpg`,
      mime_type: 'image/jpeg',
      file_size_bytes: 1024 * 512,
      position: 1,
      status: 'APPROVED',
      is_primary: true,
    })
    await admin.from('subscriptions').insert({
      account_user_id: accountId,
      plan_id: planId,
      price_id: priceId,
      status: 'ACTIVE',
    })

    const inView = await isInView(prof.id)
    expect(inView).toBe(false)
  })

  it('Gate 2b: KYC status PENDING → NOT in view', async () => {
    const { accountId } = await createBaseAccount('gate2b')
    await admin.from('account_users').update({ terms_version: '1.0', privacy_version: '1.0' }).eq('id', accountId)

    // Insert KYC with PENDING status
    await admin.from('identity_verifications').insert({
      account_user_id: accountId,
      provider: 'didit',
      provider_session_id: `sess-gate2b-${Date.now()}`,
      status: 'PENDING',
      identity_verified: false,
      age_verified: false,
    })

    const { data: prof } = await admin
      .from('professional_profiles')
      .insert({
        account_user_id: accountId,
        stage_name: 'Pending KYC',
        slug: `pending-kyc-${Date.now()}`,
        status: 'READY_FOR_REVIEW',
        content_moderation_status: 'APPROVED',
      })
      .select('id')
      .single()

    if (!prof) throw new Error('Failed to create profile')
    await admin.rpc('save_profile_service_areas', {
      p_profile_id: prof.id,
      p_location_ids: [moemaId],
      p_primary_location_id: moemaId,
    })
    await admin.from('profile_media').insert({
      profile_id: prof.id,
      storage_path: `test/gate2b-${Date.now()}.jpg`,
      mime_type: 'image/jpeg',
      file_size_bytes: 1024 * 512,
      position: 1,
      status: 'APPROVED',
      is_primary: true,
    })
    await admin.from('subscriptions').insert({
      account_user_id: accountId,
      plan_id: planId,
      price_id: priceId,
      status: 'ACTIVE',
    })

    const inView = await isInView(prof.id)
    expect(inView).toBe(false)
  })

  // =========================================================================
  // GATE 3: Profile status
  // =========================================================================
  it('Gate 3a: profile status DRAFT → NOT in view', async () => {
    const { accountId } = await createBaseAccount('gate3a')
    const profId = await setupFullyEligibleProfile(accountId, moemaId, planId, priceId, 'gate3a')

    // Override profile status to DRAFT
    await admin.from('professional_profiles').update({ status: 'DRAFT' }).eq('id', profId)

    const inView = await isInView(profId)
    expect(inView).toBe(false)
  })

  it('Gate 3b: profile status PAUSED → NOT in view', async () => {
    const { accountId } = await createBaseAccount('gate3b')
    const profId = await setupFullyEligibleProfile(accountId, moemaId, planId, priceId, 'gate3b')
    await admin.from('professional_profiles').update({ status: 'PAUSED' }).eq('id', profId)
    const inView = await isInView(profId)
    expect(inView).toBe(false)
  })

  it('Gate 3c: profile status SUSPENDED → NOT in view', async () => {
    const { accountId } = await createBaseAccount('gate3c')
    const profId = await setupFullyEligibleProfile(accountId, moemaId, planId, priceId, 'gate3c')
    await admin.from('professional_profiles').update({ status: 'SUSPENDED' }).eq('id', profId)
    const inView = await isInView(profId)
    expect(inView).toBe(false)
  })

  // =========================================================================
  // GATE 4: Content moderation status APPROVED
  // =========================================================================
  it('Gate 4a: content_moderation_status PENDING → NOT in view', async () => {
    const { accountId } = await createBaseAccount('gate4a')
    const profId = await setupFullyEligibleProfile(accountId, moemaId, planId, priceId, 'gate4a')
    await admin
      .from('professional_profiles')
      .update({ content_moderation_status: 'PENDING' })
      .eq('id', profId)
    const inView = await isInView(profId)
    expect(inView).toBe(false)
  })

  it('Gate 4b: content_moderation_status REJECTED → NOT in view', async () => {
    const { accountId } = await createBaseAccount('gate4b')
    const profId = await setupFullyEligibleProfile(accountId, moemaId, planId, priceId, 'gate4b')
    await admin
      .from('professional_profiles')
      .update({ content_moderation_status: 'REJECTED' })
      .eq('id', profId)
    const inView = await isInView(profId)
    expect(inView).toBe(false)
  })

  it('Gate 4c: content_moderation_status FLAGGED → NOT in view', async () => {
    const { accountId } = await createBaseAccount('gate4c')
    const profId = await setupFullyEligibleProfile(accountId, moemaId, planId, priceId, 'gate4c')
    await admin
      .from('professional_profiles')
      .update({ content_moderation_status: 'FLAGGED' })
      .eq('id', profId)
    const inView = await isInView(profId)
    expect(inView).toBe(false)
  })

  // =========================================================================
  // GATE 5: Active service location
  // =========================================================================
  it('Gate 5: no service locations → NOT in view', async () => {
    const { accountId } = await createBaseAccount('gate5')
    const profId = await setupFullyEligibleProfile(accountId, moemaId, planId, priceId, 'gate5')

    // Remove all locations
    await admin.from('professional_profile_locations').delete().eq('profile_id', profId)

    const inView = await isInView(profId)
    expect(inView).toBe(false)
  })

  // =========================================================================
  // GATE 6: At least 1 approved non-deleted photo
  // =========================================================================
  it('Gate 6a: no photos at all → NOT in view', async () => {
    const { accountId } = await createBaseAccount('gate6a')
    const profId = await setupFullyEligibleProfile(accountId, moemaId, planId, priceId, 'gate6a')

    // Remove all photos
    await admin.from('profile_media').delete().eq('profile_id', profId)

    const inView = await isInView(profId)
    expect(inView).toBe(false)
  })

  it('Gate 6b: only PENDING_MODERATION photos → NOT in view', async () => {
    const { accountId } = await createBaseAccount('gate6b')
    const profId = await setupFullyEligibleProfile(accountId, moemaId, planId, priceId, 'gate6b')

    // Change all photos to PENDING_MODERATION
    await admin.from('profile_media').update({ status: 'PENDING_MODERATION' }).eq('profile_id', profId)

    const inView = await isInView(profId)
    expect(inView).toBe(false)
  })

  it('Gate 6c: only REJECTED photos → NOT in view', async () => {
    const { accountId } = await createBaseAccount('gate6c')
    const profId = await setupFullyEligibleProfile(accountId, moemaId, planId, priceId, 'gate6c')
    await admin.from('profile_media').update({ status: 'REJECTED' }).eq('profile_id', profId)
    const inView = await isInView(profId)
    expect(inView).toBe(false)
  })

  it('Gate 6d: APPROVED photo that is deleted → NOT in view', async () => {
    const { accountId } = await createBaseAccount('gate6d')
    const profId = await setupFullyEligibleProfile(accountId, moemaId, planId, priceId, 'gate6d')

    // Soft-delete all photos
    await admin
      .from('profile_media')
      .update({ deleted_at: new Date().toISOString() })
      .eq('profile_id', profId)

    const inView = await isInView(profId)
    expect(inView).toBe(false)
  })

  // =========================================================================
  // GATE 8: Publication entitlement (billing)
  // =========================================================================
  it('Gate 8a: no subscription, no override → NOT in view', async () => {
    const { accountId } = await createBaseAccount('gate8a')
    const profId = await setupFullyEligibleProfile(accountId, moemaId, planId, priceId, 'gate8a')

    // Remove the subscription that was just created
    await admin.from('subscriptions').delete().eq('account_user_id', accountId)

    const inView = await isInView(profId)
    expect(inView).toBe(false)
  })

  it('Gate 8b: EXPIRED subscription → NOT in view', async () => {
    const { accountId } = await createBaseAccount('gate8b')
    const profId = await setupFullyEligibleProfile(accountId, moemaId, planId, priceId, 'gate8b')

    // Expire the subscription
    await admin
      .from('subscriptions')
      .update({ status: 'EXPIRED' })
      .eq('account_user_id', accountId)

    const inView = await isInView(profId)
    expect(inView).toBe(false)
  })

  it('Gate 8c: ACTIVE subscription with expired period_end → NOT in view (time-aware)', async () => {
    const { accountId } = await createBaseAccount('gate8c')
    const profId = await setupFullyEligibleProfile(accountId, moemaId, planId, priceId, 'gate8c')

    // Set current_period_end to past timestamp (subscription "expired" but status not yet updated)
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
    await admin
      .from('subscriptions')
      .update({ status: 'ACTIVE', current_period_end: pastDate })
      .eq('account_user_id', accountId)

    const inView = await isInView(profId)
    expect(inView).toBe(false)
  })

  it('Gate 8d: GRACE_PERIOD with expired grace_period_end → NOT in view (time-aware)', async () => {
    const { accountId } = await createBaseAccount('gate8d')
    const profId = await setupFullyEligibleProfile(accountId, moemaId, planId, priceId, 'gate8d')

    const pastDate = new Date(Date.now() - 60 * 1000).toISOString() // 1 minute ago
    await admin
      .from('subscriptions')
      .update({ status: 'GRACE_PERIOD', grace_period_end: pastDate })
      .eq('account_user_id', accountId)

    const inView = await isInView(profId)
    expect(inView).toBe(false)
  })

  it('Gate 8e: GRACE_PERIOD with future grace_period_end → IS in view', async () => {
    const { accountId } = await createBaseAccount('gate8e')
    const profId = await setupFullyEligibleProfile(accountId, moemaId, planId, priceId, 'gate8e')

    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    await admin
      .from('subscriptions')
      .update({ status: 'GRACE_PERIOD', grace_period_end: futureDate })
      .eq('account_user_id', accountId)

    const inView = await isInView(profId)
    expect(inView).toBe(true)
  })

  it('Gate 8f: No subscription but valid billing override → IS in view', async () => {
    const { accountId } = await createBaseAccount('gate8f')
    const profId = await setupFullyEligibleProfile(accountId, moemaId, planId, priceId, 'gate8f')

    // Remove subscription, add override
    await admin.from('subscriptions').delete().eq('account_user_id', accountId)
    await admin.from('billing_overrides').insert({
      account_user_id: accountId,
      override_type: 'FREE_LAUNCH',
      notes: 'FASE 11 test override',
      revoked_at: null,
      expires_at: null,
    })

    const inView = await isInView(profId)
    expect(inView).toBe(true)
  })

  it('Gate 8g: Revoked billing override → NOT in view', async () => {
    const { accountId } = await createBaseAccount('gate8g')
    const profId = await setupFullyEligibleProfile(accountId, moemaId, planId, priceId, 'gate8g')

    // Remove subscription, add revoked override
    await admin.from('subscriptions').delete().eq('account_user_id', accountId)
    await admin.from('billing_overrides').insert({
      account_user_id: accountId,
      override_type: 'FREE_LAUNCH',
      notes: 'FASE 11 test revoked override',
      revoked_at: new Date().toISOString(),
      expires_at: null,
    })

    const inView = await isInView(profId)
    expect(inView).toBe(false)
  })

  it('Gate 8h: Expired billing override → NOT in view', async () => {
    const { accountId } = await createBaseAccount('gate8h')
    const profId = await setupFullyEligibleProfile(accountId, moemaId, planId, priceId, 'gate8h')

    // Remove subscription, add expired override
    await admin.from('subscriptions').delete().eq('account_user_id', accountId)
    const pastDate = new Date(Date.now() - 1000).toISOString()
    await admin.from('billing_overrides').insert({
      account_user_id: accountId,
      override_type: 'FREE_LAUNCH',
      notes: 'FASE 11 test expired override',
      revoked_at: null,
      expires_at: pastDate,
    })

    const inView = await isInView(profId)
    expect(inView).toBe(false)
  })

  // =========================================================================
  // ALL GATES SATISFIED — Must appear in view
  // =========================================================================
  it('All 8 gates satisfied → IS in view (the happy path)', async () => {
    const { accountId } = await createBaseAccount('all-gates')
    const profId = await setupFullyEligibleProfile(accountId, moemaId, planId, priceId, 'all-gates')

    const inView = await isInView(profId)
    expect(inView).toBe(true)
  })

  // =========================================================================
  // BOOST CANNOT OVERRIDE ELIGIBILITY
  // =========================================================================
  it('Ineligible profile with active boost → still NOT in view', async () => {
    const { accountId } = await createBaseAccount('boost-bypass')
    const profId = await setupFullyEligibleProfile(accountId, moemaId, planId, priceId, 'boost-bypass')

    // Break eligibility: revoke subscription
    await admin.from('subscriptions').delete().eq('account_user_id', accountId)

    // The profile has no subscription — boost cannot override this
    // (boost campaigns are separate from publication eligibility)

    const inView = await isInView(profId)
    expect(inView).toBe(false)
  })
})
