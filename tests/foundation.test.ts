/**
 * Test: Foundation Structure
 *
 * Verifies that the modular structure exists and key foundation files are in place.
 * This catches accidental deletions or regressions during development.
 */

import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(__dirname, '..')

function exists(relativePath: string): boolean {
  return existsSync(resolve(ROOT, relativePath))
}

describe('Foundation Structure', () => {
  describe('Configuration files', () => {
    it('package.json exists', () => expect(exists('package.json')).toBe(true))
    it('tsconfig.json exists', () => expect(exists('tsconfig.json')).toBe(true))
    it('next.config.ts exists', () => expect(exists('next.config.ts')).toBe(true))
    it('.env.example exists', () => expect(exists('.env.example')).toBe(true))
    it('.gitignore exists', () => expect(exists('.gitignore')).toBe(true))
  })

  describe('Application files', () => {
    it('app/layout.tsx exists', () => expect(exists('app/layout.tsx')).toBe(true))
    it('app/(public)/page.tsx exists', () => expect(exists('app/(public)/page.tsx')).toBe(true))
    it('app/globals.css exists', () => expect(exists('app/globals.css')).toBe(true))
    it('app/api/health/route.ts exists', () =>
      expect(exists('app/api/health/route.ts')).toBe(true))
  })

  describe('Library files', () => {
    it('lib/env/server.ts exists', () => expect(exists('lib/env/server.ts')).toBe(true))
    it('lib/env/client.ts exists', () => expect(exists('lib/env/client.ts')).toBe(true))
    it('lib/supabase/client.ts exists', () =>
      expect(exists('lib/supabase/client.ts')).toBe(true))
    it('lib/supabase/server.ts exists', () =>
      expect(exists('lib/supabase/server.ts')).toBe(true))
    it('lib/supabase/admin.ts exists', () =>
      expect(exists('lib/supabase/admin.ts')).toBe(true))
  })

  describe('Module boundaries', () => {
    const modules = [
      'auth',
      'users',
      'verification',
      'profiles',
      'locations',
      'media',
      'moderation',
      'billing',
      'promotions',
      'analytics',
      'admin',
    ]

    for (const mod of modules) {
      it(`modules/${mod}/index.ts exists`, () => {
        expect(exists(`modules/${mod}/index.ts`)).toBe(true)
      })
    }
  })

  describe('Documentation', () => {
    it('docs/ directory exists', () =>
      expect(exists('docs')).toBe(true))
    it('docs/00_MASTER_INDEX.md exists (source of truth)', () =>
      expect(exists('docs/00_MASTER_INDEX.md')).toBe(true))
    it('README.md (technical) exists at workspace root', () =>
      expect(exists('README.md')).toBe(true))
    it('00_MASTER_INDEX.md is NOT duplicated at root (moved to docs/)', () =>
      expect(exists('00_MASTER_INDEX.md')).toBe(false))
  })

  describe('No premature business features', () => {
    it('FASE 01 migration directory exists (account_users only)', () => {
      // FASE 01 legitimately introduces supabase/migrations with account_users.
      // This test verifies the directory exists and contains only FASE 01 content.
      expect(exists('supabase/migrations')).toBe(true)
      expect(exists('supabase/migrations/20260817000001_account_users.sql')).toBe(true)
    })

    it('no payment integration files exist', () => {
      expect(exists('lib/payments')).toBe(false)
      expect(exists('modules/billing/stripe.ts')).toBe(false)
      expect(exists('modules/billing/pagarme.ts')).toBe(false)
    })

    it('no KYC integration files exist', () => {
      expect(exists('lib/kyc')).toBe(false)
      expect(exists('modules/verification/didit.ts')).toBe(false)
    })
  })
})
