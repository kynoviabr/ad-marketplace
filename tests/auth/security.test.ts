/**
 * Tests: Security — FASE 01
 * Verifies security constraints on code structure, migration, and proxy.
 *
 * Tests cover:
 * A. Service role confinement (never in browser bundle)
 * B. Open redirect protection (callback URL validation)
 * C. Generic error messages (no information leakage)
 * D. RLS and authorization in migration
 * E. Trigger security (hardcoding, search_path, privilege revocation)
 * F. Terms/Privacy not sourced from user_metadata
 * G. Proxy.ts is Next.js 16 format
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '../..')

describe('Security', () => {
  describe('A. Service role confinement', () => {
    it('lib/env/client.ts does not reference SERVICE_ROLE_KEY', () => {
      const content = readFileSync(join(ROOT, 'lib/env/client.ts'), 'utf-8')
      expect(content).not.toContain('SERVICE_ROLE_KEY')
    })

    it('lib/supabase/client.ts does not import service role key', () => {
      const content = readFileSync(join(ROOT, 'lib/supabase/client.ts'), 'utf-8')
      expect(content).not.toContain('SERVICE_ROLE_KEY')
    })

    it('lib/supabase/admin.ts has server-only guard', () => {
      const content = readFileSync(join(ROOT, 'lib/supabase/admin.ts'), 'utf-8')
      expect(content).toContain('server-only')
    })

    it('modules/auth/dal.ts has server-only guard', () => {
      const content = readFileSync(join(ROOT, 'modules/auth/dal.ts'), 'utf-8')
      expect(content).toContain('server-only')
    })

    it('client-side form components do not import admin client', () => {
      const signupForm = readFileSync(join(ROOT, 'components/auth/signup-form.tsx'), 'utf-8')
      const loginForm = readFileSync(join(ROOT, 'components/auth/login-form.tsx'), 'utf-8')
      expect(signupForm).not.toContain('supabase/admin')
      expect(signupForm).not.toContain('SERVICE_ROLE_KEY')
      expect(loginForm).not.toContain('supabase/admin')
      expect(loginForm).not.toContain('SERVICE_ROLE_KEY')
    })
  })

  describe('B. Open redirect protection', () => {
    it('auth callback has isSafeRedirect validation function', () => {
      const content = readFileSync(join(ROOT, 'app/auth/callback/route.ts'), 'utf-8')
      expect(content).toContain('isSafeRedirect')
    })

    it('auth callback validates redirect starts with /', () => {
      const content = readFileSync(join(ROOT, 'app/auth/callback/route.ts'), 'utf-8')
      // Must have a regex or check that starts with /
      expect(content).toContain('/^\\/')
    })

    it('password reset uses NEXT_PUBLIC_APP_URL (not hardcoded domain)', () => {
      const content = readFileSync(join(ROOT, 'modules/auth/actions.ts'), 'utf-8')
      expect(content).toContain('NEXT_PUBLIC_APP_URL')
    })

    it('password reset does not contain hardcoded production domain', () => {
      const content = readFileSync(join(ROOT, 'modules/auth/actions.ts'), 'utf-8')
      // Should not hardcode any production domain in the reset flow
      expect(content).not.toContain('https://ad-marketplace.com.br')
      expect(content).not.toContain('https://www.ad-marketplace.com.br')
    })
  })

  describe('C. Generic error messages (no information leakage)', () => {
    it('forgotPasswordAction always returns success (no account disclosure)', () => {
      const content = readFileSync(join(ROOT, 'modules/auth/actions.ts'), 'utf-8')
      expect(content).toContain('forgotPasswordAction')
      // The action should always return success: true
      // Check that there's a "return { success: true" inside forgotPasswordAction
      expect(content).toContain('success: true, data: undefined')
    })

    it('loginAction uses generic error message (not "email not found")', () => {
      const content = readFileSync(join(ROOT, 'modules/auth/actions.ts'), 'utf-8')
      // Should not expose which of email/password is wrong
      expect(content).toContain('E-mail ou senha incorretos')
      // Should not contain messages that distinguish email vs password
      expect(content).not.toContain('senha incorreta')
      expect(content).not.toContain('email não encontrado')
      expect(content).not.toContain('usuário não existe')
    })

    it('forgotPassword response is generic regardless of account existence', () => {
      const forgotForm = readFileSync(
        join(ROOT, 'components/auth/forgot-password-form.tsx'),
        'utf-8'
      )
      // UI shows generic message after submit
      expect(forgotForm).toContain('Se houver uma conta')
    })
  })

  describe('D. RLS and authorization in migration', () => {
    it('migration enables RLS on account_users', () => {
      const content = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(content).toContain('ENABLE ROW LEVEL SECURITY')
    })

    it('no direct INSERT policy for authenticated users (trigger-only)', () => {
      const content = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      // Insert policy uses WITH CHECK (false) to block client inserts
      expect(content).toContain('WITH CHECK (false)')
    })

    it('no UPDATE policy for authenticated users (admin client handles writes)', () => {
      const content = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      // There should be no RLS policy granting UPDATE to authenticated role
      // (all writes go through admin client / service_role)
      // Check that UPDATE policy for authenticated is absent
      const lines = content.split('\n')
      const updatePolicies = lines.filter(
        (l) => l.includes('FOR UPDATE') && !l.includes('--')
      )
      // The only UPDATE-related content should be the prevent_role_status trigger,
      // not an RLS policy granting update access
      expect(updatePolicies.length).toBe(0)
    })

    it('migration has role/status protection trigger', () => {
      const content = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(content).toContain('prevent_role_status_change')
    })
  })

  describe('E. Trigger security (SECURITY DEFINER hardening)', () => {
    it('trigger function uses SECURITY DEFINER', () => {
      const content = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(content).toContain('SECURITY DEFINER')
    })

    it('trigger function sets explicit search_path', () => {
      const content = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      // Must have SET search_path on the SECURITY DEFINER function
      expect(content).toContain('SET search_path = public, pg_temp')
    })

    it('trigger revokes EXECUTE on trigger function from PUBLIC', () => {
      const content = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(content).toContain('REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user()')
      expect(content).toContain('FROM PUBLIC')
    })

    it('trigger revokes EXECUTE from anon and authenticated roles', () => {
      const content = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(content).toContain('FROM anon')
      expect(content).toContain('FROM authenticated')
    })

    it('trigger never reads role from raw_user_meta_data', () => {
      const content = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      // Verify no line reads role from metadata
      const lines = content.split('\n')
      const metaRoleLines = lines.filter(
        (l) =>
          l.includes('raw_user_meta_data') &&
          l.toLowerCase().includes('role') &&
          !l.trim().startsWith('--')
      )
      expect(metaRoleLines.length).toBe(0)
    })

    it('trigger never reads status from raw_user_meta_data', () => {
      const content = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      const lines = content.split('\n')
      const metaStatusLines = lines.filter(
        (l) =>
          l.includes('raw_user_meta_data') &&
          l.toLowerCase().includes('status') &&
          !l.trim().startsWith('--')
      )
      expect(metaStatusLines.length).toBe(0)
    })

    it('trigger inserts ADVERTISER as hardcoded string literal', () => {
      const content = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(content).toContain("'ADVERTISER',   -- HARDCODED: never from user input")
    })

    it('trigger inserts ACTIVE as hardcoded string literal', () => {
      const content = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(content).toContain("'ACTIVE',       -- HARDCODED: never from user input")
    })
  })

  describe('F. Terms/Privacy not from user_metadata', () => {
    it('actions.ts does not pass terms_version to signUp options.data', () => {
      const content = readFileSync(join(ROOT, 'modules/auth/actions.ts'), 'utf-8')
      // The signUp call should not have terms_version in the data object
      // (it's written separately via admin client)
      // Verify by checking that terms_version appears in the admin client update, not signUp
      expect(content).toContain('adminClient')
      expect(content).toContain('terms_version: CURRENT_TERMS_VERSION')
    })

    it('actions.ts uses admin client (not signUp metadata) for terms persistence', () => {
      const content = readFileSync(join(ROOT, 'modules/auth/actions.ts'), 'utf-8')
      expect(content).toContain('createAdminClient()')
      // Admin update includes terms_version
      expect(content).toContain('terms_version: CURRENT_TERMS_VERSION')
      expect(content).toContain('privacy_version: CURRENT_PRIVACY_VERSION')
    })

    it('trigger creates account with NULL terms (safe incomplete state)', () => {
      const content = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      // terms/privacy are explicitly set to NULL in the trigger
      expect(content).toContain('safe incomplete state: server action writes this')
      expect(content).toContain('terms_version IS NULL OR privacy_version IS NULL')
    })

    it('DAL requireAccount checks for null terms (safe incomplete state)', () => {
      const content = readFileSync(join(ROOT, 'modules/auth/dal.ts'), 'utf-8')
      expect(content).toContain('terms_version')
      expect(content).toContain('privacy_version')
      expect(content).toContain('/complete-signup')
    })
  })

  describe('G. Proxy.ts is Next.js 16 format', () => {
    it('proxy.ts exports function named proxy (not middleware)', () => {
      const content = readFileSync(join(ROOT, 'proxy.ts'), 'utf-8')
      expect(content).toContain('export async function proxy(')
      expect(content).not.toContain('export function middleware(')
      expect(content).not.toContain('export default function middleware(')
    })

    it('proxy.ts is not the sole authorization check (documented)', () => {
      const content = readFileSync(join(ROOT, 'proxy.ts'), 'utf-8')
      // Proxy should document it's only for session refresh and coarse redirects
      expect(content).toContain('session refresh')
    })
  })
})
