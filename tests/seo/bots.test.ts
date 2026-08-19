import { describe, it, expect } from 'vitest'
import { isSearchCrawler } from '@/modules/seo/bots'

describe('FASE 10 — Search Crawler Detection (Analytics Preservation)', () => {
  it('detects major search engine crawlers', () => {
    expect(isSearchCrawler('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true)
    expect(isSearchCrawler('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true)
    expect(isSearchCrawler('Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)')).toBe(true)
    expect(isSearchCrawler('DuckDuckBot/1.0; (+http://duckduckgo.com/duckduckbot.html)')).toBe(true)
    expect(isSearchCrawler('Baiduspider+(+http://www.baidu.com/search/spider.htm)')).toBe(true)
    expect(isSearchCrawler('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')).toBe(true)
    expect(isSearchCrawler('Twitterbot/1.0')).toBe(true)
    expect(isSearchCrawler('WhatsApp/2.21.12.21 A')).toBe(true)
  })

  it('returns false for regular human browser User-Agents', () => {
    expect(
      isSearchCrawler(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )
    ).toBe(false)
    expect(
      isSearchCrawler(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
      )
    ).toBe(false)
    expect(
      isSearchCrawler(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
      )
    ).toBe(false)
  })

  it('returns false for null, undefined or empty string', () => {
    expect(isSearchCrawler(null)).toBe(false)
    expect(isSearchCrawler(undefined)).toBe(false)
    expect(isSearchCrawler('')).toBe(false)
    expect(isSearchCrawler('   ')).toBe(false)
  })
})
