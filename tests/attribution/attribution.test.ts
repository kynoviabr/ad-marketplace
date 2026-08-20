import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock crypto module for testing
vi.mock('node:crypto', async () => {
  const actual = await vi.importActual<typeof import('node:crypto')>('node:crypto')
  return actual
})

describe('lib/attribution', () => {
  const originalEnv = { ...process.env }
  const VALID_SECRET = 'test-secret-that-is-long-enough-32chars'

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.ATTRIBUTION_SIGNING_SECRET = VALID_SECRET
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('isAttributionConfigured()', () => {
    it('returns true when secret is configured and >= 32 chars', async () => {
      const { isAttributionConfigured } = await import('@/lib/attribution')
      expect(isAttributionConfigured()).toBe(true)
    })

    it('returns false when secret is not configured', async () => {
      delete process.env.ATTRIBUTION_SIGNING_SECRET
      // Re-import to pick up env change
      vi.resetModules()
      const { isAttributionConfigured } = await import('@/lib/attribution')
      expect(isAttributionConfigured()).toBe(false)
    })

    it('returns false when secret is too short (< 32 chars)', async () => {
      process.env.ATTRIBUTION_SIGNING_SECRET = 'short'
      vi.resetModules()
      const { isAttributionConfigured } = await import('@/lib/attribution')
      expect(isAttributionConfigured()).toBe(false)
    })
  })

  describe('signAttributionToken() + verifyAttributionToken()', () => {
    it('signs a token and verifies it correctly', async () => {
      vi.resetModules()
      const { signAttributionToken, verifyAttributionToken } = await import('@/lib/attribution')
      const slug = 'profile-test-slug'
      const token = signAttributionToken(slug)
      expect(token).toContain(':')

      const result = verifyAttributionToken(token, slug)
      expect(result).not.toBeNull()
      expect(result?.slug).toBe(slug)
      expect(typeof result?.ts).toBe('number')
    })

    it('returns null when token has wrong slug', async () => {
      vi.resetModules()
      const { signAttributionToken, verifyAttributionToken } = await import('@/lib/attribution')
      const token = signAttributionToken('slug-a')
      const result = verifyAttributionToken(token, 'slug-b')
      expect(result).toBeNull()
    })

    it('returns null for a tampered token', async () => {
      vi.resetModules()
      const { signAttributionToken, verifyAttributionToken } = await import('@/lib/attribution')
      const token = signAttributionToken('my-slug')
      const [payload, sig] = token.split(':')
      const tampered = `${payload}:${sig.slice(0, -4)}XXXX`
      const result = verifyAttributionToken(tampered, 'my-slug')
      expect(result).toBeNull()
    })

    it('returns null for a token with invalid format', async () => {
      vi.resetModules()
      const { verifyAttributionToken } = await import('@/lib/attribution')
      expect(verifyAttributionToken('notavalidtoken', 'slug')).toBeNull()
      expect(verifyAttributionToken('', 'slug')).toBeNull()
    })

    it('returns null for an expired token', async () => {
      vi.resetModules()
      const { verifyAttributionToken } = await import('@/lib/attribution')
      // Manually craft an expired token (ts = 1 — epoch)
      const { createHmac } = await import('node:crypto')
      const payload = Buffer.from(JSON.stringify({ slug: 'test-slug', ts: 1 })).toString('base64url')
      const sig = createHmac('sha256', VALID_SECRET).update(payload).digest('base64url')
      const expiredToken = `${payload}:${sig}`
      const result = verifyAttributionToken(expiredToken, 'test-slug')
      expect(result).toBeNull()
    })

    it('throws when ATTRIBUTION_SIGNING_SECRET is not configured', async () => {
      delete process.env.ATTRIBUTION_SIGNING_SECRET
      vi.resetModules()
      const { signAttributionToken } = await import('@/lib/attribution')
      expect(() => signAttributionToken('any-slug')).toThrow(
        '[attribution] ATTRIBUTION_SIGNING_SECRET is not configured'
      )
    })
  })
})
