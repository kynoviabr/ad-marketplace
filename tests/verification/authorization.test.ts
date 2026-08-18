import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '../..')

describe('Verification Database & Authorization Migration Tests', () => {
  const migrationPath = join(ROOT, 'supabase/migrations/20260818000002_identity_verifications.sql')

  it('migration file exists and is readable', () => {
    expect(existsSync(migrationPath)).toBe(true)
  })

  const sql = readFileSync(migrationPath, 'utf8')

  it('defines verification_status enum with exactly 7 domain states', () => {
    expect(sql).toContain("CREATE TYPE public.verification_status AS ENUM (")
    expect(sql).toContain("'NOT_STARTED'")
    expect(sql).toContain("'PENDING'")
    expect(sql).toContain("'IN_PROGRESS'")
    expect(sql).toContain("'IN_REVIEW'")
    expect(sql).toContain("'VERIFIED'")
    expect(sql).toContain("'REJECTED'")
    expect(sql).toContain("'EXPIRED'")
  })

  it('defines webhook_processing_status enum for the event ledger', () => {
    expect(sql).toContain("CREATE TYPE public.webhook_processing_status AS ENUM (")
    expect(sql).toContain("'RECEIVED'")
    expect(sql).toContain("'PROCESSED'")
    expect(sql).toContain("'IGNORED'")
    expect(sql).toContain("'FAILED'")
  })

  it('enforces single active verification per user via partial unique index', () => {
    expect(sql).toContain('CREATE UNIQUE INDEX uq_idx_single_active_verification_per_user')
    expect(sql).toContain("WHERE status IN ('NOT_STARTED', 'PENDING', 'IN_PROGRESS', 'IN_REVIEW')")
  })

  it('enforces webhook idempotency via unique constraint on provider and event id', () => {
    expect(sql).toContain('CONSTRAINT uq_webhook_events_provider_event')
    expect(sql).toContain('UNIQUE (provider, provider_event_id)')
  })

  it('enforces check constraint: age_verified requires identity_verified', () => {
    expect(sql).toContain('CONSTRAINT chk_identity_verifications_age_requires_identity')
    expect(sql).toContain('CHECK (age_verified = FALSE OR identity_verified = TRUE)')
  })

  it('enforces NO DIRECT CLIENT ACCESS via REVOKE and Deny-All RLS policies', () => {
    expect(sql).toContain('ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;')
    expect(sql).toContain('ALTER TABLE public.verification_webhook_events ENABLE ROW LEVEL SECURITY;')

    expect(sql).toContain('REVOKE ALL ON public.identity_verifications FROM anon, authenticated;')
    expect(sql).toContain('REVOKE ALL ON public.verification_webhook_events FROM anon, authenticated;')

    expect(sql).toContain('GRANT ALL ON public.identity_verifications TO service_role;')
    expect(sql).toContain('GRANT ALL ON public.verification_webhook_events TO service_role;')

    expect(sql).toContain('CREATE POLICY "identity_verifications_deny_all_public"')
    expect(sql).toContain('CREATE POLICY "webhook_events_deny_all_public"')
  })

  it('attaches set_updated_at trigger to identity_verifications', () => {
    expect(sql).toContain('CREATE TRIGGER trg_identity_verifications_updated_at')
    expect(sql).toContain('EXECUTE FUNCTION public.set_updated_at()')
  })
})
