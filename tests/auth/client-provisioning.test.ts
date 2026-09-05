import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { NextRequest } from 'next/server'
import { GET } from '@/app/auth/callback/route'
import { verifyEmailOtpAction } from '@/modules/auth/email-otp-actions'
import {
  ensureClientMembership,
  assertClientProvisioningInvariant,
} from '@/modules/auth/client-provisioning'
import { createSignedOAuthIntent } from '@/modules/auth/oauth'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '@/lib/config/legal-versions'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: (header: string) => {
      if (header === 'x-forwarded-for') return '203.0.113.195'
      return null
    },
  }),
}))

describe('Pre-PX1 Guardrail I — Database-Owned CLIENT Provisioning Atomicity', () => {
  let mockSupabase: any
  let mockAdmin: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'auth-user-client-123', email: 'client@velvet.club' } },
        }),
        verifyOtp: vi.fn().mockResolvedValue({
          data: { user: { id: 'auth-user-client-123', email: 'client@velvet.club' } },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    }
    vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

    mockAdmin = {
      from: vi.fn(),
      auth: {
        admin: {
          deleteUser: vi.fn().mockResolvedValue({ error: null }),
        },
      },
    }
    vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any)
  })

  // ---------------------------------------------------------------------------
  // Case A: New CLIENT via OAuth -> sets role CLIENT and routes to /cliente
  // (Membership is created atomically by DB trigger trg_ensure_client_membership)
  // ---------------------------------------------------------------------------
  describe('Case A: New CLIENT via OAuth', () => {
    it('provisions role CLIENT in account_users and redirects to /cliente', async () => {
      const updateAccountMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'acc-client-oauth-1' } }),
          }),
        }),
      })

      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'acc-unfinalized',
                role: 'ADVERTISER',
                status: 'ACTIVE',
                onboarding_status: 'NOT_STARTED',
                terms_version: null,
              },
            }),
            update: updateAccountMock,
          }
        }
      })

      const token = createSignedOAuthIntent('CLIENT')
      const req = new NextRequest('http://localhost:3000/auth/callback?code=valid-oauth-code', {
        headers: {
          cookie: `velvet_oauth_intent=${token}`,
        },
      })
      const res = await GET(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('http://localhost:3000/cliente')

      expect(updateAccountMock).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'CLIENT',
          status: 'ACTIVE',
          onboarding_status: 'COMPLETED',
          terms_version: CURRENT_TERMS_VERSION,
          privacy_version: CURRENT_PRIVACY_VERSION,
        })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // Case B: New CLIENT via Email OTP -> sets role CLIENT and routes to /cliente
  // (Membership is created atomically by DB trigger trg_ensure_client_membership)
  // ---------------------------------------------------------------------------
  describe('Case B: New CLIENT via Email OTP', () => {
    it('provisions role CLIENT in account_users and returns /cliente destination', async () => {
      const upsertAccountMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'acc-client-otp-1' }, error: null }),
        }),
      })

      mockAdmin.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }), // No existing account
        })
        .mockReturnValueOnce({ upsert: upsertAccountMock })

      const result = await verifyEmailOtpAction('client@velvet.club', '123456', 'CLIENT')

      expect(result.success).toBe(true)
      expect(result.destination).toBe('/cliente')
      expect(upsertAccountMock).toHaveBeenCalledWith(
        expect.objectContaining({
          auth_user_id: 'auth-user-client-123',
          role: 'CLIENT',
          status: 'ACTIVE',
          onboarding_status: 'COMPLETED',
          terms_version: CURRENT_TERMS_VERSION,
          privacy_version: CURRENT_PRIVACY_VERSION,
        }),
        { onConflict: 'auth_user_id' }
      )
    })
  })

  // ---------------------------------------------------------------------------
  // Case C: Password Client Signup Compatibility
  // ---------------------------------------------------------------------------
  describe('Case C: Password Client Signup Compatibility', () => {
    it('verifies that handle_new_auth_user delegates to trg_ensure_client_membership without conflicting', () => {
      const migrationPath = path.resolve(
        process.cwd(),
        'supabase/migrations/20260905030000_enforce_atomic_client_membership.sql'
      )
      const migrationSql = fs.readFileSync(migrationPath, 'utf8')

      expect(migrationSql).toContain('CREATE OR REPLACE FUNCTION public.handle_new_auth_user()')
      expect(migrationSql).toContain('CREATE TRIGGER trg_ensure_client_membership')
      expect(migrationSql).toContain("WHEN (NEW.role = 'CLIENT'::public.user_role)")
      expect(migrationSql).toContain("ON CONFLICT (account_id) DO NOTHING")
    })
  })

  // ---------------------------------------------------------------------------
  // Case D: Database Failure Rollback & Fail-Closed Behavior
  // ---------------------------------------------------------------------------
  describe('Case D: Fail-Closed on Database Update Failure', () => {
    it('OAuth: fails closed and redirects to /login?error=provisioning_failed if account update fails', async () => {
      const updateAccountMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database transaction aborted by trigger' },
            }),
          }),
        }),
      })

      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'acc-err', terms_version: null },
            }),
            update: updateAccountMock,
          }
        }
      })

      const token = createSignedOAuthIntent('CLIENT')
      const req = new NextRequest('http://localhost:3000/auth/callback?code=valid-code', {
        headers: {
          cookie: `velvet_oauth_intent=${token}`,
        },
      })
      const res = await GET(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('http://localhost:3000/login?error=provisioning_failed')
    })

    it('Email OTP: fails closed and returns error if account upsert fails', async () => {
      const upsertAccountMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database constraint failure' },
          }),
        }),
      })

      mockAdmin.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        })
        .mockReturnValueOnce({ upsert: upsertAccountMock })

      const result = await verifyEmailOtpAction('client@velvet.club', '123456', 'CLIENT')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Não foi possível provisionar a conta de cliente')
      expect(result.destination).toBeUndefined()
    })
  })

  // ---------------------------------------------------------------------------
  // Case E: Existing CLIENT + FREE -> idempotent, normal redirect
  // ---------------------------------------------------------------------------
  describe('Case E: Existing CLIENT Idempotency', () => {
    it('OAuth: routes existing CLIENT directly to /cliente', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'acc-existing-client',
                role: 'CLIENT',
                status: 'ACTIVE',
                onboarding_status: 'COMPLETED',
                terms_version: CURRENT_TERMS_VERSION,
              },
            }),
          }
        }
      })

      const req = new NextRequest('http://localhost:3000/auth/callback?code=valid-code')
      const res = await GET(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('http://localhost:3000/cliente')
    })

    it('Email OTP: routes existing CLIENT directly to /cliente', async () => {
      mockAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'acc-existing-client-otp',
            role: 'CLIENT',
            status: 'ACTIVE',
            terms_version: CURRENT_TERMS_VERSION,
          },
        }),
      })

      const result = await verifyEmailOtpAction('client@velvet.club', '123456', 'LOGIN')
      expect(result.success).toBe(true)
      expect(result.destination).toBe('/cliente')
    })
  })

  // ---------------------------------------------------------------------------
  // Case F: Existing CLIENT + VIP -> VIP membership is preserved
  // ---------------------------------------------------------------------------
  describe('Case F: VIP Membership Preservation', () => {
    it('ensure_client_membership_trigger uses ON CONFLICT DO NOTHING to protect VIP memberships', () => {
      const migrationPath = path.resolve(
        process.cwd(),
        'supabase/migrations/20260905030000_enforce_atomic_client_membership.sql'
      )
      const migrationSql = fs.readFileSync(migrationPath, 'utf8')

      expect(migrationSql).toMatch(/INSERT INTO public\.client_memberships\s*\(\s*account_id,\s*membership_type\s*\)\s*VALUES\s*\(\s*NEW\.id,\s*'FREE'::public\.client_membership_type\s*\)\s*ON CONFLICT\s*\(account_id\)\s*DO NOTHING/)
    })

    it('assertClientProvisioningInvariant correctly validates VIP client status', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'acc-vip', role: 'CLIENT', status: 'ACTIVE' },
              error: null,
            }),
          }
        }
        if (table === 'client_memberships') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { account_id: 'acc-vip', membership_type: 'VIP' },
              error: null,
            }),
          }
        }
      })

      const status = await assertClientProvisioningInvariant(mockAdmin, 'acc-vip')
      expect(status.isConsistent).toBe(true)
      expect(status.role).toBe('CLIENT')
      expect(status.hasMembership).toBe(true)
      expect(status.membershipType).toBe('VIP')
    })
  })

  // ---------------------------------------------------------------------------
  // Case G: Existing ADVERTISER -> role preserved, not converted to CLIENT
  // ---------------------------------------------------------------------------
  describe('Case G: Role Preservation (ADVERTISER is never converted to CLIENT)', () => {
    it('OAuth: preserves existing ADVERTISER even if intent is CLIENT', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'acc-adv',
                role: 'ADVERTISER',
                status: 'ACTIVE',
                onboarding_status: 'COMPLETED',
                terms_version: CURRENT_TERMS_VERSION,
              },
            }),
          }
        }
      })

      const token = createSignedOAuthIntent('CLIENT')
      const req = new NextRequest('http://localhost:3000/auth/callback?code=valid-code', {
        headers: {
          cookie: `velvet_oauth_intent=${token}`,
        },
      })
      const res = await GET(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard')
    })

    it('Email OTP: preserves existing ADVERTISER on CLIENT intent', async () => {
      mockAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'acc-adv',
            role: 'ADVERTISER',
            status: 'ACTIVE',
            onboarding_status: 'COMPLETED',
            terms_version: CURRENT_TERMS_VERSION,
          },
        }),
      })

      const result = await verifyEmailOtpAction('adv@velvet.club', '123456', 'CLIENT')
      expect(result.success).toBe(true)
      expect(result.destination).toBe('/dashboard')
    })
  })

  // ---------------------------------------------------------------------------
  // Case H: Existing ADMIN -> role preserved, routes to /admin
  // ---------------------------------------------------------------------------
  describe('Case H: Existing ADMIN Routing', () => {
    it('OAuth: routes existing ADMIN to /admin', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'acc-admin',
                role: 'ADMIN',
                status: 'ACTIVE',
                terms_version: CURRENT_TERMS_VERSION,
              },
            }),
          }
        }
      })

      const req = new NextRequest('http://localhost:3000/auth/callback?code=valid-code')
      const res = await GET(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('http://localhost:3000/admin')
    })
  })

  // ---------------------------------------------------------------------------
  // Case I: Non-CLIENT Accounts Do Not Require client_memberships
  // ---------------------------------------------------------------------------
  describe('Case I: Non-CLIENT Invariant', () => {
    it('assertClientProvisioningInvariant treats ADVERTISER as consistent without membership', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'acc-adv-test', role: 'ADVERTISER', status: 'ACTIVE' },
              error: null,
            }),
          }
        }
      })

      const status = await assertClientProvisioningInvariant(mockAdmin, 'acc-adv-test')
      expect(status.isConsistent).toBe(true)
      expect(status.role).toBe('ADVERTISER')
      expect(status.hasMembership).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // Case J: Suspended Account Routing
  // ---------------------------------------------------------------------------
  describe('Case J: Suspended Account Routing', () => {
    it('OAuth: routes SUSPENDED client to /suspended', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'acc-susp-client',
                role: 'CLIENT',
                status: 'SUSPENDED',
                terms_version: CURRENT_TERMS_VERSION,
              },
            }),
          }
        }
      })

      const req = new NextRequest('http://localhost:3000/auth/callback?code=valid-code')
      const res = await GET(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('http://localhost:3000/suspended')
    })
  })

  // ---------------------------------------------------------------------------
  // Case K: Duplicate Retry Idempotency Helper
  // ---------------------------------------------------------------------------
  describe('Case K: Duplicate Retry Idempotency Helper', () => {
    it('ensureClientMembership helper is idempotent and retry-safe', async () => {
      const upsertMock = vi.fn().mockResolvedValue({ error: null })
      const mockClient = {
        from: vi.fn().mockReturnValue({ upsert: upsertMock }),
      }

      const result1 = await ensureClientMembership(mockClient, 'acc-idem-1')
      expect(result1.success).toBe(true)

      const result2 = await ensureClientMembership(mockClient, 'acc-idem-1')
      expect(result2.success).toBe(true)

      expect(upsertMock).toHaveBeenCalledTimes(2)
      expect(upsertMock).toHaveBeenLastCalledWith(
        { account_id: 'acc-idem-1', membership_type: 'FREE' },
        { onConflict: 'account_id' }
      )
    })

    it('ensureClientMembership fails closed on empty accountId', async () => {
      const result = await ensureClientMembership(mockAdmin, '')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Account ID is required')
    })
  })

  // ---------------------------------------------------------------------------
  // Case L: OAuth Trusted Origin Preserved
  // ---------------------------------------------------------------------------
  describe('Case L: OAuth Trusted Origin Preserved', () => {
    it('redirects to server-authoritative origin even if client sends spoofed Host headers', async () => {
      const updateAccountMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'acc-spoof-client' } }),
          }),
        }),
      })

      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'acc-unfinalized',
                role: 'ADVERTISER',
                status: 'ACTIVE',
                terms_version: null,
              },
            }),
            update: updateAccountMock,
          }
        }
      })

      const token = createSignedOAuthIntent('CLIENT')
      const req = new NextRequest('http://evil-attacker.com/auth/callback?code=valid-code', {
        headers: {
          host: 'evil-attacker.com',
          'x-forwarded-host': 'evil-attacker.com',
          forwarded: 'host=evil-attacker.com',
          cookie: `velvet_oauth_intent=${token}`,
        },
      })
      const res = await GET(req)

      expect(res.status).toBe(307)
      const location = res.headers.get('location')!
      expect(location).not.toContain('evil-attacker.com')
      expect(location.endsWith('/cliente')).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Database Trigger Structural Invariants
  // ---------------------------------------------------------------------------
  describe('Database Trigger Structural Invariants', () => {
    it('verifies migration 20260905030000 defines trg_ensure_client_membership with correct constraints', () => {
      const migrationPath = path.resolve(
        process.cwd(),
        'supabase/migrations/20260905030000_enforce_atomic_client_membership.sql'
      )
      const sql = fs.readFileSync(migrationPath, 'utf8')

      expect(sql).toContain('CREATE OR REPLACE FUNCTION public.ensure_client_membership_trigger()')
      expect(sql).toContain('SECURITY DEFINER')
      expect(sql).toContain('SET search_path = public, pg_temp')
      expect(sql).toContain('CREATE TRIGGER trg_ensure_client_membership')
      expect(sql).toContain('AFTER INSERT OR UPDATE OF role ON public.account_users')
      expect(sql).toContain('FOR EACH ROW')
      expect(sql).toContain("WHEN (NEW.role = 'CLIENT'::public.user_role)")
      expect(sql).toContain('REVOKE EXECUTE ON FUNCTION public.ensure_client_membership_trigger() FROM PUBLIC, anon, authenticated')
      expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.ensure_client_membership_trigger() TO service_role')
    })
  })
})
