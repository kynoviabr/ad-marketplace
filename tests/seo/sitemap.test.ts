import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import sitemap from '@/app/sitemap'
import * as seoDal from '@/modules/seo/dal'
import type { SitemapEntryDTO } from '@/modules/seo/types'

describe('FASE 10 — Dynamic sitemap.xml Architecture & Invariants', () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://admarketplace.com.br'
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
    vi.restoreAllMocks()
  })

  it('generates sitemap containing Home, eligible cities and eligible locations', async () => {
    const mockEntries: SitemapEntryDTO[] = [
      { url: 'https://admarketplace.com.br/', changeFrequency: 'daily', priority: 1.0 },
      {
        url: 'https://admarketplace.com.br/sao-paulo',
        lastModified: '2026-08-18T20:00:00.000Z',
        changeFrequency: 'daily',
        priority: 0.9,
      },
      {
        url: 'https://admarketplace.com.br/sao-paulo/moema',
        lastModified: '2026-08-18T19:30:00.000Z',
        changeFrequency: 'daily',
        priority: 0.8,
      },
    ]

    vi.spyOn(seoDal, 'getSitemapData').mockResolvedValue(mockEntries)

    const result = await sitemap()

    expect(result).toHaveLength(9)
    expect(result[0].url).toBe('https://admarketplace.com.br/')
    const city = result.find((entry) => entry.url === 'https://admarketplace.com.br/sao-paulo')
    expect(city?.lastModified).toEqual(new Date('2026-08-18T20:00:00.000Z'))
    expect(result.some((entry) => entry.url === 'https://admarketplace.com.br/sao-paulo/moema')).toBe(true)
  })

  it('strictly excludes /perfil/[slug] URLs from FASE 10 sitemap (FASE 12 Scope)', async () => {
    const mockEntries: SitemapEntryDTO[] = [
      { url: 'https://admarketplace.com.br/', priority: 1.0 },
      { url: 'https://admarketplace.com.br/sao-paulo', priority: 0.9 },
    ]

    vi.spyOn(seoDal, 'getSitemapData').mockResolvedValue(mockEntries)

    const result = await sitemap()
    const profileUrls = result.filter((e) => e.url.includes('/perfil/'))
    expect(profileUrls).toHaveLength(0)
  })

  it('strictly excludes URLs with query parameters (filters or pagination) from sitemap', async () => {
    const mockEntries: SitemapEntryDTO[] = [
      { url: 'https://admarketplace.com.br/', priority: 1.0 },
      { url: 'https://admarketplace.com.br/sao-paulo', priority: 0.9 },
    ]

    vi.spyOn(seoDal, 'getSitemapData').mockResolvedValue(mockEntries)

    const result = await sitemap()
    const queryParamUrls = result.filter((e) => e.url.includes('?'))
    expect(queryParamUrls).toHaveLength(0)
  })

  it('publishes institutional PT/EN routes when dynamic data is unavailable', async () => {
    vi.spyOn(seoDal, 'getSitemapData').mockRejectedValue(new Error('missing preview service role'))
    const result = await sitemap()
    expect(result.map((entry) => entry.url)).toEqual(expect.arrayContaining([
      'https://admarketplace.com.br/',
      'https://admarketplace.com.br/sobre',
      'https://admarketplace.com.br/como-funciona',
      'https://admarketplace.com.br/seguranca',
      'https://admarketplace.com.br/termos',
      'https://admarketplace.com.br/privacidade',
      'https://admarketplace.com.br/cookies',
    ]))
    const terms = result.find((entry) => entry.url.endsWith('/termos'))
    expect(terms?.alternates?.languages?.en).toBe('https://admarketplace.com.br/en/terms')
  })
})
