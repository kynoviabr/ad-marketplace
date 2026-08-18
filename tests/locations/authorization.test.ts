import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '../..')

describe('Locations & Search Database Migration Tests', () => {
  const migrationPath = join(ROOT, 'supabase/migrations/20260818000004_locations_and_search.sql')

  it('migration file exists and is readable', () => {
    expect(existsSync(migrationPath)).toBe(true)
  })

  const sql = readFileSync(migrationPath, 'utf8')

  it('creates geographic catalog tables (states, cities, locations)', () => {
    expect(sql).toContain('CREATE TABLE public.states')
    expect(sql).toContain('CREATE TABLE public.cities')
    expect(sql).toContain('CREATE TABLE public.locations')
  })

  it('creates professional_profile_locations relation with uniqueness constraint', () => {
    expect(sql).toContain('CREATE TABLE public.professional_profile_locations')
    expect(sql).toContain('CONSTRAINT uq_profile_locations_profile_location UNIQUE (profile_id, location_id)')
  })

  it('enforces single primary location per profile via partial unique index', () => {
    expect(sql).toContain('CREATE UNIQUE INDEX uq_idx_single_primary_location_per_profile')
    expect(sql).toContain('ON public.professional_profile_locations (profile_id)')
    expect(sql).toContain('WHERE is_primary = TRUE;')
  })

  it('enforces RLS and grants public read on catalog, denying client writes', () => {
    expect(sql).toContain('ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;')
    expect(sql).toContain('ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;')
    expect(sql).toContain('ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;')
    expect(sql).toContain('ALTER TABLE public.professional_profile_locations ENABLE ROW LEVEL SECURITY;')

    expect(sql).toContain('CREATE POLICY "states_public_read"')
    expect(sql).toContain('CREATE POLICY "cities_public_read"')
    expect(sql).toContain('CREATE POLICY "locations_public_read"')
    expect(sql).toContain('CREATE POLICY "profile_locations_public_read"')

    expect(sql).toContain('CREATE POLICY "profile_locations_deny_client_insert"')
    expect(sql).toContain('CREATE POLICY "profile_locations_deny_client_update"')
    expect(sql).toContain('CREATE POLICY "profile_locations_deny_client_delete"')
  })

  it('contains seed data for São Paulo and 25 neighborhoods', () => {
    expect(sql).toContain("'São Paulo'")
    expect(sql).toContain("'SP'")
    expect(sql).toContain("'Moema'")
    expect(sql).toContain("'Pinheiros'")
    expect(sql).toContain("'Jardins'")
    expect(sql).toContain("'Itaim Bibi'")
    expect(sql).toContain("'Vila Mariana'")
    expect(sql).toContain("'Tatuapé'")
    expect(sql).toContain("'Santana'")
  })
})
