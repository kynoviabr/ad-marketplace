import { describe, it, expect } from 'vitest'
import { RESERVED_TOP_LEVEL_SLUGS, isReservedSlug } from '@/modules/seo/constants'

describe('RESERVED_TOP_LEVEL_SLUGS — FASE 12.2A', () => {
  describe('newly added public marketplace routes', () => {
    it('reserves "anuncie" (professional acquisition page)', () => {
      expect(RESERVED_TOP_LEVEL_SLUGS.has('anuncie')).toBe(true)
    })

    it('reserves "go" (WhatsApp conversion Route Handler)', () => {
      expect(RESERVED_TOP_LEVEL_SLUGS.has('go')).toBe(true)
    })
  })

  describe('isReservedSlug() with marketplace routes', () => {
    it('returns true for "anuncie"', () => {
      expect(isReservedSlug('anuncie')).toBe(true)
    })

    it('returns true for "go"', () => {
      expect(isReservedSlug('go')).toBe(true)
    })

    it('is case-insensitive for "ANUNCIE"', () => {
      expect(isReservedSlug('ANUNCIE')).toBe(true)
    })

    it('is case-insensitive for "GO"', () => {
      expect(isReservedSlug('GO')).toBe(true)
    })
  })

  describe('existing reserved slugs preserved', () => {
    const existing = ['admin', 'api', 'auth', 'dashboard', 'login', 'signup', 'perfil']
    it.each(existing)('still reserves "%s"', (slug) => {
      expect(RESERVED_TOP_LEVEL_SLUGS.has(slug)).toBe(true)
    })
  })

  describe('city/bairro slugs NOT reserved (regression guard)', () => {
    const citySlugs = ['sao-paulo', 'moema', 'itaim-bibi', 'jardins', 'pinheiros']
    it.each(citySlugs)('does NOT reserve city/bairro slug "%s"', (slug) => {
      expect(RESERVED_TOP_LEVEL_SLUGS.has(slug)).toBe(false)
      expect(isReservedSlug(slug)).toBe(false)
    })
  })
})
