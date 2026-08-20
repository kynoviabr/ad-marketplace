import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('lib/brand — getMarketplaceName()', () => {
  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as any).__brandWarned = false
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    ;(globalThis as any).__brandWarned = false
  })

  it('returns the configured MARKETPLACE_NAME when set', async () => {
    vi.stubEnv('MARKETPLACE_NAME', 'MeuMarketplace')
    const { getMarketplaceName } = await import('@/lib/brand')
    expect(getMarketplaceName()).toBe('MeuMarketplace')
  })

  it('trims whitespace from MARKETPLACE_NAME', async () => {
    vi.stubEnv('MARKETPLACE_NAME', '  BrandName  ')
    const { getMarketplaceName } = await import('@/lib/brand')
    expect(getMarketplaceName()).toBe('BrandName')
  })

  it('returns placeholder in development when MARKETPLACE_NAME is not set', async () => {
    vi.stubEnv('MARKETPLACE_NAME', '')
    vi.stubEnv('NODE_ENV', 'development')
    const { getMarketplaceName } = await import('@/lib/brand')
    expect(getMarketplaceName()).toBe('Marketplace')
  })

  it('throws in production when MARKETPLACE_NAME is not configured', async () => {
    vi.stubEnv('MARKETPLACE_NAME', '')
    vi.stubEnv('NODE_ENV', 'production')
    const { getMarketplaceName } = await import('@/lib/brand')
    expect(() => getMarketplaceName()).toThrow(
      '[brand] MARKETPLACE_NAME environment variable is required in production'
    )
  })

  it('throws in production when MARKETPLACE_NAME is only whitespace', async () => {
    vi.stubEnv('MARKETPLACE_NAME', '   ')
    vi.stubEnv('NODE_ENV', 'production')
    const { getMarketplaceName } = await import('@/lib/brand')
    expect(() => getMarketplaceName()).toThrow(
      '[brand] MARKETPLACE_NAME environment variable is required in production'
    )
  })

  it('returns configured name in production without throwing when set', async () => {
    vi.stubEnv('MARKETPLACE_NAME', 'ProducaoMarca')
    vi.stubEnv('NODE_ENV', 'production')
    const { getMarketplaceName } = await import('@/lib/brand')
    expect(getMarketplaceName()).toBe('ProducaoMarca')
  })
})
