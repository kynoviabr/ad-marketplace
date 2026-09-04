import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createSignedOAuthIntent,
  verifyOAuthIntentCookie,
  type OAuthIntent,
} from '@/modules/auth/oauth'
import { GET } from '@/app/auth/callback/route'
import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

describe('R11.5A Google OAuth & Intent Safety', () => {
  describe('A. Cryptographic Intent Signing & Verification', () => {
    it('successfully signs and verifies ADVERTISER intent', () => {
      const token = createSignedOAuthIntent('ADVERTISER')
      expect(typeof token).toBe('string')
      expect(token).toContain('.')

      const verified = verifyOAuthIntentCookie(token)
      expect(verified).toBe('ADVERTISER')
    })

    it('successfully signs and verifies CLIENT intent', () => {
      const token = createSignedOAuthIntent('CLIENT')
      const verified = verifyOAuthIntentCookie(token)
      expect(verified).toBe('CLIENT')
    })

    it('successfully signs and verifies LOGIN intent', () => {
      const token = createSignedOAuthIntent('LOGIN')
      const verified = verifyOAuthIntentCookie(token)
      expect(verified).toBe('LOGIN')
    })

    it('fails closed (returns null) on tampered payload', () => {
      const token = createSignedOAuthIntent('ADVERTISER')
      const [payload, sig] = token.split('.')
      // Alter the payload
      const tamperedPayload = Buffer.from(
        JSON.stringify({ intent: 'CLIENT', nonce: 'fake', exp: Date.now() + 600000 })
      ).toString('base64url')

      const result = verifyOAuthIntentCookie(`${tamperedPayload}.${sig}`)
      expect(result).toBeNull()
    })

    it('fails closed on tampered signature', () => {
      const token = createSignedOAuthIntent('ADVERTISER')
      const [payload] = token.split('.')
      const tamperedSig = 'invalidsignature0123456789'

      const result = verifyOAuthIntentCookie(`${payload}.${tamperedSig}`)
      expect(result).toBeNull()
    })

    it('fails closed on expired intent token', () => {
      // Mock Date.now to test expiration
      const realNow = Date.now
      try {
        const token = createSignedOAuthIntent('ADVERTISER')
        // Advance time by 11 minutes (TTL is 10 minutes)
        Date.now = () => realNow() + 11 * 60 * 1000
        const result = verifyOAuthIntentCookie(token)
        expect(result).toBeNull()
      } finally {
        Date.now = realNow
      }
    })

    it('fails closed on null, undefined, empty, or malformed input', () => {
      expect(verifyOAuthIntentCookie(null)).toBeNull()
      expect(verifyOAuthIntentCookie(undefined)).toBeNull()
      expect(verifyOAuthIntentCookie('')).toBeNull()
      expect(verifyOAuthIntentCookie('not-a-token')).toBeNull()
      expect(verifyOAuthIntentCookie('a.b.c')).toBeNull()
    })
  })

  describe('B. OAuth Callback Route Handling & Role Safety', () => {
    let mockSupabase: any
    let mockAdmin: any

    beforeEach(() => {
      vi.clearAllMocks()

      mockSupabase = {
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'auth-user-123' } } }),
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

    it('redirects to /login?error=oauth_error when provider error is present in query', async () => {
      const req = new NextRequest('http://localhost:3000/auth/callback?error=access_denied&error_description=User+cancelled')
      const res = await GET(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('http://localhost:3000/login?error=oauth_error')
      // Cookie is cleared
      const setCookie = res.headers.get('set-cookie')
      expect(setCookie).toContain('velvet_oauth_intent=')
      expect(setCookie).toContain('Max-Age=0')
    })

    it('redirects to /login?error=confirmation_failed when authorization code is missing', async () => {
      const req = new NextRequest('http://localhost:3000/auth/callback')
      const res = await GET(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('http://localhost:3000/login?error=confirmation_failed')
    })

    it('redirects to /login?error=oauth_failed when exchangeCodeForSession fails', async () => {
      mockSupabase.auth.exchangeCodeForSession.mockResolvedValueOnce({
        error: { message: 'Invalid PKCE code' },
      })

      const req = new NextRequest('http://localhost:3000/auth/callback?code=bad-code')
      const res = await GET(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('http://localhost:3000/login?error=oauth_failed')
    })

    it('EXISTING ACCOUNT: preserves existing CLIENT role and redirects to /cliente', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'acc-1',
                role: 'CLIENT',
                status: 'ACTIVE',
                onboarding_status: 'COMPLETED',
                terms_version: '2026-08-17',
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

    it('EXISTING ACCOUNT: preserves existing ADVERTISER role and redirects to /dashboard if completed', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'acc-2',
                role: 'ADVERTISER',
                status: 'ACTIVE',
                onboarding_status: 'COMPLETED',
                terms_version: '2026-08-17',
              },
            }),
          }
        }
      })

      const req = new NextRequest('http://localhost:3000/auth/callback?code=valid-code')
      const res = await GET(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard')
    })

    it('EXISTING ACCOUNT: preserves existing ADVERTISER role and redirects to /onboarding if not completed', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'acc-3',
                role: 'ADVERTISER',
                status: 'ACTIVE',
                onboarding_status: 'IN_PROGRESS',
                terms_version: '2026-08-17',
              },
            }),
          }
        }
      })

      const req = new NextRequest('http://localhost:3000/auth/callback?code=valid-code')
      const res = await GET(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('http://localhost:3000/onboarding')
    })

    it('EXISTING ACCOUNT: redirects to /suspended if account status is SUSPENDED', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'acc-4',
                role: 'ADVERTISER',
                status: 'SUSPENDED',
                onboarding_status: 'COMPLETED',
                terms_version: '2026-08-17',
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

    it('NEW USER with explicit ADVERTISER intent: configures account and routes to /onboarding', async () => {
      const updateMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockResolvedValue({ error: null })
      updateMock.mockReturnValue({ eq: eqMock })

      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            // Unfinalized / new account from DB trigger: terms_version is null
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'new-acc',
                role: 'ADVERTISER',
                status: 'ACTIVE',
                onboarding_status: 'NOT_STARTED',
                terms_version: null,
              },
            }),
            update: updateMock,
          }
        }
      })

      const token = createSignedOAuthIntent('ADVERTISER')
      const req = new NextRequest('http://localhost:3000/auth/callback?code=valid-code', {
        headers: {
          cookie: `velvet_oauth_intent=${token}`,
        },
      })
      const res = await GET(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('http://localhost:3000/onboarding')
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'ADVERTISER',
          status: 'ACTIVE',
          onboarding_status: 'NOT_STARTED',
          terms_version: expect.any(String),
          privacy_version: expect.any(String),
        })
      )
    })

    it('NEW USER with explicit CLIENT intent: configures client account and routes to /cliente', async () => {
      const updateMock = vi.fn()
      const upsertMock = vi.fn().mockResolvedValue({ error: null })

      updateMock.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'client-acc-1' } }),
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
                id: 'new-acc',
                role: 'ADVERTISER',
                status: 'ACTIVE',
                onboarding_status: 'NOT_STARTED',
                terms_version: null,
              },
            }),
            update: updateMock,
          }
        }
        if (table === 'client_memberships') {
          return {
            upsert: upsertMock,
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
      expect(res.headers.get('location')).toBe('http://localhost:3000/cliente')
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'CLIENT',
          status: 'ACTIVE',
          onboarding_status: 'COMPLETED',
          terms_version: expect.any(String),
          privacy_version: expect.any(String),
        })
      )
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          account_id: 'client-acc-1',
          membership_type: 'FREE',
        }),
        expect.any(Object)
      )
    })

    it('FAIL CLOSED: ambiguous new user with LOGIN intent rolls back and redirects to /login?error=signup_intent_required', async () => {
      const deleteUserMock = mockAdmin.auth.admin.deleteUser
      const deleteFromMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'new-ambiguous-acc',
                role: 'ADVERTISER',
                status: 'ACTIVE',
                onboarding_status: 'NOT_STARTED',
                terms_version: null,
              },
            }),
            delete: deleteFromMock,
          }
        }
      })

      const token = createSignedOAuthIntent('LOGIN')
      const req = new NextRequest('http://localhost:3000/auth/callback?code=valid-code', {
        headers: {
          cookie: `velvet_oauth_intent=${token}`,
        },
      })
      const res = await GET(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('http://localhost:3000/login?error=signup_intent_required')
      // Enforce fail-closed rollback
      expect(deleteUserMock).toHaveBeenCalledWith('auth-user-123')
      expect(deleteFromMock).toHaveBeenCalled()
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('FAIL CLOSED: ambiguous new user with MISSING intent cookie rolls back and redirects to /login?error=signup_intent_required', async () => {
      const deleteUserMock = mockAdmin.auth.admin.deleteUser
      const deleteFromMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'new-ambiguous-acc',
                role: 'ADVERTISER',
                status: 'ACTIVE',
                onboarding_status: 'NOT_STARTED',
                terms_version: null,
              },
            }),
            delete: deleteFromMock,
          }
        }
      })

      // No cookie attached
      const req = new NextRequest('http://localhost:3000/auth/callback?code=valid-code')
      const res = await GET(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('http://localhost:3000/login?error=signup_intent_required')
      expect(deleteUserMock).toHaveBeenCalledWith('auth-user-123')
      expect(deleteFromMock).toHaveBeenCalled()
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('NEW USER with explicit ADVERTISER intent via query param intent_token: configures account and routes to /onboarding', async () => {
      const updateMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockResolvedValue({ error: null })
      updateMock.mockReturnValue({ eq: eqMock })

      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'new-acc-query',
                role: 'ADVERTISER',
                status: 'ACTIVE',
                onboarding_status: 'NOT_STARTED',
                terms_version: null,
              },
            }),
            update: updateMock,
          }
        }
      })

      const token = createSignedOAuthIntent('ADVERTISER')
      // No cookie in headers, token passed via intent_token URL parameter
      const req = new NextRequest(`http://localhost:3000/auth/callback?code=valid-code&intent_token=${encodeURIComponent(token)}`)
      const res = await GET(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('http://localhost:3000/onboarding')
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'ADVERTISER',
          status: 'ACTIVE',
          onboarding_status: 'NOT_STARTED',
        })
      )
    })

    it('NEW USER with explicit CLIENT intent via query param intent_token: configures client and routes to /cliente', async () => {
      const updateMock = vi.fn()
      const upsertMock = vi.fn().mockResolvedValue({ error: null })

      updateMock.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'client-acc-param' } }),
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
                id: 'new-acc-param',
                role: 'ADVERTISER',
                status: 'ACTIVE',
                onboarding_status: 'NOT_STARTED',
                terms_version: null,
              },
            }),
            update: updateMock,
          }
        }
        if (table === 'client_memberships') {
          return {
            upsert: upsertMock,
          }
        }
      })

      const token = createSignedOAuthIntent('CLIENT')
      const req = new NextRequest(`http://localhost:3000/auth/callback?code=valid-code&intent_token=${encodeURIComponent(token)}`)
      const res = await GET(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('http://localhost:3000/cliente')
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'CLIENT',
          status: 'ACTIVE',
          onboarding_status: 'COMPLETED',
        })
      )
    })

    it('FAIL CLOSED: tampered intent_token query param rolls back and redirects to /login?error=signup_intent_required', async () => {
      const deleteUserMock = mockAdmin.auth.admin.deleteUser
      const deleteFromMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'new-tampered-acc',
                role: 'ADVERTISER',
                status: 'ACTIVE',
                onboarding_status: 'NOT_STARTED',
                terms_version: null,
              },
            }),
            delete: deleteFromMock,
          }
        }
      })

      const validToken = createSignedOAuthIntent('ADVERTISER')
      const [payload] = validToken.split('.')
      const tamperedToken = `${payload}.forged_signature_xyz`

      const req = new NextRequest(`http://localhost:3000/auth/callback?code=valid-code&intent_token=${encodeURIComponent(tamperedToken)}`)
      const res = await GET(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('http://localhost:3000/login?error=signup_intent_required')
      expect(deleteUserMock).toHaveBeenCalledWith('auth-user-123')
      expect(deleteFromMock).toHaveBeenCalled()
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })
  })
})
