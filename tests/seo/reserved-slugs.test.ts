import { describe, it, expect } from 'vitest'
import { isReservedSlug, RESERVED_TOP_LEVEL_SLUGS } from '@/modules/seo/constants'

describe('FASE 10 — Reserved Slug & Route Collision Protection', () => {
  it('protects all critical application routes from dynamic city route collisions', () => {
    const criticalRoutes = [
      'admin',
      'api',
      'auth',
      'dashboard',
      'login',
      'signup',
      'onboarding',
      'perfil',
      'p',
      'profile',
      'complete-signup',
      'forgot-password',
      'reset-password',
      'suspended',
      'verify-email',
      'terms',
      'privacy',
      'robots.txt',
      'sitemap.xml',
    ]

    for (const route of criticalRoutes) {
      expect(isReservedSlug(route)).toBe(true)
      expect(RESERVED_TOP_LEVEL_SLUGS.has(route)).toBe(true)
    }
  })

  it('performs case-insensitive slug checking', () => {
    expect(isReservedSlug('ADMIN')).toBe(true)
    expect(isReservedSlug('Dashboard')).toBe(true)
    expect(isReservedSlug('  Perfil  ')).toBe(true)
  })

  it('allows valid geographic slugs', () => {
    expect(isReservedSlug('sao-paulo')).toBe(false)
    expect(isReservedSlug('moema')).toBe(false)
    expect(isReservedSlug('jardins')).toBe(false)
    expect(isReservedSlug('rio-de-janeiro')).toBe(false)
    expect(isReservedSlug('copacabana')).toBe(false)
  })

  it('handles null, undefined or empty strings safely', () => {
    // @ts-ignore
    expect(isReservedSlug(null)).toBe(false)
    // @ts-ignore
    expect(isReservedSlug(undefined)).toBe(false)
    expect(isReservedSlug('')).toBe(false)
  })
})
