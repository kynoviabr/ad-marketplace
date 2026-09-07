import React, { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { I18nProvider } from '@/components/i18n/i18n-provider'
import { VelvetAppBottomNav } from '@/components/pwa/velvet-app-bottom-nav'
import { VelvetAppMoreSheet } from '@/components/pwa/velvet-app-more-sheet'
import { VelvetAppTopBar } from '@/components/pwa/velvet-app-top-bar'
import { VelvetAppShell } from '@/components/pwa/velvet-app-shell'
import AppLauncherPage from '@/app/app/page'
import * as authDal from '@/modules/auth/dal'
import * as moderationGuards from '@/modules/moderation/guards'
import * as nextNavigation from 'next/navigation'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/dashboard'),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  redirect: vi.fn((url: string) => {
    const error = new Error(`NEXT_REDIRECT: ${url}`)
    ;(error as any).digest = `NEXT_REDIRECT;replace;${url};307;;`
    throw error
  }),
}))

describe('PX4.7 — Velvet App Mode Experience & Standalone Shell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderWithI18n(component: React.ReactElement, locale = 'pt-BR') {
    return renderToStaticMarkup(
      createElement(I18nProvider, { locale } as any, component)
    )
  }

  describe('1. Advertiser Bottom Navigation (Sections 12 & 18)', () => {
    it('renders the 5 canonical advertiser destinations with icons and labels in PT-BR', () => {
      vi.mocked(nextNavigation.usePathname).mockReturnValue('/dashboard')
      const markup = renderWithI18n(createElement(VelvetAppBottomNav, { role: 'ADVERTISER' }), 'pt-BR')

      expect(markup).toContain('velvet-app-bottom-nav')
      expect(markup).toContain('velvet-app-only')
      expect(markup).toContain('Início')
      expect(markup).toContain('Analytics')
      expect(markup).toContain('Agenda')
      expect(markup).toContain('Concierge')
      expect(markup).toContain('Mais')
      expect(markup).toContain('href="/dashboard"')
      expect(markup).toContain('href="/dashboard/analytics"')
      expect(markup).toContain('href="/dashboard/availability"')
      expect(markup).toContain('href="/dashboard/concierge"')
    })

    it('renders the 5 canonical advertiser destinations in English', () => {
      vi.mocked(nextNavigation.usePathname).mockReturnValue('/dashboard')
      const markup = renderWithI18n(createElement(VelvetAppBottomNav, { role: 'ADVERTISER' }), 'en')

      expect(markup).toContain('Home')
      expect(markup).toContain('Analytics')
      expect(markup).toContain('Availability')
      expect(markup).toContain('Concierge')
      expect(markup).toContain('More')
    })

    it('sets aria-current="page" on the active tab based on nested pathname', () => {
      // Home
      vi.mocked(nextNavigation.usePathname).mockReturnValue('/dashboard')
      let markup = renderWithI18n(createElement(VelvetAppBottomNav, { role: 'ADVERTISER' }))
      expect(markup).toContain('aria-current="page"')
      expect(markup).toContain('is-active')
      expect(markup).toContain('href="/dashboard"')

      // Analytics
      vi.mocked(nextNavigation.usePathname).mockReturnValue('/dashboard/analytics')
      markup = renderWithI18n(createElement(VelvetAppBottomNav, { role: 'ADVERTISER' }))
      expect(markup).toContain('class="velvet-app-nav-item is-active" aria-current="page" href="/dashboard/analytics"')

      // Availability
      vi.mocked(nextNavigation.usePathname).mockReturnValue('/dashboard/availability')
      markup = renderWithI18n(createElement(VelvetAppBottomNav, { role: 'ADVERTISER' }))
      expect(markup).toContain('class="velvet-app-nav-item is-active" aria-current="page" href="/dashboard/availability"')

      // Concierge
      vi.mocked(nextNavigation.usePathname).mockReturnValue('/dashboard/concierge')
      markup = renderWithI18n(createElement(VelvetAppBottomNav, { role: 'ADVERTISER' }))
      expect(markup).toContain('class="velvet-app-nav-item is-active" aria-current="page" href="/dashboard/concierge"')
    })

    it('highlights "Mais" tab when navigating secondary advertiser routes', () => {
      vi.mocked(nextNavigation.usePathname).mockReturnValue('/dashboard/photos')
      const markup = renderWithI18n(createElement(VelvetAppBottomNav, { role: 'ADVERTISER' }))

      expect(markup).toContain('class="velvet-app-nav-item is-active"')
      expect(markup).toContain('Mais')
    })

    it('does not render bottom nav for ADMIN role', () => {
      const markup = renderWithI18n(createElement(VelvetAppBottomNav, { role: 'ADMIN' }))
      expect(markup).toBe('')
    })
  })

  describe('2. Client Bottom Navigation (Section 14)', () => {
    it('renders the 4 canonical client destinations from existing features', () => {
      vi.mocked(nextNavigation.usePathname).mockReturnValue('/cliente')
      const markup = renderWithI18n(createElement(VelvetAppBottomNav, { role: 'CLIENT' }), 'pt-BR')

      expect(markup).toContain('velvet-app-bottom-nav')
      expect(markup).toContain('Explorar')
      expect(markup).toContain('Buscar')
      expect(markup).toContain('Conta')
      expect(markup).toContain('Mais')
      expect(markup).toContain('href="/"')
      expect(markup).toContain('href="/sao-paulo"')
      expect(markup).toContain('href="/cliente"')

      // Zero fabricated features like "Favoritos"
      expect(markup).not.toContain('Favoritos')
      expect(markup).not.toContain('Favorites')
    })
  })

  describe('3. Advertiser More Sheet (Section 13)', () => {
    it('renders only existing real features and safe exit without fake features', () => {
      const markup = renderWithI18n(
        createElement(VelvetAppMoreSheet, { isOpen: true, onClose: vi.fn(), role: 'ADVERTISER' })
      )

      expect(markup).toContain('role="dialog"')
      expect(markup).toContain('aria-modal="true"')
      expect(markup).toContain('Meu perfil')
      expect(markup).toContain('Fotos &amp; Mídia')
      expect(markup).toContain('Bairros onde atende')
      expect(markup).toContain('Verificação de identidade')
      expect(markup).toContain('Avaliações')
      expect(markup).toContain('Plano &amp; Faturamento')
      expect(markup).toContain('Destaques &amp; Visibilidade')
      expect(markup).toContain('Central de Ajuda')
      expect(markup).toContain('Sair da conta')

      // Never shows "Instalar Velvet" inside installed App Mode
      expect(markup).not.toContain('Instalar Velvet')
      expect(markup).not.toContain('Install Velvet')
    })

    it('returns null when isOpen is false', () => {
      const markup = renderWithI18n(
        createElement(VelvetAppMoreSheet, { isOpen: false, onClose: vi.fn(), role: 'ADVERTISER' })
      )
      expect(markup).toBe('')
    })
  })

  describe('4. App Top Bar (Section 16)', () => {
    it('renders restrained header with wordmark, contextual title, and logout affordance', () => {
      vi.mocked(nextNavigation.usePathname).mockReturnValue('/dashboard/analytics')
      const markup = renderWithI18n(createElement(VelvetAppTopBar, { role: 'ADVERTISER' }))

      expect(markup).toContain('velvet-app-top-bar')
      expect(markup).toContain('velvet-app-only')
      expect(markup).toContain('velvet<span>.</span>')
      expect(markup).toContain('Analytics')
      expect(markup).not.toContain('notification')
      expect(markup).not.toContain('badge')
    })

    it('renders compact desktop standalone navigation links for ADVERTISER (Section 3)', () => {
      vi.mocked(nextNavigation.usePathname).mockReturnValue('/dashboard')
      const markup = renderWithI18n(createElement(VelvetAppTopBar, { role: 'ADVERTISER' }))

      expect(markup).toContain('velvet-app-top-bar-nav')
      expect(markup).toContain('href="/dashboard"')
      expect(markup).toContain('href="/dashboard/analytics"')
      expect(markup).toContain('href="/dashboard/availability"')
      expect(markup).toContain('href="/dashboard/concierge"')
      expect(markup).toContain('velvet-app-top-nav-more-btn')
    })

    it('renders compact desktop standalone navigation links for CLIENT (Section 3)', () => {
      vi.mocked(nextNavigation.usePathname).mockReturnValue('/cliente')
      const markup = renderWithI18n(createElement(VelvetAppTopBar, { role: 'CLIENT' }))

      expect(markup).toContain('velvet-app-top-bar-nav')
      expect(markup).toContain('href="/"')
      expect(markup).toContain('href="/?buscar=1"')
      expect(markup).toContain('href="/cliente"')
      expect(markup).toContain('velvet-app-top-nav-more-btn')
    })
  })

  describe('5. Role-Aware /app Launcher (Sections 9, 42, 43, 44, 45)', () => {
    it('redirects anonymous visitor to public marketplace home ("/")', async () => {
      vi.spyOn(authDal, 'getAccount').mockResolvedValue(null)

      await expect(AppLauncherPage()).rejects.toThrow('NEXT_REDIRECT: /')
    })

    it('redirects active ADVERTISER with completed onboarding to /dashboard', async () => {
      vi.spyOn(authDal, 'getAccount').mockResolvedValue({
        id: 'acc-1',
        auth_user_id: 'user-1',
        role: 'ADVERTISER',
        status: 'ACTIVE',
        onboarding_status: 'COMPLETED',
        onboarding_step: 6,
        terms_version: 'v1.0',
        privacy_version: 'v1.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)

      await expect(AppLauncherPage()).rejects.toThrow('NEXT_REDIRECT: /dashboard')
    })

    it('redirects active ADVERTISER with incomplete onboarding to their resolved step', async () => {
      vi.spyOn(authDal, 'getAccount').mockResolvedValue({
        id: 'acc-1',
        auth_user_id: 'user-1',
        role: 'ADVERTISER',
        status: 'ACTIVE',
        onboarding_status: 'IN_PROGRESS',
        onboarding_step: 2,
        terms_version: 'v1.0',
        privacy_version: 'v1.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)

      vi.spyOn(moderationGuards, 'resolveAdvertiserDestination').mockResolvedValue('/onboarding/seu-perfil')

      await expect(AppLauncherPage()).rejects.toThrow('NEXT_REDIRECT: /onboarding/seu-perfil')
    })

    it('redirects active CLIENT to canonical /cliente area', async () => {
      vi.spyOn(authDal, 'getAccount').mockResolvedValue({
        id: 'acc-2',
        auth_user_id: 'user-2',
        role: 'CLIENT',
        status: 'ACTIVE',
        onboarding_status: 'COMPLETED',
        onboarding_step: 1,
        terms_version: 'v1.0',
        privacy_version: 'v1.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)

      await expect(AppLauncherPage()).rejects.toThrow('NEXT_REDIRECT: /cliente')
    })

    it('redirects active ADMIN to /admin portal', async () => {
      vi.spyOn(authDal, 'getAccount').mockResolvedValue({
        id: 'acc-3',
        auth_user_id: 'user-3',
        role: 'ADMIN',
        status: 'ACTIVE',
        onboarding_status: 'COMPLETED',
        onboarding_step: 1,
        terms_version: 'v1.0',
        privacy_version: 'v1.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)

      await expect(AppLauncherPage()).rejects.toThrow('NEXT_REDIRECT: /admin')
    })

    it('redirects SUSPENDED accounts to /suspended', async () => {
      vi.spyOn(authDal, 'getAccount').mockResolvedValue({
        id: 'acc-4',
        auth_user_id: 'user-4',
        role: 'ADVERTISER',
        status: 'SUSPENDED',
        onboarding_status: 'COMPLETED',
        onboarding_step: 6,
        terms_version: 'v1.0',
        privacy_version: 'v1.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)

      await expect(AppLauncherPage()).rejects.toThrow('NEXT_REDIRECT: /suspended')
    })

    it('redirects accounts without legal terms acceptance to /complete-signup', async () => {
      vi.spyOn(authDal, 'getAccount').mockResolvedValue({
        id: 'acc-5',
        auth_user_id: 'user-5',
        role: 'ADVERTISER',
        status: 'ACTIVE',
        onboarding_status: 'IN_PROGRESS',
        onboarding_step: 1,
        terms_version: null,
        privacy_version: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)

      await expect(AppLauncherPage()).rejects.toThrow('NEXT_REDIRECT: /complete-signup')
    })

    it('strictly rejects role spoofing via query parameters (Section 42)', async () => {
      // Regardless of what query params an attacker tries (e.g. ?role=ADMIN),
      // the routing derives exclusively from server-authoritative getAccount()
      vi.spyOn(authDal, 'getAccount').mockResolvedValue({
        id: 'acc-spoof',
        auth_user_id: 'user-spoof',
        role: 'CLIENT',
        status: 'ACTIVE',
        onboarding_status: 'COMPLETED',
        onboarding_step: 1,
        terms_version: 'v1.0',
        privacy_version: 'v1.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)

      await expect(AppLauncherPage()).rejects.toThrow('NEXT_REDIRECT: /cliente')
    })
  })

  describe('6. Velvet App Shell Integration (Sections 8 & 50)', () => {
    it('wraps children with top bar and bottom nav elements carrying velvet-app-only class', () => {
      const markup = renderWithI18n(
        createElement(
          VelvetAppShell,
          { role: 'ADVERTISER' },
          createElement('div', { id: 'inner-dashboard' }, 'Dashboard Content')
        )
      )

      expect(markup).toContain('velvet-app-shell-root')
      expect(markup).toContain('velvet-app-top-bar')
      expect(markup).toContain('Dashboard Content')
      expect(markup).toContain('velvet-app-bottom-nav')
      expect(markup).toContain('velvet-app-only')
    })
  })
})
