import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildCanonicalUrl } from '@/modules/seo/canonical'

describe('FASE 10 — Canonical URL Strategy & Pagination Normalization', () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://admarketplace.com.br'
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
  })

  it('generates clean canonical for city landing page', () => {
    const canonical = buildCanonicalUrl('/sao-paulo')
    expect(canonical).toBe('https://admarketplace.com.br/sao-paulo')
  })

  it('generates clean canonical for location landing page', () => {
    const canonical = buildCanonicalUrl('/sao-paulo/moema')
    expect(canonical).toBe('https://admarketplace.com.br/sao-paulo/moema')
  })

  it('normalizes page=1 to clean base path (no ?page=1 in canonical)', () => {
    const canonical = buildCanonicalUrl('/sao-paulo', { page: '1' })
    expect(canonical).toBe('https://admarketplace.com.br/sao-paulo')
  })

  it('generates self-referencing canonical for page=2 preserving ?page=2', () => {
    const canonical = buildCanonicalUrl('/sao-paulo', { page: '2' })
    expect(canonical).toBe('https://admarketplace.com.br/sao-paulo?page=2')
  })

  it('generates self-referencing canonical for page=3 preserving ?page=3', () => {
    const canonical = buildCanonicalUrl('/sao-paulo/moema', { page: '3' })
    expect(canonical).toBe('https://admarketplace.com.br/sao-paulo/moema?page=3')
  })

  it('strips tracking query parameters (utm_source, gclid, etc.) from canonical', () => {
    const canonical = buildCanonicalUrl('/sao-paulo', {
      page: '3',
      utm_source: 'instagram',
      utm_medium: 'cpc',
      gclid: 'xyz123',
    })
    expect(canonical).toBe('https://admarketplace.com.br/sao-paulo?page=3')
  })

  it('strips search filter query parameters from canonical URL', () => {
    const canonical = buildCanonicalUrl('/sao-paulo', {
      page: '2',
      cabelo: 'loira',
      olhos: 'verdes',
      idade_min: '20',
    })
    expect(canonical).toBe('https://admarketplace.com.br/sao-paulo?page=2')
  })

  it('strips trailing slashes from path when constructing canonical', () => {
    const canonical = buildCanonicalUrl('/sao-paulo/')
    expect(canonical).toBe('https://admarketplace.com.br/sao-paulo')
  })
})
