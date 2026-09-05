import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/auth/callback/route'
import {
  resolveTrustedAuthOrigin,
  isSafeInternalRedirectPath,
  getTrustedAuthCallbackOrigin,
} from '@/modules/auth/origin'
import { createSignedOAuthIntent } from '@/modules/auth/oauth'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

describe('Pre-PX1 Guardrail F: OAuth Trusted Origin Validation', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('1. Unit: resolveTrustedAuthOrigin & Environment Validation', () => {
    it('Case J: preserves localhost HTTP in development and test environments', () => {
      expect(resolveTrustedAuthOrigin('http://localhost:3000', 'development')).toBe('http://localhost:3000')
      expect(resolveTrustedAuthOrigin('http://localhost:3000', 'test')).toBe('http://localhost:3000')
      expect(resolveTrustedAuthOrigin('http://127.0.0.1:3000', 'development')).toBe('http://127.0.0.1:3000')
      expect(resolveTrustedAuthOrigin('http://[::1]:3000', 'development')).toBe('http://[::1]:3000')
    })

    it('Case J: disallows localhost HTTP in production environment', () => {
      expect(() => resolveTrustedAuthOrigin('http://localhost:3000', 'production')).toThrow(
        'INVALID_APP_ORIGIN'
      )
      expect(() => resolveTrustedAuthOrigin('http://127.0.0.1:3000', 'production')).toThrow(
        'INVALID_APP_ORIGIN'
      )
    })

    it('allows valid HTTPS in all environments', () => {
      expect(resolveTrustedAuthOrigin('https://velvet.com.br', 'production')).toBe(
        'https://velvet.com.br'
      )
      expect(resolveTrustedAuthOrigin('https://velvet.com.br', 'development')).toBe(
        'https://velvet.com.br'
      )
      expect(resolveTrustedAuthOrigin('https://preview.velvet.app:8443', 'test')).toBe(
        'https://preview.velvet.app:8443'
      )
    })

    it('Case I: fails closed on invalid URLs, empty strings, and whitespace', () => {
      expect(() => resolveTrustedAuthOrigin('', 'production')).toThrow('INVALID_APP_ORIGIN')
      expect(() => resolveTrustedAuthOrigin('   ', 'production')).toThrow('INVALID_APP_ORIGIN')
      expect(() => resolveTrustedAuthOrigin('not-a-url', 'production')).toThrow(
        'INVALID_APP_ORIGIN'
      )
      expect(() => resolveTrustedAuthOrigin('ftp://velvet.com.br', 'production')).toThrow(
        'INVALID_APP_ORIGIN'
      )
      expect(() => resolveTrustedAuthOrigin('http://evil.example', 'production')).toThrow(
        'INVALID_APP_ORIGIN'
      )
      expect(() => resolveTrustedAuthOrigin('http://evil.example', 'development')).toThrow(
        'INVALID_APP_ORIGIN'
      )
    })

    it('Case I: fails closed on credentials, non-root paths, query parameters, or hashes', () => {
      expect(() =>
        resolveTrustedAuthOrigin('https://user:pass@velvet.com.br', 'production')
      ).toThrow('INVALID_APP_ORIGIN')
      expect(() =>
        resolveTrustedAuthOrigin('https://velvet.com.br/path', 'production')
      ).toThrow('INVALID_APP_ORIGIN')
      expect(() =>
        resolveTrustedAuthOrigin('https://velvet.com.br?key=val', 'production')
      ).toThrow('INVALID_APP_ORIGIN')
      expect(() =>
        resolveTrustedAuthOrigin('https://velvet.com.br#section', 'production')
      ).toThrow('INVALID_APP_ORIGIN')
    })
  })

  describe('2. Unit: isSafeInternalRedirectPath Sanitization', () => {
    it('Case K: permits safe internal relative paths and query parameters', () => {
      expect(isSafeInternalRedirectPath('/cliente')).toBe(true)
      expect(isSafeInternalRedirectPath('/dashboard')).toBe(true)
      expect(isSafeInternalRedirectPath('/dashboard/billing')).toBe(true)
      expect(isSafeInternalRedirectPath('/onboarding?step=1')).toBe(true)
      expect(isSafeInternalRedirectPath('/perfil/fernanda-silva#contato')).toBe(true)
    })

    it('Case K: rejects protocol-relative, backslash, external, and malformed paths', () => {
      // Protocol-relative variants
      expect(isSafeInternalRedirectPath('//evil.example')).toBe(false)
      expect(isSafeInternalRedirectPath('//evil.example/login')).toBe(false)
      expect(isSafeInternalRedirectPath('///evil.example')).toBe(false)
      expect(isSafeInternalRedirectPath('/\\evil.example')).toBe(false)
      expect(isSafeInternalRedirectPath('\\evil.example')).toBe(false)
      expect(isSafeInternalRedirectPath('/foo\\bar')).toBe(false)

      // External absolute URLs
      expect(isSafeInternalRedirectPath('https://evil.example')).toBe(false)
      expect(isSafeInternalRedirectPath('http://evil.example')).toBe(false)
      expect(isSafeInternalRedirectPath('javascript:alert(1)')).toBe(false)

      // Control characters, empty, null, undefined
      expect(isSafeInternalRedirectPath('')).toBe(false)
      expect(isSafeInternalRedirectPath(null)).toBe(false)
      expect(isSafeInternalRedirectPath(undefined)).toBe(false)
      expect(isSafeInternalRedirectPath('   ')).toBe(false)
      expect(isSafeInternalRedirectPath('/evil\x00path')).toBe(false)
      expect(isSafeInternalRedirectPath('/evil\r\npath')).toBe(false)
    })
  })

  describe('3. Route Handler: Server-Authoritative Origin & Header Spoofing Defenses', () => {
    let mockSupabase: any
    let mockAdmin: any

    beforeEach(() => {
      vi.clearAllMocks()

      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
      ;(process.env as any).NODE_ENV = 'test'

      mockSupabase = {
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'auth-user-777' } } }),
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

    it('Case A: redirects to trusted configured origin under normal conditions', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'acc-normal',
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

    it('Case B: ignores attacker-controlled Host header and uses trusted origin', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'acc-client',
                role: 'CLIENT',
                status: 'ACTIVE',
                onboarding_status: 'COMPLETED',
                terms_version: '2026-08-17',
              },
            }),
          }
        }
      })

      const req = new NextRequest('http://evil-attacker.example:9999/auth/callback?code=valid-code', {
        headers: {
          host: 'evil-attacker.example:9999',
        },
      })
      const res = await GET(req)

      expect(res.status).toBe(307)
      const location = res.headers.get('location')
      expect(location).toBe('http://localhost:3000/cliente')
      expect(location).not.toContain('evil-attacker.example')
    })

    it('Case C: ignores attacker-controlled X-Forwarded-Host header', async () => {
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
                terms_version: '2026-08-17',
              },
            }),
          }
        }
      })

      const req = new NextRequest('http://localhost:3000/auth/callback?code=valid-code', {
        headers: {
          'x-forwarded-host': 'phishing-site.example',
          'x-forwarded-proto': 'https',
        },
      })
      const res = await GET(req)

      expect(res.status).toBe(307)
      const location = res.headers.get('location')
      expect(location).toBe('http://localhost:3000/dashboard')
      expect(location).not.toContain('phishing-site.example')
    })

    it('Case D: ignores attacker-controlled Forwarded header', async () => {
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
                onboarding_status: 'IN_PROGRESS',
                terms_version: '2026-08-17',
              },
            }),
          }
        }
      })

      const req = new NextRequest('http://localhost:3000/auth/callback?code=valid-code', {
        headers: {
          forwarded: 'for=192.0.2.60;proto=http;by=203.0.113.43;host=spoofed-host.example',
        },
      })
      const res = await GET(req)

      expect(res.status).toBe(307)
      const location = res.headers.get('location')
      expect(location).toBe('http://localhost:3000/onboarding')
      expect(location).not.toContain('spoofed-host.example')
    })

    it('Case E: CLIENT routing preserves safe nextParam on trusted origin, defaults to /cliente', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'acc-client',
                role: 'CLIENT',
                status: 'ACTIVE',
                onboarding_status: 'COMPLETED',
                terms_version: '2026-08-17',
              },
            }),
          }
        }
      })

      // Safe client path
      const reqWithSafe = new NextRequest('http://localhost:3000/auth/callback?code=valid-code&next=/perfil/mariana')
      const resWithSafe = await GET(reqWithSafe)
      expect(resWithSafe.headers.get('location')).toBe('http://localhost:3000/perfil/mariana')

      // Client forbidden path (/dashboard) safely falls back to /cliente
      const reqWithAdvPath = new NextRequest('http://localhost:3000/auth/callback?code=valid-code&next=/dashboard')
      const resWithAdvPath = await GET(reqWithAdvPath)
      expect(resWithAdvPath.headers.get('location')).toBe('http://localhost:3000/cliente')
    })

    it('Case F: ADVERTISER routing sends completed users to /dashboard and incomplete to /onboarding', async () => {
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
                terms_version: '2026-08-17',
              },
            }),
          }
        }
      })

      const req = new NextRequest('http://localhost:3000/auth/callback?code=valid-code')
      const res = await GET(req)
      expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard')
    })

    it('Case G: Suspended user redirect goes strictly to trusted origin /suspended', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'acc-suspended',
                role: 'ADVERTISER',
                status: 'SUSPENDED',
                onboarding_status: 'COMPLETED',
                terms_version: '2026-08-17',
              },
            }),
          }
        }
      })

      const req = new NextRequest('http://attacker.example/auth/callback?code=valid-code', {
        headers: { host: 'attacker.example' },
      })
      const res = await GET(req)
      expect(res.headers.get('location')).toBe('http://localhost:3000/suspended')
    })

    it('Case H: Auth error redirects go strictly to trusted origin /login?error=...', async () => {
      // Missing code
      const reqNoCode = new NextRequest('http://attacker.example/auth/callback', {
        headers: { host: 'attacker.example' },
      })
      const resNoCode = await GET(reqNoCode)
      expect(resNoCode.headers.get('location')).toBe('http://localhost:3000/login?error=confirmation_failed')

      // Provider error
      const reqProviderErr = new NextRequest('http://attacker.example/auth/callback?error=access_denied', {
        headers: { host: 'attacker.example' },
      })
      const resProviderErr = await GET(reqProviderErr)
      expect(resProviderErr.headers.get('location')).toBe('http://localhost:3000/login?error=oauth_error')

      // PKCE exchange error
      mockSupabase.auth.exchangeCodeForSession.mockResolvedValueOnce({
        error: { message: 'PKCE exchange failed' },
      })
      const reqPkceErr = new NextRequest('http://attacker.example/auth/callback?code=bad-code', {
        headers: { host: 'attacker.example' },
      })
      const resPkceErr = await GET(reqPkceErr)
      expect(resPkceErr.headers.get('location')).toBe('http://localhost:3000/login?error=oauth_failed')
    })

    it('Case I: Invalid configured APP_URL fails closed and throws rather than falling back to Host header', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'http://invalid-external.example'
      ;(process.env as any).NODE_ENV = 'production'

      const req = new NextRequest('http://attacker.example/auth/callback?code=valid-code', {
        headers: { host: 'attacker.example' },
      })

      await expect(GET(req)).rejects.toThrow('INVALID_APP_ORIGIN')
    })

    it('Case K: Protocol-relative or external target in nextParam is ignored and defaults to role landing', async () => {
      mockAdmin.from.mockImplementation((table: string) => {
        if (table === 'account_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'acc-client',
                role: 'CLIENT',
                status: 'ACTIVE',
                onboarding_status: 'COMPLETED',
                terms_version: '2026-08-17',
              },
            }),
          }
        }
      })

      const attackVectors = [
        '//evil.example',
        '//evil.example/malware',
        '/\\evil.example',
        '\\evil.example',
        'https://evil.example',
        'http://evil.example',
        'javascript:alert(1)',
      ]

      for (const vector of attackVectors) {
        const req = new NextRequest(
          `http://localhost:3000/auth/callback?code=valid-code&next=${encodeURIComponent(vector)}`
        )
        const res = await GET(req)
        expect(res.headers.get('location')).toBe('http://localhost:3000/cliente')
      }
    })
  })
})
