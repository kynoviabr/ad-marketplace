/**
 * Tests: Signup Domain — FASE 01
 * Covers: legal versions, role assignment invariants, safe incomplete state,
 * privilege escalation prevention.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '../..')

describe('Signup Domain', () => {
  describe('Legal versions — centralized config', () => {
    it('CURRENT_TERMS_VERSION is defined and non-empty', async () => {
      const { CURRENT_TERMS_VERSION } = await import('@/lib/config/legal-versions')
      expect(typeof CURRENT_TERMS_VERSION).toBe('string')
      expect(CURRENT_TERMS_VERSION.length).toBeGreaterThan(0)
    })

    it('CURRENT_PRIVACY_VERSION is defined and non-empty', async () => {
      const { CURRENT_PRIVACY_VERSION } = await import('@/lib/config/legal-versions')
      expect(typeof CURRENT_PRIVACY_VERSION).toBe('string')
      expect(CURRENT_PRIVACY_VERSION.length).toBeGreaterThan(0)
    })

    it('legal versions are not placeholder strings', async () => {
      const { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } = await import(
        '@/lib/config/legal-versions'
      )
      expect(CURRENT_TERMS_VERSION).not.toBe('TODO')
      expect(CURRENT_TERMS_VERSION).not.toBe('')
      expect(CURRENT_PRIVACY_VERSION).not.toBe('TODO')
      expect(CURRENT_PRIVACY_VERSION).not.toBe('')
    })

    it('actions.ts imports from legal-versions (centralized)', () => {
      const content = readFileSync(join(ROOT, 'modules/auth/actions.ts'), 'utf-8')
      expect(content).toContain('legal-versions')
      expect(content).toContain('CURRENT_TERMS_VERSION')
      expect(content).toContain('CURRENT_PRIVACY_VERSION')
    })
  })

  describe('Privilege escalation prevention', () => {
    it('actions.ts never reads role from formData', () => {
      const content = readFileSync(join(ROOT, 'modules/auth/actions.ts'), 'utf-8')
      expect(content).not.toContain("formData.get('role')")
      expect(content).not.toContain('formData.get("role")')
    })

    it('signUp options.data does not pass role field', () => {
      const content = readFileSync(join(ROOT, 'modules/auth/actions.ts'), 'utf-8')
      expect(content).not.toMatch(/options\s*:\s*\{[\s\S]*?data\s*:\s*\{[\s\S]*?role\s*:/)
      expect(content).not.toContain("formData.get('role')")
    })

    it('trigger hardcodes ADVERTISER (never from metadata) in migration', () => {
      const content = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(content).toContain("'ADVERTISER',   -- HARDCODED: never from user input")
    })

    it('trigger hardcodes ACTIVE (never from metadata) in migration', () => {
      const content = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(content).toContain("'ACTIVE',       -- HARDCODED: never from user input")
    })

    it('signup schema validated data does not include role', async () => {
      const { SignupSchema } = await import('@/modules/auth/schemas')
      const result = SignupSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        acceptedAge: 'on',
        acceptedTerms: 'on',
        role: 'ADMIN', // injection attempt
      })
      if (result.success) {
        // Zod strips extra fields — role must not appear in parsed output
        expect((result.data as Record<string, unknown>).role).toBeUndefined()
      }
    })

    it('migration has privilege escalation warning in checklist', () => {
      const content = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(content).toContain('privilege escalation')
    })
  })

  describe('Initial account state', () => {
    it('migration sets onboarding_status default to NOT_STARTED', () => {
      const content = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(content).toContain("DEFAULT 'NOT_STARTED'")
    })

    it('migration sets onboarding_step default to 0', () => {
      const content = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(content).toContain('DEFAULT 0')
    })

    it('migration sets role default to ADVERTISER', () => {
      const content = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(content).toContain("DEFAULT 'ADVERTISER'")
    })
  })

  describe('Safe incomplete state', () => {
    it('terms_version is nullable in migration (safe incomplete state)', () => {
      const content = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      // terms_version should be nullable TEXT (no NOT NULL constraint)
      expect(content).toContain('terms_version     TEXT,')
    })

    it('trigger inserts NULL for terms/privacy (not from metadata)', () => {
      const content = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(content).toContain('NULL,           -- safe incomplete state: server action writes this')
    })

    it('AccountUser type has nullable terms fields', async () => {
      const { } = await import('@/modules/auth/types')
      const typesContent = readFileSync(join(ROOT, 'modules/auth/types.ts'), 'utf-8')
      expect(typesContent).toContain('terms_version: string | null')
      expect(typesContent).toContain('privacy_version: string | null')
    })

    it('DAL redirects to /complete-signup when terms are null', () => {
      const content = readFileSync(join(ROOT, 'modules/auth/dal.ts'), 'utf-8')
      expect(content).toContain('/complete-signup')
      expect(content).toContain('terms_version')
    })

    it('complete-signup page exists for incomplete state recovery', () => {
      const { existsSync } = require('fs')
      expect(existsSync(join(ROOT, 'app/complete-signup/page.tsx'))).toBe(true)
    })

    it('actions.ts uses admin client to write terms after signUp', () => {
      const content = readFileSync(join(ROOT, 'modules/auth/actions.ts'), 'utf-8')
      expect(content).toContain('createAdminClient()')
      expect(content).toContain('.from(\'account_users\')')
      expect(content).toContain('terms_version: CURRENT_TERMS_VERSION')
    })
  })
})
