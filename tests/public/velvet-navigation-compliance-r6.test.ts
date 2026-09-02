import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { localizePathname, stripLocalePrefix } from '@/lib/i18n/routing'
import { CONSENT_VERSION, parseConsent } from '@/lib/compliance/consent'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

describe('Velvet R6 public navigation and compliance', () => {
  it('maps every institutional route to a natural PT/EN destination', () => {
    const routes = [
      ['/sobre', '/en/about'], ['/como-funciona', '/en/how-it-works'],
      ['/seguranca', '/en/safety'], ['/termos', '/en/terms'],
      ['/privacidade', '/en/privacy'], ['/cookies', '/en/cookies'],
    ] as const
    for (const [pt, en] of routes) {
      expect(localizePathname(pt, 'en')).toBe(en)
      expect(stripLocalePrefix(en)).toBe(pt)
    }
  })

  it('keeps the footer free of placeholder anchors and exposes preference controls', () => {
    const footer = read('components/public/public-footer.tsx')
    expect(footer).not.toContain('#sobre')
    expect(footer).toContain("localized('/sobre')")
    expect(footer).toContain("localized('/como-funciona')")
    expect(footer).toContain("localized('/cookies')")
    expect(footer).toContain('CookiePreferencesButton')
  })

  it('provides versioned age and cookie choices without a marketing claim', () => {
    const layer = read('components/compliance/public-compliance-layer.tsx')
    expect(layer).toContain('confirmed-v1')
    expect(layer).toContain('Necessary only')
    expect(layer).toContain('Not currently used.')
    expect(layer).toContain('velvet:open-cookie-preferences')
    expect(layer).toContain("setAttribute('inert', '')")
    expect(layer).toContain("setAttribute('aria-hidden', 'true')")
  })

  it('parses only the current consent version and pins necessary/marketing invariants', () => {
    const value = encodeURIComponent(JSON.stringify({ version: CONSENT_VERSION, analytics: true, necessary: false, marketing: true, updatedAt: 'now' }))
    expect(parseConsent(value)).toEqual({ version: CONSENT_VERSION, analytics: true, necessary: true, marketing: false, updatedAt: 'now' })
    expect(parseConsent(encodeURIComponent(JSON.stringify({ version: 'old', analytics: true })))).toBeNull()
  })

  it('gates client ingestion, server search measurement and visitor IDs on consent', () => {
    expect(read('components/analytics/session.ts')).toContain('hasAnalyticsConsent()')
    expect(read('app/api/analytics/events/route.ts')).toContain('parseConsent(req.cookies.get(CONSENT_COOKIE)?.value)?.analytics')
    expect(read('app/[city]/page.tsx')).toContain('!analyticsAllowed')
    expect(read('app/[city]/[neighborhood]/page.tsx')).toContain('!analyticsAllowed')
  })

  it('contains all required public pages and a non-adult exit destination', () => {
    for (const path of ['sobre', 'como-funciona', 'cookies', 'seguranca', 'termos', 'privacidade']) {
      expect(read(`app/(public)/${path}/page.tsx`)).toBeTruthy()
    }
    expect(read('app/acesso-restrito/page.tsx')).toContain('Acesso restrito')
  })
})
