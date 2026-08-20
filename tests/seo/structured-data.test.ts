import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  generateWebsiteJsonLd,
  generateBreadcrumbJsonLd,
  generateProfileJsonLd,
} from '@/modules/seo/structured-data'

describe('FASE 10 — Schema.org JSON-LD Structured Data Generators', () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
  const originalMarketplaceName = process.env.MARKETPLACE_NAME

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://admarketplace.com.br'
    process.env.MARKETPLACE_NAME = 'AD-Marketplace'
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
    if (originalMarketplaceName === undefined) {
      delete process.env.MARKETPLACE_NAME
    } else {
      process.env.MARKETPLACE_NAME = originalMarketplaceName
    }
  })

  it('generates valid WebSite structured data', () => {
    const jsonLd = generateWebsiteJsonLd() as any

    expect(jsonLd['@context']).toBe('https://schema.org')
    expect(jsonLd['@type']).toBe('WebSite')
    expect(jsonLd.name).toBe('AD-Marketplace')
    expect(jsonLd.url).toBe('https://admarketplace.com.br')
  })

  it('generates valid BreadcrumbList structured data', () => {
    const breadcrumbs = [
      { name: 'Home', url: 'https://admarketplace.com.br/' },
      { name: 'São Paulo', url: 'https://admarketplace.com.br/sao-paulo' },
      { name: 'Moema', url: 'https://admarketplace.com.br/sao-paulo/moema' },
    ]

    const jsonLd = generateBreadcrumbJsonLd(breadcrumbs) as any

    expect(jsonLd['@context']).toBe('https://schema.org')
    expect(jsonLd['@type']).toBe('BreadcrumbList')
    expect(jsonLd.itemListElement).toHaveLength(3)
    expect(jsonLd.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://admarketplace.com.br/',
    })
    expect(jsonLd.itemListElement[2]).toEqual({
      '@type': 'ListItem',
      position: 3,
      name: 'Moema',
      item: 'https://admarketplace.com.br/sao-paulo/moema',
    })
  })

  it('generates valid ProfilePage contract structured data without fabricated reviews/ratings', () => {
    const jsonLd = generateProfileJsonLd({
      stageName: 'Juliana',
      headline: 'Acompanhante em Moema',
      cityName: 'São Paulo',
      citySlug: 'sao-paulo',
      slug: 'juliana-moema',
      primaryMediaUrl: 'https://cdn.admarketplace.com.br/approved/juliana.webp',
    }) as any

    expect(jsonLd['@context']).toBe('https://schema.org')
    expect(jsonLd['@type']).toBe('ProfilePage')
    expect(jsonLd.mainEntity['@type']).toBe('Person')
    expect(jsonLd.mainEntity.name).toBe('Juliana')
    expect(jsonLd.mainEntity.description).toBe('Acompanhante em Moema')
    expect(jsonLd.mainEntity.url).toBe('https://admarketplace.com.br/perfil/juliana-moema')
    expect(jsonLd.mainEntity.image).toBe('https://cdn.admarketplace.com.br/approved/juliana.webp')

    // Hard Invariant: Zero spam
    expect(jsonLd.aggregateRating).toBeUndefined()
    expect(jsonLd.review).toBeUndefined()
    expect(jsonLd.offers).toBeUndefined()
  })
})
