import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '../..')

describe('FASE 05 — Media Management Database Migration Tests', () => {
  const migrationPath = join(ROOT, 'supabase/migrations/20260818000005_profile_media.sql')

  it('migration file exists and is readable', () => {
    expect(existsSync(migrationPath)).toBe(true)
  })

  const sql = readFileSync(migrationPath, 'utf8')

  it('creates media_status enum with all required states', () => {
    expect(sql).toContain('media_status')
    expect(sql).toContain('UPLOADING')
    expect(sql).toContain('PROCESSING')
    expect(sql).toContain('PENDING_MODERATION')
    expect(sql).toContain('APPROVED')
    expect(sql).toContain('PROCESSING_FAILED')
    expect(sql).toContain('REJECTED')
    expect(sql).toContain('QUARANTINED')
    expect(sql).toContain('DELETED')
  })

  it('creates profile_media table with appropriate constraints', () => {
    expect(sql).toContain('profile_media')
    expect(sql).toContain('CONSTRAINT chk_profile_media_mime_type')
    expect(sql).toContain('CONSTRAINT chk_profile_media_size')
    expect(sql).toContain('CONSTRAINT chk_profile_media_position')
  })

  it('creates partial unique index for single primary photo per profile', () => {
    expect(sql).toContain('uq_idx_single_primary_photo_per_profile')
    expect(sql).toContain('WHERE is_primary = TRUE AND deleted_at IS NULL;')
  })

  it('creates hardened RPCs with SECURITY DEFINER and search_path set', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.reorder_profile_media')
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.set_primary_profile_media')
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toContain('SET search_path = public, pg_temp')
  })

  it('enforces RLS and grants with no direct client insert/update/delete', () => {
    expect(sql).toContain('ALTER TABLE public.profile_media ENABLE ROW LEVEL SECURITY;')
    expect(sql).toContain('REVOKE ALL ON public.profile_media FROM anon;')
    expect(sql).toContain('REVOKE INSERT, UPDATE, DELETE ON public.profile_media FROM authenticated;')
    expect(sql).toContain('GRANT SELECT ON public.profile_media TO authenticated;')
    expect(sql).toContain('GRANT ALL ON public.profile_media TO service_role;')
  })
})
