import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestSupabaseAdmin, getTestSupabaseAnon } from '../helpers/supabase-test-client'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { generateUniqueSlug } from '@/modules/profiles/slug'
import { evaluateProfileCompleteness } from '@/modules/profiles/completeness'

describe('FASE 03 — Live Supabase DEV Profile Domain Integration Tests', () => {
  const admin = getTestSupabaseAdmin()
  const anon = getTestSupabaseAnon()

  let testAuthUserId: string
  let testAccountUserId: string
  let testProfileId: string

  beforeAll(async () => {
    // 1. Create a real test user in Supabase Auth
    const email = `test-profile-${Date.now()}@ad-marketplace-synthetic.invalid`
    const password = 'Password@12345678!'

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      throw new Error(`Failed to create test auth user: ${authError?.message}`)
    }

    testAuthUserId = authData.user.id

    // Wait 500ms for trigger auth.users -> public.account_users
    await new Promise((r) => setTimeout(r, 600))

    // 2. Fetch the created account_users record
    const { data: accountData, error: accountError } = await admin
      .from('account_users')
      .select('id, role, status')
      .eq('auth_user_id', testAuthUserId)
      .single()

    if (accountError || !accountData) {
      throw new Error(`Failed to fetch account_user: ${accountError?.message}`)
    }

    testAccountUserId = accountData.id

    // 3. Mark terms accepted and KYC verified
    await admin
      .from('account_users')
      .update({
        terms_version: '1.0',
        privacy_version: '1.0',
        onboarding_step: 3,
        onboarding_status: 'IN_PROGRESS',
      })
      .eq('id', testAccountUserId)

    await admin.from('identity_verifications').insert({
      account_user_id: testAccountUserId,
      provider: 'didit',
      provider_session_id: `session_prof_${Date.now()}`,
      status: 'VERIFIED',
      identity_verified: true,
      age_verified: true,
      verified_at: new Date().toISOString(),
    })
  })

  afterAll(async () => {
    if (testAuthUserId) {
      await admin.auth.admin.deleteUser(testAuthUserId)
    }
  })

  it('verifies RLS: anon client cannot directly query professional_profiles table', async () => {
    const { data, error } = await anon
      .from('professional_profiles')
      .select('*')
      .eq('account_user_id', testAccountUserId)

    expect(data === null || data.length === 0 || error !== null).toBe(true)
  })

  it('creates an initial DRAFT professional profile linked 1:1 to account_users', async () => {
    const slug = await generateUniqueSlug('Juliana Santos', async () => false)

    const { data: profile, error } = await admin
      .from('professional_profiles')
      .insert({
        account_user_id: testAccountUserId,
        stage_name: 'Juliana Santos',
        slug,
        headline: 'Atendimento exclusivo e discreto em São Paulo',
        bio: 'Olá! Sou a Juliana, modelo fotográfica e acompanhante independente.',
        public_age: 23,
        height_cm: 172,
        weight_kg: 58,
        hair_color: 'BRUNETTE',
        eye_color: 'BROWN',
        body_type: 'SLIM',
        whatsapp_phone: '+5511999998888',
        show_age: true,
        show_height: true,
        show_weight: true,
        show_whatsapp: true,
        status: 'DRAFT',
      })
      .select('*')
      .single()

    expect(error).toBeNull()
    expect(profile).toBeDefined()
    expect(profile.stage_name).toBe('Juliana Santos')
    expect(profile.slug).toBe(slug)
    expect(profile.status).toBe('DRAFT')
    testProfileId = profile.id
  })

  it('enforces 1:1 constraint: duplicate profile for same account_user_id fails', async () => {
    const { error } = await admin.from('professional_profiles').insert({
      account_user_id: testAccountUserId,
      stage_name: 'Outro Nome',
      slug: `outro-slug-${Date.now()}`,
      status: 'DRAFT',
    })

    expect(error).toBeDefined()
    expect(error?.code).toBe('23505') // Postgres unique violation
  })

  it('calculates profile completeness accurately', async () => {
    const profile = await getProfileByAccountUserId(testAccountUserId)
    expect(profile).not.toBeNull()

    const completeness = evaluateProfileCompleteness(profile!)
    expect(completeness.isComplete).toBe(true)
    expect(completeness.missingFields.length).toBe(0)
  })

  it('updates profile to READY_FOR_REVIEW status when completeness is satisfied', async () => {
    const { data: updated, error } = await admin
      .from('professional_profiles')
      .update({
        status: 'READY_FOR_REVIEW',
        completed_at: new Date().toISOString(),
      })
      .eq('id', testProfileId)
      .select('*')
      .single()

    expect(error).toBeNull()
    expect(updated.status).toBe('READY_FOR_REVIEW')
    expect(updated.completed_at).not.toBeNull()
  })

  it('fails check constraint on invalid public_age < 18', async () => {
    const { error } = await admin
      .from('professional_profiles')
      .update({
        public_age: 17,
      })
      .eq('id', testProfileId)

    expect(error).toBeDefined()
    expect(error?.message).toContain('chk_professional_profiles_public_age_range')
  })

  it('fails check constraint on invalid height range', async () => {
    const { error } = await admin
      .from('professional_profiles')
      .update({
        height_cm: 50, // Minimum is 100
      })
      .eq('id', testProfileId)

    expect(error).toBeDefined()
    expect(error?.message).toContain('chk_professional_profiles_height_range')
  })

  it('cascade deletes professional_profiles when auth user is deleted', async () => {
    // Create temporary user to test cascade delete
    const tempEmail = `cascade-test-${Date.now()}@ad-marketplace-synthetic.invalid`
    const { data: tempAuth } = await admin.auth.admin.createUser({
      email: tempEmail,
      password: 'Password@12345678!',
      email_confirm: true,
    })
    const tempUid = tempAuth.user!.id
    await new Promise((r) => setTimeout(r, 600))

    const { data: tempAcct } = await admin
      .from('account_users')
      .select('id')
      .eq('auth_user_id', tempUid)
      .single()

    await admin.from('professional_profiles').insert({
      account_user_id: tempAcct!.id,
      stage_name: 'Cascade Test Profile',
      slug: `cascade-test-${Date.now()}`,
      status: 'DRAFT',
    })

    // Delete auth user
    await admin.auth.admin.deleteUser(tempUid)
    await new Promise((r) => setTimeout(r, 600))

    // Verify profile is deleted
    const { data: deletedProfile } = await admin
      .from('professional_profiles')
      .select('id')
      .eq('account_user_id', tempAcct!.id)
      .maybeSingle()

    expect(deletedProfile).toBeNull()
  })
})
