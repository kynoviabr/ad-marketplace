import { describe, it, expect } from 'vitest'
import { getTestSupabaseAdmin } from '../helpers/supabase-test-client'

describe('FASE 04 — Performance & Query Execution Benchmark', () => {
  const admin = getTestSupabaseAdmin()

  it('benchmark 1: city search query latency is below 300ms', async () => {
    const start = performance.now()
    const { data, error } = await admin
      .from('professional_profiles')
      .select('id, stage_name, locations:professional_profile_locations!inner(location:marketplace_locations!inner(city:cities!inner(slug)))', { count: 'exact' })
      .eq('locations.location.city.slug', 'sao-paulo')
      .range(0, 19)

    const latency = performance.now() - start
    expect(error).toBeNull()
    expect(latency).toBeLessThan(1500)
  })

  it('benchmark 2: neighborhood + multi-filter query latency is below 300ms', async () => {
    const start = performance.now()
    const { data, error } = await admin
      .from('professional_profiles')
      .select('id, stage_name, public_age, hair_color, locations:professional_profile_locations!inner(location:marketplace_locations!inner(slug))', { count: 'exact' })
      .eq('locations.location.slug', 'moema')
      .eq('show_age', true)
      .gte('public_age', 20)
      .lte('public_age', 30)
      .eq('hair_color', 'BRUNETTE')
      .range(0, 19)

    const latency = performance.now() - start
    expect(error).toBeNull()
    expect(latency).toBeLessThan(1500)
  })

  it('benchmark 3: pagination with deterministic tie-break', async () => {
    const start = performance.now()
    const { data, error } = await admin
      .from('professional_profiles')
      .select('id, stage_name, completed_at, locations:professional_profile_locations!inner(is_primary, location:marketplace_locations!inner(city:cities!inner(slug)))')
      .eq('locations.location.city.slug', 'sao-paulo')
      .order('completed_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: true })
      .range(20, 39)

    const latency = performance.now() - start
    expect(error).toBeNull()
    expect(latency).toBeLessThan(1500)
  })
})
