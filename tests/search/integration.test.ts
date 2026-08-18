import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { executeSearch, getFilterOptions } from '@/modules/search/dal'
import { isProfileStructurallySearchReady, isPublicSearchEligible } from '@/modules/search/eligibility'

const SUPABASE_URL = 'https://mwzlunkkyigxzjpnybxj.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13emx1bmtreWlneHpqcG55YnhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzAwNjkyMywiZXhwIjoyMTAyNTgyOTIzfQ.FoVQs8htk7Bns9etpKCpNXfSVXSs0lmjGhTx1h-fQsU'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13emx1bmtreWlneHpqcG55YnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMDY5MjMsImV4cCI6MjEwMjU4MjkyM30.QxpEG72vU2lTVyDW4SYfzLFYOs_VKB7eiaj-XqzL_Gg'

process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL
process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_ROLE_KEY

describe('FASE 04 — Live Supabase DEV Locations & Search Integration Tests (Revised)', () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let userAId: string
  let userBId: string
  let profileAId: string
  let profileBId: string
  let moemaId: string
  let pinheirosId: string

  beforeAll(async () => {
    // 1. Get Moema and Pinheiros from seed data in marketplace_locations
    const { data: moema } = await admin.from('marketplace_locations').select('id').eq('slug', 'moema').single()
    const { data: pinheiros } = await admin.from('marketplace_locations').select('id').eq('slug', 'pinheiros').single()
    if (!moema || !pinheiros) throw new Error('Seed marketplace_locations missing')
    moemaId = moema.id
    pinheirosId = pinheiros.id

    // 2. Create User A (Visible weight = 58kg)
    const emailA = `fase04-user-a-${Date.now()}@ad-marketplace-synthetic.invalid`
    const { data: authA } = await admin.auth.admin.createUser({
      email: emailA,
      password: 'Password@12345678!',
      email_confirm: true,
    })
    userAId = authA.user!.id
    await new Promise((r) => setTimeout(r, 600))

    const { data: acctA } = await admin.from('account_users').select('id').eq('auth_user_id', userAId).single()
    await admin.from('account_users').update({ terms_version: '1.0', privacy_version: '1.0', onboarding_step: 5, onboarding_status: 'IN_PROGRESS' }).eq('id', acctA!.id)
    await admin.from('identity_verifications').insert({
      account_user_id: acctA!.id,
      provider: 'didit',
      provider_session_id: `sess_a_${Date.now()}`,
      status: 'VERIFIED',
      identity_verified: true,
      age_verified: true,
      verified_at: new Date().toISOString(),
    })

    const { data: profA } = await admin
      .from('professional_profiles')
      .insert({
        account_user_id: acctA!.id,
        stage_name: 'Juliana Moema',
        slug: `juliana-moema-${Date.now()}`,
        headline: 'Modelo Fotográfica e Atendimento em Moema',
        bio: 'Atendimento exclusivo de alto nível em Moema e Pinheiros.',
        public_age: 23,
        height_cm: 170,
        weight_kg: 58,
        hair_color: 'BRUNETTE',
        eye_color: 'BROWN',
        body_type: 'SLIM',
        show_age: true,
        show_height: true,
        show_weight: true, // Visible weight!
        show_whatsapp: true,
        whatsapp_phone: '+5511999998888',
        status: 'READY_FOR_REVIEW',
      })
      .select('id')
      .single()
    profileAId = profA!.id

    // Use atomic RPC save_profile_service_areas
    await admin.rpc('save_profile_service_areas', {
      p_profile_id: profileAId,
      p_location_ids: [moemaId, pinheirosId],
      p_primary_location_id: moemaId,
    })

    // 3. Create User B (Hidden weight = 60kg, show_weight = false)
    const emailB = `fase04-user-b-${Date.now()}@ad-marketplace-synthetic.invalid`
    const { data: authB } = await admin.auth.admin.createUser({
      email: emailB,
      password: 'Password@12345678!',
      email_confirm: true,
    })
    userBId = authB.user!.id
    await new Promise((r) => setTimeout(r, 600))

    const { data: acctB } = await admin.from('account_users').select('id').eq('auth_user_id', userBId).single()
    await admin.from('account_users').update({ terms_version: '1.0', privacy_version: '1.0', onboarding_step: 5, onboarding_status: 'IN_PROGRESS' }).eq('id', acctB!.id)
    await admin.from('identity_verifications').insert({
      account_user_id: acctB!.id,
      provider: 'didit',
      provider_session_id: `sess_b_${Date.now()}`,
      status: 'VERIFIED',
      identity_verified: true,
      age_verified: true,
      verified_at: new Date().toISOString(),
    })

    const { data: profB } = await admin
      .from('professional_profiles')
      .insert({
        account_user_id: acctB!.id,
        stage_name: 'Camila Jardins',
        slug: `camila-jardins-${Date.now()}`,
        headline: 'Atendimento VIP em Moema',
        bio: 'Atendimento com pontualidade e discrição total em São Paulo.',
        public_age: 25,
        height_cm: 168,
        weight_kg: 60,
        hair_color: 'BLONDE',
        eye_color: 'GREEN',
        body_type: 'CURVY',
        show_age: true,
        show_height: true,
        show_weight: false, // HIDDEN weight!
        show_whatsapp: true,
        whatsapp_phone: '+5511988887777',
        status: 'READY_FOR_REVIEW',
      })
      .select('id')
      .single()
    profileBId = profB!.id

    // Use atomic RPC save_profile_service_areas
    await admin.rpc('save_profile_service_areas', {
      p_profile_id: profileBId,
      p_location_ids: [moemaId],
      p_primary_location_id: moemaId,
    })
  })

  afterAll(async () => {
    if (userAId) await admin.auth.admin.deleteUser(userAId)
    if (userBId) await admin.auth.admin.deleteUser(userBId)
  })

  it('seed data includes Brasil, SP state, São Paulo city and 25 service areas', async () => {
    const { data: country } = await admin.from('countries').select('*').eq('code', 'BR').single()
    expect(country).toBeDefined()
    expect(country?.slug).toBe('brasil')

    const { data: state } = await admin.from('states').select('*').eq('code', 'SP').single()
    expect(state).toBeDefined()

    const { data: city } = await admin.from('cities').select('*').eq('slug', 'sao-paulo').single()
    expect(city).toBeDefined()

    const { count } = await admin
      .from('marketplace_locations')
      .select('*', { count: 'exact' })
      .eq('city_id', city!.id)

    expect(count).toBe(25)
  })

  it('anon client cannot directly query professional_profile_locations join table', async () => {
    const { data, error } = await anon.from('professional_profile_locations').select('*').limit(5)
    expect(error || !data || data.length === 0).toBeTruthy()
  })

  it('concurrency test: concurrent saves maintain single primary and no duplicates', async () => {
    // Fire 2 concurrent saves for User A
    const save1 = admin.rpc('save_profile_service_areas', {
      p_profile_id: profileAId,
      p_location_ids: [moemaId, pinheirosId],
      p_primary_location_id: moemaId,
    })

    const save2 = admin.rpc('save_profile_service_areas', {
      p_profile_id: profileAId,
      p_location_ids: [moemaId, pinheirosId],
      p_primary_location_id: pinheirosId,
    })

    await Promise.allSettled([save1, save2])

    // Query final state
    const { data: finalLocations } = await admin
      .from('professional_profile_locations')
      .select('*')
      .eq('profile_id', profileAId)

    expect(finalLocations?.length).toBe(2)
    const primaries = finalLocations?.filter((l) => l.is_primary)
    expect(primaries?.length).toBe(1) // Exactly one primary
  })

  it('executes city search returning eligible profiles', async () => {
    const response = await executeSearch({
      citySlug: 'sao-paulo',
      includePreview: true,
    })

    expect(response.total).toBeGreaterThanOrEqual(2)
    const names = response.results.map((r) => r.stageName)
    expect(names).toContain('Juliana Moema')
    expect(names).toContain('Camila Jardins')
  })

  it('visibility-aware filter: hidden attributes are NEVER matched or inferable', async () => {
    // Search with weight filter (55 to 65 kg)
    const response = await executeSearch({
      citySlug: 'sao-paulo',
      minWeight: 55,
      maxWeight: 65,
      includePreview: true,
    })

    const names = response.results.map((r) => r.stageName)
    // Juliana has weight 58kg and show_weight = true -> MUST MATCH
    expect(names).toContain('Juliana Moema')

    // Camila has weight 60kg in DB but show_weight = false -> MUST NOT MATCH (Invariant preserved!)
    expect(names).not.toContain('Camila Jardins')
  })

  it('general search without filter returns hidden attribute profile with null in DTO', async () => {
    const response = await executeSearch({
      citySlug: 'sao-paulo',
      includePreview: true,
    })

    const camila = response.results.find((r) => r.stageName === 'Camila Jardins')
    expect(camila).toBeDefined()
    expect(camila?.attributes.weightKg).toBeNull() // Sanitized to null in DTO!
  })

  it('search eligibility: distinguishes structural readiness from production eligibility', () => {
    const mockProfile = { status: 'READY_FOR_REVIEW' as const }
    const mockAccount = { status: 'ACTIVE' as const }
    const mockVerification = { status: 'VERIFIED' as const, identity_verified: true, age_verified: true }

    // Structurally ready (internal/dev)
    expect(isProfileStructurallySearchReady(mockProfile, mockAccount, mockVerification, 2)).toBe(true)

    // Not publicly eligible yet (fails because media/moderation are not approved and status is not ACTIVE)
    expect(isPublicSearchEligible(mockProfile, mockAccount, mockVerification, false, false)).toBe(false)
  })
})
