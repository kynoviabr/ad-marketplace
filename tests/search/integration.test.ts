import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { executeSearch, getFilterOptions } from '@/modules/search/dal'

const SUPABASE_URL = 'https://mwzlunkkyigxzjpnybxj.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13emx1bmtreWlneHpqcG55YnhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzAwNjkyMywiZXhwIjoyMTAyNTgyOTIzfQ.FoVQs8htk7Bns9etpKCpNXfSVXSs0lmjGhTx1h-fQsU'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13emx1bmtreWlneHpqcG55YnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMDY5MjMsImV4cCI6MjEwMjU4MjkyM30.QxpEG72vU2lTVyDW4SYfzLFYOs_VKB7eiaj-XqzL_Gg'

process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL
process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_ROLE_KEY

describe('FASE 04 — Live Supabase DEV Locations & Search Integration Tests', () => {
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
    // 1. Get Moema and Pinheiros from seed data
    const { data: moema } = await admin.from('locations').select('id').eq('slug', 'moema').single()
    const { data: pinheiros } = await admin.from('locations').select('id').eq('slug', 'pinheiros').single()
    if (!moema || !pinheiros) throw new Error('Seed locations missing')
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

    // User A locations: Moema (primary) and Pinheiros
    await admin.from('professional_profile_locations').insert([
      { profile_id: profileAId, location_id: moemaId, is_primary: true },
      { profile_id: profileAId, location_id: pinheirosId, is_primary: false },
    ])

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

    // User B locations: Moema (primary)
    await admin.from('professional_profile_locations').insert([
      { profile_id: profileBId, location_id: moemaId, is_primary: true },
    ])
  })

  afterAll(async () => {
    if (userAId) await admin.auth.admin.deleteUser(userAId)
    if (userBId) await admin.auth.admin.deleteUser(userBId)
  })

  it('seed data includes São Paulo state, city and 25 neighborhoods', async () => {
    const { data: state } = await admin.from('states').select('*').eq('code', 'SP').single()
    expect(state).toBeDefined()
    expect(state?.slug).toBe('sao-paulo')

    const { data: city } = await admin.from('cities').select('*').eq('slug', 'sao-paulo').single()
    expect(city).toBeDefined()

    const { data: locations, count } = await admin
      .from('locations')
      .select('*', { count: 'exact' })
      .eq('city_id', city!.id)

    expect(count).toBeGreaterThanOrEqual(25)
  })

  it('anon client has public read on locations catalog but is blocked from writing', async () => {
    const { data, error } = await anon.from('locations').select('id, name, slug').limit(5)
    expect(error).toBeNull()
    expect(data?.length).toBe(5)

    const { error: insertError } = await anon.from('locations').insert({
      city_id: moemaId,
      name: 'Bairro Fake',
      slug: 'bairro-fake',
      zone: 'Zona Sul',
    })
    expect(insertError).not.toBeNull()
  })

  it('partial unique index strictly blocks second primary location for same profile', async () => {
    const { error } = await admin.from('professional_profile_locations').insert({
      profile_id: profileAId,
      location_id: pinheirosId,
      is_primary: true, // User A already has Moema as primary!
    })

    expect(error).not.toBeNull()
    expect(error?.code).toBe('23505') // unique_violation
  })

  it('unique constraint blocks duplicate location for same profile', async () => {
    const { error } = await admin.from('professional_profile_locations').insert({
      profile_id: profileAId,
      location_id: moemaId, // Already in Moema
      is_primary: false,
    })

    expect(error).not.toBeNull()
    expect(error?.code).toBe('23505')
  })

  it('executes city search returning eligible profiles with primary locations', async () => {
    const response = await executeSearch({
      citySlug: 'sao-paulo',
      includePreview: true,
    })

    expect(response.total).toBeGreaterThanOrEqual(2)
    const names = response.results.map((r) => r.stageName)
    expect(names).toContain('Juliana Moema')
    expect(names).toContain('Camila Jardins')
  })

  it('executes neighborhood search returning only profiles servicing that neighborhood', async () => {
    const responsePinheiros = await executeSearch({
      citySlug: 'sao-paulo',
      locationSlug: 'pinheiros',
      includePreview: true,
    })

    const names = responsePinheiros.results.map((r) => r.stageName)
    expect(names).toContain('Juliana Moema') // Juliana services Pinheiros
    expect(names).not.toContain('Camila Jardins') // Camila only services Moema
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

  it('retrieves filter options for São Paulo grouped by zone', async () => {
    const filterOptions = await getFilterOptions('sao-paulo')
    expect(filterOptions).not.toBeNull()
    expect(filterOptions?.city.slug).toBe('sao-paulo')
    expect(filterOptions?.locationsByZone['Zona Sul']).toBeDefined()
    expect(filterOptions?.locationsByZone['Zona Oeste']).toBeDefined()
  })
})
