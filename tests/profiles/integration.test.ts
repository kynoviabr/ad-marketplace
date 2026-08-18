import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mwzlunkkyigxzjpnybxj.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13emx1bmtreWlneHpqcG55YnhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzAwNjkyMywiZXhwIjoyMTAyNTgyOTIzfQ.FoVQs8htk7Bns9etpKCpNXfSVXSs0lmjGhTx1h-fQsU'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13emx1bmtreWlneHpqcG55YnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMDY5MjMsImV4cCI6MjEwMjU4MjkyM30.QxpEG72vU2lTVyDW4SYfzLFYOs_VKB7eiaj-XqzL_Gg'

describe('FASE 03 — Live Supabase DEV Profile Domain Integration Tests', () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let authUserId: string
  let accountId: string
  const testSlug = `juliana-test-${Date.now()}`

  beforeAll(async () => {
    // 1. Create synthetic user
    const testEmail = `fase03-live-${Date.now()}@ad-marketplace-synthetic.invalid`
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: testEmail,
      password: 'Password@12345678!',
      email_confirm: true,
    })

    if (authErr || !authUser.user) {
      throw new Error(`Failed to create test user: ${authErr?.message}`)
    }
    authUserId = authUser.user.id

    // 2. Wait for account_users row
    await new Promise((r) => setTimeout(r, 600))
    const { data: accountRow } = await admin
      .from('account_users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single()

    if (!accountRow) throw new Error('account_users row missing')
    accountId = accountRow.id

    // 3. Mark KYC verified
    await admin
      .from('account_users')
      .update({
        terms_version: '1.0',
        terms_accepted_at: new Date().toISOString(),
        privacy_version: '1.0',
        privacy_accepted_at: new Date().toISOString(),
        onboarding_step: 3,
        onboarding_status: 'IN_PROGRESS',
      })
      .eq('id', accountId)

    await admin.from('identity_verifications').insert({
      account_user_id: accountId,
      provider: 'didit',
      provider_session_id: `sess_fase03_${Date.now()}`,
      status: 'VERIFIED',
      identity_verified: true,
      age_verified: true,
      verified_at: new Date().toISOString(),
    })
  })

  afterAll(async () => {
    if (authUserId) {
      await admin.auth.admin.deleteUser(authUserId)
    }
  })

  it('admin client can query professional_profiles table', async () => {
    const { error } = await admin.from('professional_profiles').select('id').limit(1)
    expect(error).toBeNull()
  })

  it('anon client is strictly blocked from direct INSERT into professional_profiles', async () => {
    const { error } = await anon.from('professional_profiles').insert({
      account_user_id: accountId,
      stage_name: 'Hacker',
      slug: 'hacker-slug',
    })
    expect(error).not.toBeNull()
  })

  it('creates an initial DRAFT professional profile with valid slug', async () => {
    const { data, error } = await admin
      .from('professional_profiles')
      .insert({
        account_user_id: accountId,
        stage_name: 'Juliana Castro',
        slug: testSlug,
        status: 'DRAFT',
      })
      .select('*')
      .single()

    expect(error).toBeNull()
    expect(data.stage_name).toBe('Juliana Castro')
    expect(data.slug).toBe(testSlug)
    expect(data.status).toBe('DRAFT')
    expect(data.languages).toEqual(['Português'])
    expect(data.show_height).toBe(true)
    expect(data.show_whatsapp).toBe(true)
    expect(data.show_age).toBe(false)
  })

  it('enforces 1:1 constraint (cannot create second profile for same account_user_id)', async () => {
    const { error } = await admin.from('professional_profiles').insert({
      account_user_id: accountId,
      stage_name: 'Camila',
      slug: `camila-${Date.now()}`,
    })

    expect(error).not.toBeNull()
    expect(error?.code).toBe('23505') // unique_violation
  })

  it('enforces unique constraint on slug', async () => {
    // Attempt duplicate slug with different fake account ID
    const { error } = await admin.from('professional_profiles').insert({
      account_user_id: '00000000-0000-0000-0000-000000000000',
      stage_name: 'Outra Juliana',
      slug: testSlug,
    })

    expect(error).not.toBeNull()
    expect(error?.code).toBe('23505')
  })

  it('enforces CHECK constraint on public_age >= 18', async () => {
    const { error } = await admin
      .from('professional_profiles')
      .update({
        public_age: 17, // Invalid!
      })
      .eq('account_user_id', accountId)

    expect(error).not.toBeNull()
    expect(error?.code).toBe('23514') // check_violation
  })

  it('updates profile to READY_FOR_REVIEW with full measurements and contact', async () => {
    const now = new Date().toISOString()
    const { data: updated, error } = await admin
      .from('professional_profiles')
      .update({
        headline: 'Modelo Fotográfica e Atendimento Exclusivo',
        bio: 'Atendimento de alto nível com discrição em São Paulo.',
        public_age: 24,
        height_cm: 172,
        weight_kg: 59,
        bust_cm: 92,
        waist_cm: 63,
        hips_cm: 95,
        eye_color: 'BROWN',
        hair_color: 'BRUNETTE',
        hair_length: 'LONG',
        body_type: 'SLIM',
        whatsapp_phone: '+5511999998888',
        show_age: true,
        show_measurements: true,
        status: 'READY_FOR_REVIEW',
        completed_at: now,
        updated_at: now,
      })
      .eq('account_user_id', accountId)
      .select('*')
      .single()

    expect(error).toBeNull()
    expect(updated.status).toBe('READY_FOR_REVIEW')
    expect(updated.height_cm).toBe(172)
    expect(updated.eye_color).toBe('BROWN')
    expect(updated.whatsapp_phone).toBe('+5511999998888')

    // Advance onboarding step
    await admin.from('account_users').update({ onboarding_step: 5 }).eq('id', accountId)

    const { data: acct } = await admin
      .from('account_users')
      .select('onboarding_step')
      .eq('id', accountId)
      .single()

    expect(acct?.onboarding_step).toBe(5)
  })

  it('cascade deletes professional_profiles when auth user is deleted', async () => {
    await admin.auth.admin.deleteUser(authUserId)
    authUserId = '' // Prevent double delete in afterAll

    await new Promise((r) => setTimeout(r, 600))

    const { data } = await admin
      .from('professional_profiles')
      .select('id')
      .eq('account_user_id', accountId)

    expect(!data || data.length === 0).toBe(true)
  })
})
