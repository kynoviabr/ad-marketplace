import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  constructCityMetadata,
  constructLocationMetadata,
  constructProfileMetadata,
  constructRootMetadata,
} from '@/modules/seo/metadata'
import type { City, MarketplaceLocation } from '@/modules/locations/types'

describe('FASE 10 — Next.js Metadata Construction & OG Media Fail-Closed', () => {
  const originalAppEnv = process.env.NEXT_PUBLIC_APP_ENV
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
  const originalMarketplaceName = process.env.MARKETPLACE_NAME

  const mockCity: City = {
    id: '11111111-1111-4111-a111-111111111111',
    state_id: '22222222-2222-4222-a222-222222222222',
    name: 'São Paulo',
    slug: 'sao-paulo',
    active: true,
    created_at: new Date().toISOString(),
  }

  const mockLocation: MarketplaceLocation = {
    id: '33333333-3333-4333-a333-333333333333',
    city_id: mockCity.id,
    name: 'Moema',
    slug: 'moema',
    zone: 'Zona Sul',
    location_type: 'NEIGHBORHOOD',
    display_order: 1,
    active: true,
    created_at: new Date().toISOString(),
  }

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_ENV = 'production'
    process.env.NEXT_PUBLIC_APP_URL = 'https://admarketplace.com.br'
    process.env.MARKETPLACE_NAME = 'AD-Marketplace'
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_ENV = originalAppEnv
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
    if (originalMarketplaceName === undefined) {
      delete process.env.MARKETPLACE_NAME
    } else {
      process.env.MARKETPLACE_NAME = originalMarketplaceName
    }
  })

  it('constructs complete metadata for city landing page', () => {
    const meta = constructCityMetadata({
      city: mockCity,
      eligibleProfileCount: 5,
      hasFilters: false,
      page: 1,
    })

    expect(meta.title).toBe('Acompanhantes em São Paulo - SP | AD-Marketplace')
    expect(meta.description).toContain('Encontre acompanhantes verificadas (18+) em São Paulo')
    expect(meta.alternates?.canonical).toBe('https://admarketplace.com.br/sao-paulo')
    expect(meta.robots).toEqual({ index: true, follow: true })
    expect(meta.openGraph?.title).toBe('Acompanhantes em São Paulo - SP | AD-Marketplace')
    expect(meta.openGraph?.url).toBe('https://admarketplace.com.br/sao-paulo')
  })

  it('constructs complete metadata for neighborhood landing page', () => {
    const meta = constructLocationMetadata({
      city: mockCity,
      location: mockLocation,
      eligibleProfileCount: 4,
      hasFilters: false,
      page: 1,
    })

    expect(meta.title).toBe('Acompanhantes em Moema, São Paulo | AD-Marketplace')
    expect(meta.description).toContain('Moema, São Paulo')
    expect(meta.alternates?.canonical).toBe('https://admarketplace.com.br/sao-paulo/moema')
    expect(meta.robots).toEqual({ index: true, follow: true })
    expect(meta.openGraph?.title).toBe('Acompanhantes em Moema, São Paulo | AD-Marketplace')
  })

  it('constructs profile metadata contract with /perfil/[slug] canonical (HD-SEO-2)', () => {
    const meta = constructProfileMetadata({
      stageName: 'Juliana',
      headline: 'Acompanhante de luxo em Moema',
      cityName: 'São Paulo',
      citySlug: 'sao-paulo',
      slug: 'juliana-moema',
      primaryMediaUrl: null, // Fail-closed when no stable approved derivative URL is available
    })

    expect(meta.title).toBe('Juliana em São Paulo | AD-Marketplace')
    expect(meta.description).toBe('Acompanhante de luxo em Moema')
    expect(meta.alternates?.canonical).toBe('https://admarketplace.com.br/perfil/juliana-moema')
    expect(meta.openGraph?.images).toBeUndefined() // Fails closed
  })

  it('includes og:image when stable approved media URL is provided', () => {
    const meta = constructProfileMetadata({
      stageName: 'Juliana',
      headline: 'Acompanhante de luxo em Moema',
      cityName: 'São Paulo',
      citySlug: 'sao-paulo',
      slug: 'juliana-moema',
      primaryMediaUrl: 'https://cdn.admarketplace.com.br/approved/juliana.webp',
    })

    expect(meta.openGraph?.images).toEqual([
      { url: 'https://cdn.admarketplace.com.br/approved/juliana.webp', alt: 'Foto de Juliana' },
    ])
  })

  it('constructs root metadata allowing child routes in production and blocking in dev', () => {
    // Production
    const prodMeta = constructRootMetadata()
    expect(prodMeta.robots).toBeUndefined() // Allows child pages to set their own index/follow

    // Development
    process.env.NEXT_PUBLIC_APP_ENV = 'development'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    const devMeta = constructRootMetadata()
    expect(devMeta.robots).toEqual({ index: false, follow: false })
  })
})
