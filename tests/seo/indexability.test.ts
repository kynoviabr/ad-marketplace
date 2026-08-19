import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  isCityIndexable,
  isLocationIndexable,
  hasSearchFilters,
  getRobotsDirective,
} from '@/modules/seo/indexability'

describe('FASE 10 — Indexability Gates & Robots Directives', () => {
  const originalAppEnv = process.env.NEXT_PUBLIC_APP_ENV
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_ENV = 'production'
    process.env.NEXT_PUBLIC_APP_URL = 'https://admarketplace.com.br'
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_ENV = originalAppEnv
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
  })

  it('enforces MIN_CITY_PROFILES_FOR_INDEXING = 3 for city hub indexability (HD-SEO-4)', () => {
    expect(isCityIndexable(0)).toBe(false)
    expect(isCityIndexable(1)).toBe(false)
    expect(isCityIndexable(2)).toBe(false)
    expect(isCityIndexable(3)).toBe(true)
    expect(isCityIndexable(10)).toBe(true)
  })

  it('enforces MIN_LOCATION_PROFILES_FOR_INDEXING = 3 and approved location types (HD-SEO-5, HD-SEO-8)', () => {
    expect(isLocationIndexable(0, 'NEIGHBORHOOD')).toBe(false)
    expect(isLocationIndexable(1, 'NEIGHBORHOOD')).toBe(false)
    expect(isLocationIndexable(2, 'NEIGHBORHOOD')).toBe(false)
    expect(isLocationIndexable(3, 'NEIGHBORHOOD')).toBe(true)
    expect(isLocationIndexable(5, 'COMMERCIAL_DISTRICT')).toBe(true)
    // METRO_REGION is not indexable in MVP
    expect(isLocationIndexable(5, 'METRO_REGION')).toBe(false)
  })

  it('detects recognized search filter parameters correctly', () => {
    expect(hasSearchFilters(null)).toBe(false)
    expect(hasSearchFilters({})).toBe(false)
    expect(hasSearchFilters({ page: '2', utm_source: 'fb' })).toBe(false)
    expect(hasSearchFilters({ cabelo: 'loira' })).toBe(true)
    expect(hasSearchFilters({ idade_min: '20' })).toBe(true)
    expect(hasSearchFilters({ olhos: 'verdes' })).toBe(true)
    expect(hasSearchFilters({ corpo: 'magra' })).toBe(true)
    expect(hasSearchFilters({ tatuagens: 'true' })).toBe(true)
  })

  it('emits index: true, follow: true for eligible pure geographic Page 1 in production', () => {
    const robots = getRobotsDirective({
      isIndexable: true,
      hasFilters: false,
      page: 1,
      isProduction: true,
    })
    expect(robots).toEqual({ index: true, follow: true })
  })

  it('emits noindex, follow when search filters are present (prevents index explosion)', () => {
    const robots = getRobotsDirective({
      isIndexable: true,
      hasFilters: true,
      page: 1,
      isProduction: true,
    })
    expect(robots).toEqual({ index: false, follow: true })
  })

  it('emits noindex, follow for paginated Page 2+ (HD-SEO-7)', () => {
    const robots = getRobotsDirective({
      isIndexable: true,
      hasFilters: false,
      page: 2,
      isProduction: true,
    })
    expect(robots).toEqual({ index: false, follow: true })
  })

  it('emits noindex, follow for thin/empty geographic pages below threshold (HD-SEO-6)', () => {
    const robots = getRobotsDirective({
      isIndexable: false,
      hasFilters: false,
      page: 1,
      isProduction: true,
    })
    expect(robots).toEqual({ index: false, follow: true })
  })

  it('emits global noindex, nofollow in non-production environments', () => {
    const robots = getRobotsDirective({
      isIndexable: true,
      hasFilters: false,
      page: 1,
      isProduction: false,
    })
    expect(robots).toEqual({ index: false, follow: false })
  })
})
