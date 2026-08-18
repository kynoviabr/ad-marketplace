import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '../..')

describe('Profile Database & Authorization Migration Tests', () => {
  const migrationPath = join(ROOT, 'supabase/migrations/20260818000003_professional_profiles.sql')

  it('migration file exists and is readable', () => {
    expect(existsSync(migrationPath)).toBe(true)
  })

  const sql = readFileSync(migrationPath, 'utf8')

  it('defines profile_status and physical characteristic enums', () => {
    expect(sql).toContain('CREATE TYPE public.profile_status AS ENUM')
    expect(sql).toContain("'DRAFT'")
    expect(sql).toContain("'READY_FOR_REVIEW'")
    expect(sql).toContain("'ACTIVE'")
    expect(sql).toContain("'PAUSED'")
    expect(sql).toContain("'SUSPENDED'")

    expect(sql).toContain('CREATE TYPE public.eye_color AS ENUM')
    expect(sql).toContain('CREATE TYPE public.hair_color AS ENUM')
    expect(sql).toContain('CREATE TYPE public.hair_length AS ENUM')
    expect(sql).toContain('CREATE TYPE public.body_type AS ENUM')
  })

  it('enforces 1:1 relationship with account_users via UNIQUE constraint', () => {
    expect(sql).toContain('CONSTRAINT uq_professional_profiles_account_user')
    expect(sql).toContain('UNIQUE (account_user_id)')
    expect(sql).toContain('REFERENCES public.account_users(id) ON DELETE CASCADE')
  })

  it('enforces unique slug constraint', () => {
    expect(sql).toContain('CONSTRAINT uq_professional_profiles_slug')
    expect(sql).toContain('UNIQUE (slug)')
  })

  it('enforces CHECK constraints on ranges and bounds', () => {
    expect(sql).toContain('CONSTRAINT chk_professional_profiles_public_age_range')
    expect(sql).toContain('CHECK (public_age IS NULL OR (public_age >= 18 AND public_age <= 99))')

    expect(sql).toContain('CONSTRAINT chk_professional_profiles_stage_name_length')
    expect(sql).toContain('CHECK (length(trim(stage_name)) >= 2 AND length(stage_name) <= 60)')

    expect(sql).toContain('CONSTRAINT chk_professional_profiles_height_range')
    expect(sql).toContain('CONSTRAINT chk_professional_profiles_weight_range')
  })

  it('enforces RLS and revokes direct client modification', () => {
    expect(sql).toContain('ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;')
    expect(sql).toContain('REVOKE ALL ON public.professional_profiles FROM anon;')
    expect(sql).toContain('REVOKE INSERT, UPDATE, DELETE ON public.professional_profiles FROM authenticated;')
    expect(sql).toContain('GRANT SELECT ON public.professional_profiles TO authenticated;')
    expect(sql).toContain('GRANT ALL ON public.professional_profiles TO service_role;')

    expect(sql).toContain('CREATE POLICY "professional_profiles_select_own"')
    expect(sql).toContain('CREATE POLICY "professional_profiles_deny_client_insert"')
    expect(sql).toContain('CREATE POLICY "professional_profiles_deny_client_update"')
    expect(sql).toContain('CREATE POLICY "professional_profiles_deny_client_delete"')
  })

  it('attaches set_updated_at trigger', () => {
    expect(sql).toContain('CREATE TRIGGER trg_professional_profiles_updated_at')
    expect(sql).toContain('EXECUTE FUNCTION public.set_updated_at()')
  })
})
