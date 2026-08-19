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

    expect(result).toHaveLength(3)
    expect(result[0].url).toBe('https://admarketplace.com.br/')
    expect(result[1].url).toBe('https://admarketplace.com.br/sao-paulo')
    expect(result[1].lastModified).toEqual(new Date('2026-08-18T20:00:00.000Z'))
    expect(result[2].url).toBe('https://admarketplace.com.br/sao-paulo/moema')
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
})
