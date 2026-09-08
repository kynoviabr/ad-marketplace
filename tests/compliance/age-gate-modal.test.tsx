import React, { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { I18nProvider } from '@/components/i18n/i18n-provider'
import { PublicComplianceLayer } from '@/components/compliance/public-compliance-layer'
import * as nextNavigation from 'next/navigation'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/'),
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}))

describe('Velvet 18+ Age Gate Modal & Cookie Policy Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(nextNavigation.usePathname).mockReturnValue('/')
  })

  function renderModal(
    props: { initialAgeAccepted: boolean; initialAnalyticsConsent: boolean | null },
    locale = 'pt-BR'
  ) {
    return renderToStaticMarkup(
      createElement(
        I18nProvider,
        { locale } as any,
        createElement(PublicComplianceLayer, props)
      )
    )
  }

  describe('1. Visual, Editorial & Brand Hierarchy', () => {
    it('renders the eyebrow, heading, and subtle aubergine "v" brand monogram in PT-BR', () => {
      const html = renderModal({ initialAgeAccepted: false, initialAnalyticsConsent: null }, 'pt-BR')

      expect(html).toContain('velvet-compliance-backdrop')
      expect(html).toContain('velvet-compliance-dialog')
      expect(html).toContain('velvet-age-gate-brand')
      expect(html).toContain('velvet-brand-monogram')
      expect(html).toContain('>v<')
      expect(html).toContain('VELVET · 18+')
      expect(html).toContain('Acesso exclusivo para adultos')
      expect(html).toContain('Este site apresenta perfis profissionais voltados ao público adulto')
    })

    it('renders the localized English content when locale is en', () => {
      const html = renderModal({ initialAgeAccepted: false, initialAnalyticsConsent: null }, 'en')

      expect(html).toContain('VELVET · 18+')
      expect(html).toContain('Adults only')
      expect(html).toContain('This website contains adult-oriented professional profiles')
    })
  })

  describe('2. Primary and Secondary Actions', () => {
    it('renders the primary confirmation CTA and secondary exit link', () => {
      const html = renderModal({ initialAgeAccepted: false, initialAnalyticsConsent: null }, 'pt-BR')

      expect(html).toContain('velvet-compliance-primary')
      expect(html).toContain('Tenho 18 anos ou mais')
      expect(html).toContain('velvet-compliance-secondary')
      expect(html).toContain('Sair')
      expect(html).toContain('href="/acesso-restrito"')
    })

    it('renders the localized actions in English', () => {
      const html = renderModal({ initialAgeAccepted: false, initialAnalyticsConsent: null }, 'en')

      expect(html).toContain('I am 18 or older')
      expect(html).toContain('Leave')
      expect(html).toContain('href="/en/access-restricted"')
    })
  })

  describe('3. Cookie Policy & Legal Support Links', () => {
    it('renders the legal support navigation with correct destinations on the 18+ modal', () => {
      const html = renderModal({ initialAgeAccepted: false, initialAnalyticsConsent: null }, 'pt-BR')

      expect(html).toContain('velvet-compliance-support-nav')
      expect(html).toContain('Política de Cookies')
      expect(html).toContain('href="/cookies"')
      expect(html).toContain('Termos')
      expect(html).toContain('href="/termos"')
      expect(html).toContain('Privacidade')
      expect(html).toContain('href="/privacidade"')
    })

    it('renders English destinations for legal support navigation when locale is en', () => {
      const html = renderModal({ initialAgeAccepted: false, initialAnalyticsConsent: null }, 'en')

      expect(html).toContain('Cookie Policy')
      expect(html).toContain('href="/en/cookies"')
      expect(html).toContain('Terms')
      expect(html).toContain('href="/en/terms"')
      expect(html).toContain('Privacy')
      expect(html).toContain('href="/en/privacy"')
    })

    it('renders the Cookie Policy link inside the consent choices view', () => {
      const html = renderModal({ initialAgeAccepted: true, initialAnalyticsConsent: null }, 'pt-BR')

      expect(html).toContain('velvet-compliance-policy')
      expect(html).toContain('Ler a Política de Cookies')
      expect(html).toContain('href="/cookies"')
    })
  })

  describe('4. Cookie Policy Navigation & Route Exclusion', () => {
    it('does NOT render the age gate modal when the user navigates to /cookies', () => {
      vi.mocked(nextNavigation.usePathname).mockReturnValue('/cookies')
      const html = renderModal({ initialAgeAccepted: false, initialAnalyticsConsent: null }, 'pt-BR')

      expect(html).toBe('')
    })

    it('does NOT render the modal when the user navigates to localized /en/cookies', () => {
      vi.mocked(nextNavigation.usePathname).mockReturnValue('/en/cookies')
      const html = renderModal({ initialAgeAccepted: false, initialAnalyticsConsent: null }, 'en')

      expect(html).toBe('')
    })

    it('does NOT render the modal on legal policy pages (/termos, /privacidade, /acesso-restrito)', () => {
      for (const route of ['/termos', '/privacidade', '/acesso-restrito', '/en/terms', '/en/privacy', '/en/access-restricted']) {
        vi.mocked(nextNavigation.usePathname).mockReturnValue(route)
        const html = renderModal({ initialAgeAccepted: false, initialAnalyticsConsent: null })
        expect(html).toBe('')
      }
    })

    it('DOES render the age gate modal on public content routes when age has not been confirmed', () => {
      for (const route of ['/', '/sao-paulo', '/sao-paulo/jardins', '/perfil/marina-sp-0']) {
        vi.mocked(nextNavigation.usePathname).mockReturnValue(route)
        const html = renderModal({ initialAgeAccepted: false, initialAnalyticsConsent: null })
        expect(html).toContain('Acesso exclusivo para adultos')
      }
    })
  })

  describe('5. Accessibility & Semantic Contracts', () => {
    it('includes role="dialog", aria-modal="true", and aria-labelledby pointing to the title', () => {
      const html = renderModal({ initialAgeAccepted: false, initialAnalyticsConsent: null }, 'pt-BR')

      expect(html).toContain('role="dialog"')
      expect(html).toContain('aria-modal="true"')
      expect(html).toContain('aria-labelledby="compliance-title"')
      expect(html).toContain('id="compliance-title"')
    })

    it('marks the brand monogram as aria-hidden for screen readers', () => {
      const html = renderModal({ initialAgeAccepted: false, initialAnalyticsConsent: null }, 'pt-BR')

      expect(html).toContain('class="velvet-age-gate-brand" aria-hidden="true"')
    })

    it('provides accessible navigation landmark with aria-label for support links', () => {
      const html = renderModal({ initialAgeAccepted: false, initialAnalyticsConsent: null }, 'pt-BR')

      expect(html).toContain('aria-label="Informações legais"')
    })
  })
})
