import { describe, it, expect, vi, beforeEach } from 'vitest'
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

describe('Pre-PX1 Guardrail I — CLIENT Account Provisioning Consistency', () => {
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
  // Case A: New CLIENT via OAuth -> role CLIENT + membership FREE + redirect /cliente
  // ---------------------------------------------------------------------------
  describe('Case A: New CLIENT via OAuth', () => {
    it('provisions role CLIENT, establishes FREE membership, and redirects to /cliente', async () => {
      const updateAccountMock = vi.fn()
      const upsertMembershipMock = vi.fn().mockResolvedValue({ error: null })

      updateAccountMock.mockReturnValue({
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
        if (table === 'client_memberships') {
          return {
            upsert: upsertMembershipMock,
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
      expect(upsertMembershipMock).toHaveBeenCalledWith(
        {
          account_id: 'acc-client-oauth-1',
          membership_type: 'FREE',
        },
        { onConflict: 'account_id' }
      )
    })
  })

  // ---------------------------------------------------------------------------
  // Case B: New CLIENT via Email OTP -> same canonical final state
  // ---------------------------------------------------------------------------
  describe('Case B: New CLIENT via Email OTP', () => {
    it('provisions role CLIENT, establishes FREE membership, and returns /cliente destination', async () => {
      const upsertAccountMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'acc-client-otp-1' }, error: null }),
        }),
      })
      const upsertMembershipMock = vi.fn().mockResolvedValue({ error: null })

      mockAdmin.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }), // No existing account
        })
        .mockReturnValueOnce({ upsert: upsertAccountMock })
        .mockReturnValueOnce({ upsert: upsertMembershipMock })

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
      expect(upsertMembershipMock).toHaveBeenCalledWith(
        {
          account_id: 'acc-client-otp-1',
          membership_type: 'FREE',
        },
        { onConflict: 'account_id' }
      )
    })
  })

  // ---------------------------------------------------------------------------
  // Case C: Membership write failure -> failure detected, fail closed (no false success)
  // ---------------------------------------------------------------------------
  describe('Case C: Fail-Closed on Membership Write Failure', () => {
    it('OAuth: fails closed and redirects to /login?error=provisioning_failed if membership write fails', async () => {
      const updateAccountMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'acc-fail-1' } }),
          }),
        }),
      })
      const upsertMembershipMock = vi.fn().mockResolvedValue({
        error: { message: 'Database connection error' },
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
        if (table === 'client_memberships') {
          return {
            upsert: upsertMembershipMock,
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
      // Must NOT redirect to /cliente on membership failure!
      expect(res.headers.get('location')).toBe('http://localhost:3000/login?error=provisioning_failed')
    })

    it('Email OTP: fails closed and returns error if membership write fails', async () => {
      const upsertAccountMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'acc-fail-2' }, error: null }),
        }),
      })
      const upsertMembershipMock = vi.fn().mockResolvedValue({
        error: { message: 'FK violation or DB unavailable' },
      })

      mockAdmin.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        })
        .mockReturnValueOnce({ upsert: upsertAccountMock })
        .mockReturnValueOnce({ upsert: upsertMembershipMock })

      const result = await verifyEmailOtpAction('client@velvet.club', '123456', 'CLIENT')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Não foi possível provisionar a assinatura do cliente')
      expect(result.destination).toBeUndefined()
    })

    it('OAuth: fails closed if account_users update fails', async () => {
      const updateAccountMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Account update failed' },
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

    it('Email OTP: fails closed if account_users upsert fails', async () => {
      const upsertAccountMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Unique constraint error' },
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
    })
  })

  // ---------------------------------------------------------------------------
  // Case D: Retry after failure -> recovers safely, 1 membership exists
  // ---------------------------------------------------------------------------
  describe('Case D: Retry After Failure & Idempotency', () => {
    it('ensureClientMembership recovers cleanly on second attempt', async () => {
      const upsertMock = vi
        .fn()
        .mockResolvedValueOnce({ error: { message: 'Transient timeout' } })
        .mockResolvedValueOnce({ error: null })

      const mockClient = {
        from: vi.fn().mockReturnValue({ upsert: upsertMock }),
      }

      // First attempt fails
      const attempt1 = await ensureClientMembership(mockClient, 'acc-retry-1')
      expect(attempt1.success).toBe(false)
      expect(attempt1.error).toBe('Transient timeout')

      // Second attempt succeeds
      const attempt2 = await ensureClientMembership(mockClient, 'acc-retry-1')
      expect(attempt2.success).toBe(true)
      expect(attempt2.error).toBeUndefined()

      expect(upsertMock).toHaveBeenCalledTimes(2)
      expect(upsertMock).toHaveBeenLastCalledWith(
        { account_id: 'acc-retry-1', membership_type: 'FREE' },
        { onConflict: 'account_id' }
      )
    })
  })

  // ---------------------------------------------------------------------------
  // Case E: Existing CLIENT -> idempotent, normal redirect
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
  // Case F: Existing ADVERTISER -> role preserved, not converted to CLIENT
  // ---------------------------------------------------------------------------
  describe('Case F: Role Preservation (ADVERTISER is never converted to CLIENT)', () => {
    it('OAuth: does not convert existing ADVERTISER to CLIENT even if intent is CLIENT', async () => {
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

    it('Email OTP: does not convert existing ADVERTISER to CLIENT on CLIENT intent', async () => {
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
  // Case G: Suspended CLIENT -> redirects to /suspended
  // ---------------------------------------------------------------------------
  describe('Case G: Suspended CLIENT Routing', () => {
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

    it('Email OTP: routes SUSPENDED client to /suspended', async () => {
      mockAdmin.from.mockReturnValueOnce({
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
      })

      const result = await verifyEmailOtpAction('client@velvet.club', '123456', 'LOGIN')
      expect(result.success).toBe(true)
      expect(result.destination).toBe('/suspended')
    })
  })

  // ---------------------------------------------------------------------------
  // Case H & I: DB Trigger & Pre-existing Membership Compatibility
  // ---------------------------------------------------------------------------
  describe('Case H & I: DB Trigger & Idempotent Upsert Compatibility', () => {
    it('does not error or duplicate when client_memberships record already exists (e.g. from trigger)', async () => {
      const upsertMock = vi.fn().mockResolvedValue({ error: null })
      const mockClient = {
        from: vi.fn().mockReturnValue({ upsert: upsertMock }),
      }

      const result = await ensureClientMembership(mockClient, 'acc-existing-membership')
      expect(result.success).toBe(true)
      expect(upsertMock).toHaveBeenCalledWith(
        { account_id: 'acc-existing-membership', membership_type: 'FREE' },
        { onConflict: 'account_id' }
      )
    })

    it('fails closed when accountId is missing or empty', async () => {
      const result = await ensureClientMembership(mockAdmin, '')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Account ID is required')
    })
  })

  // ---------------------------------------------------------------------------
  // Case J: OAuth trusted origin remains enforced
  // ---------------------------------------------------------------------------
  describe('Case J: OAuth Trusted Origin Preserved During CLIENT Provisioning', () => {
    it('redirects to server-authoritative origin even if client sends spoofed Host/Forwarded headers', async () => {
      const updateAccountMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'acc-spoof-client' } }),
          }),
        }),
      })
      const upsertMembershipMock = vi.fn().mockResolvedValue({ error: null })

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
        if (table === 'client_memberships') {
          return {
            upsert: upsertMembershipMock,
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
      // Must NOT redirect to evil-attacker.com
      expect(location).not.toContain('evil-attacker.com')
      expect(location.endsWith('/cliente')).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Case K: Domain Consistency Invariant Enforcement
  // ---------------------------------------------------------------------------
  describe('Case K: Domain Consistency Invariant', () => {
    it('detects partial provisioning if account has role CLIENT but lacks client_memberships', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'acc-partial-client', role: 'CLIENT', status: 'ACTIVE' },
              error: null,
            }),
          }
        }
        if (table === 'client_memberships') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: null, // Missing membership!
              error: null,
            }),
          }
        }
      })

      const status = await assertClientProvisioningInvariant(mockAdmin, 'acc-partial-client')
      expect(status.isConsistent).toBe(false)
      expect(status.role).toBe('CLIENT')
      expect(status.hasMembership).toBe(false)
      expect(status.error).toContain('missing client_memberships')
    })

    it('confirms consistent state when account has role CLIENT and client_memberships exists', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'acc-valid-client', role: 'CLIENT', status: 'ACTIVE' },
              error: null,
            }),
          }
        }
        if (table === 'client_memberships') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { account_id: 'acc-valid-client', membership_type: 'VIP' },
              error: null,
            }),
          }
        }
      })

      const status = await assertClientProvisioningInvariant(mockAdmin, 'acc-valid-client')
      expect(status.isConsistent).toBe(true)
      expect(status.role).toBe('CLIENT')
      expect(status.hasMembership).toBe(true)
      expect(status.membershipType).toBe('VIP')
    })

    it('passes consistency for non-client accounts (e.g. ADVERTISER) without requiring client_memberships', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'acc-adv', role: 'ADVERTISER', status: 'ACTIVE' },
              error: null,
            }),
          }
        }
      })

      const status = await assertClientProvisioningInvariant(mockAdmin, 'acc-adv')
      expect(status.isConsistent).toBe(true)
      expect(status.role).toBe('ADVERTISER')
      expect(status.hasMembership).toBe(false)
    })
  })
})
