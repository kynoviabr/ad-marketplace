import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '../..')

describe('Locations & Search Database Migration Tests (Revised)', () => {
  const migrationPath = join(ROOT, 'supabase/migrations/20260818000004_locations_and_search.sql')

  it('migration file exists and is readable', () => {
    expect(existsSync(migrationPath)).toBe(true)
  })

  const sql = readFileSync(migrationPath, 'utf8')

  it('creates full 4-tier geographic catalog tables (countries, states, cities, marketplace_locations)', () => {
    expect(sql).toContain('countries')
    expect(sql).toContain('states')
    expect(sql).toContain('cities')
    expect(sql).toContain('marketplace_locations')
  })

  it('enforces contextual uniqueness constraints', () => {
    expect(sql).toContain('CONSTRAINT uq_states_country_code UNIQUE (country_id, code)')
    expect(sql).toContain('CONSTRAINT uq_states_country_slug UNIQUE (country_id, slug)')
    expect(sql).toContain('CONSTRAINT uq_cities_state_slug UNIQUE (state_id, slug)')
    expect(sql).toContain('CONSTRAINT uq_marketplace_locations_city_slug UNIQUE (city_id, slug)')
  })

  it('enforces zone and location_type check constraints', () => {
    expect(sql).toContain("CONSTRAINT chk_marketplace_locations_zone CHECK (zone IN ('Zona Sul', 'Zona Oeste', 'Centro', 'Zona Leste', 'Zona Norte'))")
    expect(sql).toContain("CONSTRAINT chk_marketplace_locations_type CHECK (location_type IN ('NEIGHBORHOOD', 'COMMERCIAL_DISTRICT', 'METRO_REGION'))")
  })

  it('creates professional_profile_locations relation with partial unique index for single primary', () => {
    expect(sql).toContain('professional_profile_locations')
    expect(sql).toContain('CONSTRAINT uq_profile_locations_profile_location UNIQUE (profile_id, location_id)')
    expect(sql).toContain('uq_idx_single_primary_location_per_profile')
    expect(sql).toContain('ON public.professional_profile_locations (profile_id)')
    expect(sql).toContain('WHERE is_primary = TRUE;')
  })

  it('creates atomic transactional RPC save_profile_service_areas', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.save_profile_service_areas')
    expect(sql).toContain('SECURITY DEFINER')
  })

  it('enforces RLS and grants matrix with no direct anon access to join table', () => {
    expect(sql).toContain('ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;')
    expect(sql).toContain('ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;')
    expect(sql).toContain('ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;')
    expect(sql).toContain('ALTER TABLE public.marketplace_locations ENABLE ROW LEVEL SECURITY;')
    expect(sql).toContain('ALTER TABLE public.professional_profile_locations ENABLE ROW LEVEL SECURITY;')

    expect(sql).toContain('REVOKE ALL ON public.professional_profile_locations FROM anon, authenticated;')
    expect(sql).toContain('GRANT ALL ON public.professional_profile_locations TO service_role;')
  })

  it('contains seed data for Brasil, SP, São Paulo, and 25 service areas', () => {
    expect(sql).toContain("'Brasil'")
    expect(sql).toContain("'São Paulo'")
    expect(sql).toContain("'SP'")
    expect(sql).toContain("'Moema'")
    expect(sql).toContain("'Pinheiros'")
    expect(sql).toContain("'Jardins'")
    expect(sql).toContain("'Itaim Bibi'")
    expect(sql).toContain("'Vila Mariana'")
    expect(sql).toContain("'Tatuapé'")
    expect(sql).toContain("'Anália Franco'")
    expect(sql).toContain("'Santana'")
  })
})
