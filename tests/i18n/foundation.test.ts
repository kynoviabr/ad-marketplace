import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_LOCALE, resolveLocale } from '@/lib/i18n/config'
import { localizePathname, localeFromPathname, stripLocalePrefix } from '@/lib/i18n/routing'
import { createTranslator, enMessages, ptBRMessages, resolveMessage } from '@/lib/i18n/catalog'
import { formatCurrency, formatDate, formatNumber } from '@/lib/i18n/format'
import { publicationReadinessDetail, verificationStatusLabel } from '@/lib/i18n/labels'
import { constructCityMetadata, constructProfileMetadata } from '@/modules/seo/metadata'

const root = process.cwd()
const source = (path: string) => readFileSync(join(root, path), 'utf8')
const city = { id: '1', state_id: '2', name: 'São Paulo', slug: 'sao-paulo', active: true, created_at: '2026-01-01' }

describe('Velvet PT-BR + EN foundation', () => {
  it('1. defaults deterministically to pt-BR', () => {
    expect(DEFAULT_LOCALE).toBe('pt-BR')
    expect(resolveLocale(undefined)).toBe('pt-BR')
  })

  it('2. resolves the English locale and catalog', () => {
    expect(resolveLocale('en')).toBe('en')
    expect(createTranslator('en')('navigation.explore')).toBe('Explore')
  })

  it('3. exposes an accessible language selector', () => {
    const file = source('components/i18n/language-selector.tsx')
    expect(file).toContain('aria-current')
    expect(file).toContain("t('common.language')")
  })

  it('4. preserves the logical destination when switching locale', () => {
    expect(localizePathname('/perfil/bilu-bilu', 'en')).toBe('/en/perfil/bilu-bilu')
    expect(localizePathname('/en/perfil/bilu-bilu', 'pt-BR')).toBe('/perfil/bilu-bilu')
    expect(source('components/i18n/language-selector.tsx')).toContain("href={destinationFor('en')}")
  })

  it('5. localizes the public Home without duplicating its route', () => {
    const hero = source('components/public/home-hero.tsx')
    expect(hero).toContain("t('home.heroTitle')")
    expect(localeFromPathname('/en')).toBe('en')
  })

  it('6. localizes public profile system UI in both languages', () => {
    expect(createTranslator('pt-BR')('profile.verifiedIdentity')).toBe('Identidade verificada')
    expect(createTranslator('en')('profile.verifiedIdentity')).toBe('Verified identity')
  })

  it('7. leaves professional-authored content untouched', () => {
    const profile = source('app/(public)/perfil/[slug]/page.tsx')
    expect(profile).toContain('createBioPresentation(profile.bio)')
    expect(profile).toContain('{bio.full}')
    expect(profile).not.toContain('translate(profile.bio')
  })

  it('8. localizes login primary UI', () => {
    expect(source('components/auth/login-form.tsx')).toContain("t('auth.welcomeBack')")
    expect(enMessages['auth.signIn']).toBe('Sign in')
  })

  it('9. localizes onboarding navigation and primary forms', () => {
    expect(source('components/onboarding/onboarding-shell.tsx')).toContain("t('onboarding.step.profile')")
    expect(source('components/onboarding/public-presentation-form.tsx')).toContain("t('profileForm.bio')")
  })

  it('10. maps KYC labels without changing canonical state', () => {
    expect(verificationStatusLabel('en', 'IN_REVIEW')).toBe('UNDER REVIEW')
    expect(verificationStatusLabel('pt-BR', 'IN_REVIEW')).toBe('EM ANÁLISE')
  })

  it('11. localizes the Admin KYC monitor', () => {
    expect(source('app/(admin)/admin/kyc/page.tsx')).toContain("t('admin.kycTitle')")
  })

  it('12. localizes the support contact view', () => {
    expect(source('app/(admin)/admin/professionals/[accountUserId]/page.tsx')).toContain("t('admin.openWhatsapp')")
  })

  it('13. localizes Founder entitlement management and dates', () => {
    const file = source('components/admin/founder-entitlement-manager.tsx')
    expect(file).toContain("t('admin.founderAccess')")
    expect(file).toContain('formatLocalizedDate')
  })

  it('14. keeps protected routes protected behind the proxy', () => {
    const proxy = source('proxy.ts')
    expect(proxy).toContain("const PROTECTED_ROUTES = ['/dashboard', '/suspended', '/onboarding']")
    expect(proxy).toContain('isProtectedRoute && !isAuthenticated')
  })

  it('15. keeps auth redirects locale-aware', () => {
    const proxy = source('proxy.ts')
    expect(proxy).toContain("localizePathname('/login', locale)")
    expect(proxy).toContain("localizePathname('/onboarding', locale)")
  })

  it('16. excludes the Didit/auth callback contract from locale routing', () => {
    expect(source('lib/i18n/routing.ts')).toContain("pathname.startsWith('/auth/callback')")
    expect(source('modules/verification/actions.ts')).toContain('/onboarding/verificacao')
  })

  it('17. preserves profile and publication route words/slugs', () => {
    expect(stripLocalePrefix('/en/perfil/bilu-bilu')).toBe('/perfil/bilu-bilu')
    expect(localizePathname('/onboarding/revisar', 'en')).toBe('/en/onboarding/revisar')
  })

  it('18. formats dates and numbers by locale', () => {
    expect(formatDate('2026-08-30T12:00:00Z', 'pt-BR', { timeZone: 'UTC' })).toBe('30/08/2026')
    expect(formatNumber(1234.5, 'en')).toBe('1,234.5')
  })

  it('19. formats BRL without converting currency', () => {
    expect(formatCurrency(99, 'pt-BR')).toContain('99,00')
    expect(formatCurrency(99, 'en')).toContain('99.00')
  })

  it('20. builds locale-specific canonical and hreflang metadata', () => {
    const meta = constructCityMetadata({ city, eligibleProfileCount: 4, hasFilters: false, page: 1, locale: 'en' })
    expect(meta.alternates?.canonical).toMatch(/\/en\/sao-paulo$/)
    expect(meta.alternates?.languages).toMatchObject({ 'pt-BR': expect.stringContaining('/sao-paulo'), en: expect.stringContaining('/en/sao-paulo') })
  })

  it('21. includes English alternates in the sitemap', () => {
    expect(source('app/sitemap.ts')).toContain("'pt-BR': e.url, en: englishUrl, 'x-default': e.url")
  })

  it('22. keeps private, admin and onboarding layouts non-indexable', () => {
    expect(source('app/(admin)/layout.tsx')).toContain('index: false')
    expect(source('app/(dashboard)/layout.tsx')).toContain('index: false')
    expect(source('app/(auth)/layout.tsx')).toContain('index: false')
  })

  it('23. falls back safely without exposing missing keys', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveMessage('en', 'missing.example')).toBe(ptBRMessages['common.notAvailable'])
    warn.mockRestore()
  })

  it('24. never mutates DB enum values while translating displays', () => {
    const meta = constructProfileMetadata({ stageName: 'Bilu', cityName: 'São Paulo', citySlug: 'sao-paulo', slug: 'bilu', locale: 'en' })
    expect(meta.title).toContain('Bilu in São Paulo')
    expect(source('lib/i18n/labels.ts')).toContain("IN_REVIEW: 'UNDER REVIEW'")
    expect(source('lib/i18n/labels.ts')).not.toContain('status =')
  })
})
