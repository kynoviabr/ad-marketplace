import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib/i18n/catalog'
import { localizePathname } from '@/lib/i18n/routing'
import { isPublicNavigationItemActive } from '@/components/public/public-navigation-state'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const css = read('app/velvet-public.css')
const header = read('components/public/public-header.tsx')
const desktop = read('components/public/public-desktop-navigation.tsx')
const mobile = read('components/public/mobile-navigation.tsx')
const footer = read('components/public/public-footer.tsx')
const selector = read('components/i18n/language-selector.tsx')
const publicMessages = read('lib/i18n/messages/public.ts')
const publicChrome = [header, desktop, mobile, footer].join('\n')

describe('Velvet Design System v1 — R3 public chrome', () => {
  it('1. renders every touched wordmark as lowercase velvet. with a final period', () => {
    expect(header).toContain('velvet.')
    expect(mobile).toContain('velvet.')
    expect(footer).toContain('velvet.')
    expect(publicChrome).not.toMatch(/>\s*(?:Velvet|VELVET)\.?\s*</)
  })

  it('2. uses the canonical aubergine token for wordmarks on light surfaces', () => {
    expect(css).toMatch(/\.velvet-public-wordmark,[\s\S]*color:\s*var\(--color-brand\)/)
    expect(css).toMatch(/\.velvet-mobile-nav-wordmark\s*\{[^}]*color:\s*var\(--color-brand\)/)
  })

  it('3. uses an approved light wordmark on the dark footer', () => {
    expect(css).toMatch(/\.velvet-public-footer\s*\{[^}]*background:\s*var\(--color-brand-deep\)/)
    expect(css).toMatch(/\.velvet-public-footer \.velvet-public-wordmark\s*\{[^}]*color:\s*var\(--color-surface\)/)
  })

  it('4. gives desktop navigation the approved readable typography', () => {
    expect(css).toMatch(/\.velvet-public-header nav \.velvet-public-nav-link\s*\{[^}]*font-size:\s*var\(--text-navigation\)/)
    expect(css).toMatch(/\.velvet-public-header nav \.velvet-public-account-link,[\s\S]*font-size:\s*var\(--text-body-s\)/)
  })

  it('5. gives footer links and legal copy readable semantic sizes', () => {
    expect(css).toMatch(/\.velvet-public-footer-group > a,[\s\S]*font-size:\s*var\(--text-navigation\)/)
    expect(css).toMatch(/\.velvet-public-footer \.velvet-public-footer-legal small\s*\{[^}]*font-size:\s*var\(--text-label\)/)
  })

  it('6. preserves 44px minimum interactive targets', () => {
    expect(css).toMatch(/\.velvet-mobile-menu-trigger,[\s\S]*width:\s*44px;[\s\S]*height:\s*44px/)
    expect(css).toMatch(/\.velvet-public-header \.velvet-language-selector a,[\s\S]*min-height:\s*44px/)
  })

  it('7. removes the fake São Paulo dropdown affordance', () => {
    expect(header).not.toContain('⌄')
    expect(desktop).toContain('<span className="velvet-public-location-context">São Paulo</span>')
    expect(desktop).not.toMatch(/São Paulo[^\n]*button/)
  })

  it('8. derives aria-current from the logical public route', () => {
    expect(desktop).toContain('aria-current={isPublicNavigationItemActive')
    expect(isPublicNavigationItemActive('/', 'explore', false)).toBe(false)
    expect(isPublicNavigationItemActive('/sao-paulo', 'explore', false)).toBe(true)
    expect(isPublicNavigationItemActive('/en/perfil/bilu', 'explore', false)).toBe(true)
    expect(isPublicNavigationItemActive('/anuncie', 'advertise', false)).toBe(true)
  })

  it('9. supplies the approved PT-BR public navigation labels', () => {
    const t = createTranslator('pt-BR')
    expect([t('navigation.explore'), t('navigation.advertise'), t('navigation.login')]).toEqual(['Explorar', 'Anuncie', 'Entrar'])
  })

  it('10. supplies the approved English public navigation labels', () => {
    const t = createTranslator('en')
    expect([t('navigation.explore'), t('navigation.advertise'), t('navigation.login')]).toEqual(['Explore', 'Advertise', 'Sign in'])
  })

  it('11. implements a semantic modal mobile drawer', () => {
    expect(mobile).toContain('role="dialog"')
    expect(mobile).toContain('aria-modal="true"')
    expect(mobile).toContain('aria-expanded={isOpen}')
    expect(mobile).toContain('aria-controls="velvet-mobile-nav-drawer"')
  })

  it('12. implements a full Tab and Shift+Tab focus trap', () => {
    expect(mobile).toContain("event.key !== 'Tab'")
    expect(mobile).toContain('event.shiftKey && activeElement === first')
    expect(mobile).toContain('activeElement === last')
    expect(mobile).toContain('element.inert = true')
  })

  it('13. closes the drawer with Escape', () => {
    expect(mobile).toContain("event.key === 'Escape'")
    expect(mobile).toContain('closeDrawer()')
  })

  it('14. restores focus to the previously active menu trigger', () => {
    expect(mobile).toContain('returnFocusRef.current = document.activeElement')
    expect(mobile).toContain('returnFocusRef.current?.focus()')
  })

  it('15. preserves the logical route when switching locale', () => {
    expect(localizePathname('/perfil/bilu', 'en')).toBe('/en/perfil/bilu')
    expect(localizePathname('/en/perfil/bilu', 'pt-BR')).toBe('/perfil/bilu')
    expect(selector).toContain('localizePathname(pathname, nextLocale)')
  })

  it('16. preserves the current query string when switching locale', () => {
    expect(selector).toContain('const query = searchParams.toString()')
    expect(selector).toContain("`${localizedPath}${query ? `?${query}` : ''}`")
  })

  it('17. preserves verified account-state behavior', () => {
    expect(header).toContain('getPublicIsAuthenticated()')
    expect(desktop).toContain("isAuthenticated ? '/dashboard' : '/login'")
    expect(footer).toContain("isAuthenticated ? '/dashboard' : '/login'")
  })

  it('18. keeps every footer destination on an existing public route', () => {
    expect(footer).toContain("`${localized('/')}#sobre`")
    for (const route of ['/sao-paulo', '/anuncie', '/seguranca', '/termos', '/privacidade']) {
      expect(footer).toContain(`localized('${route}')`)
    }
  })

  it('19. does not invent routes in the R3 public chrome', () => {
    const pathLiterals = [...publicChrome.matchAll(/['"](\/(?!\/)[a-z][a-z0-9/.-]*)['"]/gi)].map((match) => match[1])
    const allowed = new Set(['/', '/en', '/sao-paulo', '/anuncie', '/dashboard', '/login', '/seguranca', '/termos', '/privacidade'])
    expect(pathLiterals.filter((path) => !allowed.has(path))).toEqual([])
  })

  it('20. leaves canonical and hreflang generation outside R3', () => {
    const metadata = read('modules/seo/metadata.ts')
    expect(metadata).toContain('alternates:')
    expect(metadata).toContain('languages:')
    expect(publicChrome).not.toContain('canonical')
    expect(publicChrome).not.toContain('hreflang')
  })

  it('21. leaves Home composition contracts in their existing components', () => {
    const home = read('app/(public)/page.tsx')
    expect(home).toContain('<HomeHero')
    expect(home).toContain('<PublicProfileGrid')
    expect(home).toContain('<HomeLocations')
    expect(home).toContain('<HomeTrustSection')
    expect(home).toContain('<HomeAcquisition')
  })

  it('22. keeps business, KYC and publication behavior out of R3 chrome', () => {
    expect(publicChrome).not.toMatch(/Didit|DIDIT|identity_verifications|publication_entitlements|professional_profiles/)
    expect(publicMessages).not.toMatch(/DIDIT_WEBHOOK_SECRET|SUPABASE_SERVICE_ROLE/)
  })
})
