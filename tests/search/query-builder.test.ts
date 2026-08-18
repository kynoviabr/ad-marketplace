import { describe, it, expect } from 'vitest'
import { SearchQuerySchema, isReservedSlug } from '@/modules/search/schemas'

describe('Search Query Parameter Validation (Revised)', () => {
  it('identifies reserved route slugs correctly', () => {
    expect(isReservedSlug('login')).toBe(true)
    expect(isReservedSlug('signup')).toBe(true)
    expect(isReservedSlug('api')).toBe(true)
    expect(isReservedSlug('admin')).toBe(true)
    expect(isReservedSlug('sao-paulo')).toBe(false)
    expect(isReservedSlug('moema')).toBe(false)
  })

  it('parses valid search query parameters correctly', () => {
    const rawParams = {
      bairro: 'moema',
      idade_min: '21',
      idade_max: '30',
      altura_min: '165',
      altura_max: '180',
      cabelo: 'BRUNETTE',
      olhos: 'BROWN',
      corpo: 'SLIM',
      ordem: 'recommended',
      pagina: '1',
      limite: '20',
    }

    const parsed = SearchQuerySchema.safeParse(rawParams)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.bairro).toBe('moema')
      expect(parsed.data.idade_min).toBe(21)
      expect(parsed.data.idade_max).toBe(30)
      expect(parsed.data.altura_min).toBe(165)
      expect(parsed.data.cabelo).toEqual(['BRUNETTE'])
      expect(parsed.data.olhos).toEqual(['BROWN'])
      expect(parsed.data.ordem).toBe('recommended')
    }
  })

  it('parses array parameters for categorical filters', () => {
    const multiCabelo = {
      cabelo: ['BLONDE', 'BRUNETTE'],
      olhos: ['GREEN', 'BLUE'],
    }

    const parsed = SearchQuerySchema.safeParse(multiCabelo)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.cabelo).toEqual(['BLONDE', 'BRUNETTE'])
      expect(parsed.data.olhos).toEqual(['GREEN', 'BLUE'])
    }
  })

  it('rejects invalid enum values for hair or eye color', () => {
    expect(SearchQuerySchema.safeParse({ cabelo: 'NEON_PINK' }).success).toBe(false)
    expect(SearchQuerySchema.safeParse({ olhos: 'PURPLE' }).success).toBe(false)
  })

  it('enforces bounds on pagination limits', () => {
    const zeroPage = SearchQuerySchema.safeParse({ pagina: '0' })
    expect(zeroPage.success).toBe(false)

    const overLimit = SearchQuerySchema.safeParse({ limite: '100' })
    expect(overLimit.success).toBe(false)
  })
})
