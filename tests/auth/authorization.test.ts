/**
 * Tests: Authorization — FASE 01
 * Covers: RLS policies, route protection, account status handling,
 * privilege escalation via role/status, cross-account access prevention.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '../..')

describe('Authorization', () => {
  describe('A. RLS policies', () => {
    it('account_users has RLS enabled', () => {
      const migration = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(migration).toContain('ENABLE ROW LEVEL SECURITY')
    })

    it('SELECT policy is scoped to auth.uid() (no cross-account reads)', () => {
      const migration = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(migration).toContain('auth_user_id = auth.uid()')
    })

    it('INSERT is blocked for authenticated users (trigger-only creation)', () => {
      const migration = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(migration).toContain('no_client_insert')
      expect(migration).toContain('WITH CHECK (false)')
    })

    it('DELETE is blocked for authenticated users', () => {
      const migration = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(migration).toContain('no_client_delete')
      expect(migration).toContain('USING (false)')
    })

    it('no UPDATE RLS policy for authenticated role (writes via admin client only)', () => {
      const migration = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      // There should be no line granting UPDATE to authenticated via a policy
      const lines = migration.split('\n')
      const updatePolicyLines = lines.filter(
        (l) => l.includes('FOR UPDATE') && l.includes('authenticated') && !l.trim().startsWith('--')
      )
      expect(updatePolicyLines.length).toBe(0)
    })
  })

  describe('B. Privilege escalation — cannot self-assign ADMIN', () => {
    it('signup schema does not include role field', async () => {
      const { SignupSchema } = await import('@/modules/auth/schemas')
      const result = SignupSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        acceptedAge: 'on',
        acceptedTerms: 'on',
        role: 'ADMIN',
      })
      if (result.success) {
        expect((result.data as Record<string, unknown>).role).toBeUndefined()
      }
    })

    it('migration has role/status protection trigger', () => {
      const migration = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(migration).toContain('prevent_role_status_change')
      expect(migration).toContain('RAISE EXCEPTION')
    })

    it('protection trigger blocks role modification', () => {
      const migration = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(migration).toContain('OLD.role IS DISTINCT FROM NEW.role')
    })

    it('protection trigger blocks status modification', () => {
      const migration = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(migration).toContain('OLD.status IS DISTINCT FROM NEW.status')
    })

    it('UserRole type has ADMIN but it is documented as admin-only', () => {
      const typesContent = readFileSync(join(ROOT, 'modules/auth/types.ts'), 'utf-8')
      expect(typesContent).toContain("'ADVERTISER' | 'ADMIN'")
    })
  })

  describe('C. Route protection', () => {
    it('proxy.ts lists /dashboard as protected route', () => {
      const proxy = readFileSync(join(ROOT, 'proxy.ts'), 'utf-8')
      expect(proxy).toContain('/dashboard')
      expect(proxy).toContain('PROTECTED_ROUTES')
    })

    it('proxy.ts redirects unauthenticated to /login', () => {
      const proxy = readFileSync(join(ROOT, 'proxy.ts'), 'utf-8')
      expect(proxy).toContain("url.pathname = localizePathname('/login', locale)")
    })

    it('dashboard layout calls requireAccount() server-side (not just proxy)', () => {
      const layout = readFileSync(join(ROOT, 'app/(dashboard)/layout.tsx'), 'utf-8')
      expect(layout).toContain('requireAccount')
    })

    it('dashboard layout is async server component (no "use client")', () => {
      const layout = readFileSync(join(ROOT, 'app/(dashboard)/layout.tsx'), 'utf-8')
      expect(layout).not.toContain("'use client'")
      expect(layout).toContain('async function')
    })
  })

  describe('D. Account status enforcement', () => {
    it('DAL redirects SUSPENDED users to /suspended', () => {
      const dal = readFileSync(join(ROOT, 'modules/auth/dal.ts'), 'utf-8')
      expect(dal).toContain('SUSPENDED')
      expect(dal).toContain('/suspended')
    })

    it('DAL redirects DELETED users to /login', () => {
      const dal = readFileSync(join(ROOT, 'modules/auth/dal.ts'), 'utf-8')
      expect(dal).toContain('DELETED')
      expect(dal).toContain('/login')
    })

    it('suspended page exists', () => {
      expect(existsSync(join(ROOT, 'app/suspended/page.tsx'))).toBe(true)
    })

    it('DAL checks both authentication and account status (double check)', () => {
      const dal = readFileSync(join(ROOT, 'modules/auth/dal.ts'), 'utf-8')
      // DAL must check both user session and account status
      expect(dal).toContain('requireAuth')
      expect(dal).toContain('getAccount')
      expect(dal).toContain('status')
    })
  })

  describe('E. Admin role cannot be set via signup payload', () => {
    it('signupAction does not pass role to supabase.auth.signUp', () => {
      const actions = readFileSync(join(ROOT, 'modules/auth/actions.ts'), 'utf-8')
      expect(actions).not.toContain("'role'")
      expect(actions).not.toContain('"role"')
    })

    it('trigger insert hardcodes ADVERTISER (no metadata read for role)', () => {
      const migration = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      // Verify ADVERTISER is hardcoded in the trigger INSERT
      expect(migration).toContain("'ADVERTISER',   -- HARDCODED: never from user input")
      // Verify no metadata read for role in the trigger body
      const lines = migration.split('\n')
      const metaRoleLines = lines.filter(
        (l) => l.includes('raw_user_meta_data') && l.toLowerCase().includes('role') && !l.trim().startsWith('--')
      )
      expect(metaRoleLines.length).toBe(0)
    })
  })
})
