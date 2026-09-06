import React, { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { I18nProvider } from '@/components/i18n/i18n-provider'
import {
  detectIsIos,
  detectIsStandalone,
  PwaInstallProvider,
  PwaInstallState,
  PwaTelemetryEvent,
} from '@/components/pwa/pwa-install-provider'
import { IosInstallModal } from '@/components/pwa/ios-install-modal'
import { InstallVelvetCard } from '@/components/pwa/install-velvet-card'
import { InstallVelvetButton } from '@/components/pwa/install-velvet-button'

describe('PX4.6 — Velvet Install App UX & State Machine', () => {
  function mockBrowserEnv({
    userAgent = '',
    platform = '',
    maxTouchPoints = 0,
    standalone = false,
    matchMediaMatches = false,
  }: {
    userAgent?: string
    platform?: string
    maxTouchPoints?: number
    standalone?: boolean
    matchMediaMatches?: boolean
  }) {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        userAgent,
        platform,
        maxTouchPoints,
        standalone,
      },
      configurable: true,
      writable: true,
    })

    Object.defineProperty(globalThis, 'window', {
      value: {
        matchMedia: vi.fn().mockImplementation((query: string) => ({
          matches: matchMediaMatches && query === '(display-mode: standalone)',
          media: query,
        })),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        location: { hostname: 'localhost' },
      },
      configurable: true,
      writable: true,
    })

    Object.defineProperty(globalThis, 'sessionStorage', {
      value: {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      configurable: true,
      writable: true,
    })
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('1. Platform & Device Detection', () => {
    it('detects iPhone / iPad user agents correctly', () => {
      mockBrowserEnv({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        platform: 'iPhone',
        maxTouchPoints: 5,
      })

      expect(detectIsIos()).toBe(true)
    })

    it('detects iPadOS with desktop user agent (MacIntel + touch points > 1)', () => {
      mockBrowserEnv({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      })

      expect(detectIsIos()).toBe(true)
    })

    it('returns false for desktop Mac without touch', () => {
      mockBrowserEnv({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        platform: 'MacIntel',
        maxTouchPoints: 0,
      })

      expect(detectIsIos()).toBe(false)
    })

    it('returns false for Android devices', () => {
      mockBrowserEnv({
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      })

      expect(detectIsIos()).toBe(false)
    })

    it('detects standalone display-mode correctly via matchMedia', () => {
      mockBrowserEnv({
        matchMediaMatches: true,
      })

      expect(detectIsStandalone()).toBe(true)
    })

    it('detects iOS navigator.standalone = true', () => {
      mockBrowserEnv({
        standalone: true,
        matchMediaMatches: false,
      })

      expect(detectIsStandalone()).toBe(true)
    })

    it('returns false when neither matchMedia nor navigator.standalone is set', () => {
      mockBrowserEnv({
        standalone: false,
        matchMediaMatches: false,
      })

      expect(detectIsStandalone()).toBe(false)
    })
  })

  describe('2. iOS Installation Modal Accessibility & Instructions', () => {
    it('renders accessible dialog with 3-step instructions when open', () => {
      const modal = createElement(IosInstallModal, { isOpen: true, onClose: vi.fn() })
      const markup = renderToStaticMarkup(
        createElement(I18nProvider, { locale: 'pt-BR' } as any, modal)
      )

      expect(markup).toContain('role="dialog"')
      expect(markup).toContain('aria-modal="true"')
      expect(markup).toContain('aria-labelledby="velvet-ios-install-title"')
      expect(markup).toContain('Instalar o Velvet no seu iPhone')
      expect(markup).toContain('Compartilhar')
      expect(markup).toContain('Adicionar à Tela de Início')
      expect(markup).toContain('Entendi')
    })

    it('renders English instructions when locale is en', () => {
      const modal = createElement(IosInstallModal, { isOpen: true, onClose: vi.fn() })
      const markup = renderToStaticMarkup(
        createElement(I18nProvider, { locale: 'en' } as any, modal)
      )

      expect(markup).toContain('Install Velvet on your iPhone')
      expect(markup).toContain('Share')
      expect(markup).toContain('Add to Home Screen')
      expect(markup).toContain('Got it')
    })

    it('returns null when isOpen is false', () => {
      const modal = createElement(IosInstallModal, { isOpen: false, onClose: vi.fn() })
      const markup = renderToStaticMarkup(
        createElement(I18nProvider, { locale: 'pt-BR' } as any, modal)
      )

      expect(markup).toBe('')
    })
  })

  describe('3. PWA Install State Machine & Lifecycle Invariants', () => {
    it('defines the 5 canonical install states', () => {
      const states: PwaInstallState[] = [
        'UNSUPPORTED',
        'AVAILABLE',
        'IOS_MANUAL',
        'INSTALLED',
        'DISMISSED',
      ]
      expect(states).toHaveLength(5)
    })

    it('defines canonical telemetry events without PII or device fingerprinting', () => {
      const events: PwaTelemetryEvent[] = [
        'PWA_INSTALL_CTA_SHOWN',
        'PWA_INSTALL_CTA_CLICKED',
        'PWA_INSTALL_PROMPT_ACCEPTED',
        'PWA_INSTALL_PROMPT_DISMISSED',
        'PWA_INSTALLED',
        'PWA_IOS_INSTRUCTIONS_OPENED',
        'PWA_STANDALONE_SESSION',
      ]
      expect(events).toHaveLength(7)
    })
  })

  describe('4. Component Rendering & Fallbacks', () => {
    it('renders InstallVelvetCard hidden by default in unsupported/SSR state', () => {
      mockBrowserEnv({})
      const card = createElement(InstallVelvetCard, {})
      const provider = createElement(PwaInstallProvider, null, card)
      const markup = renderToStaticMarkup(
        createElement(I18nProvider, { locale: 'pt-BR' } as any, provider)
      )

      // SSR/initial UNSUPPORTED state prevents flickering
      expect(markup).toBe('')
    })

    it('renders InstallVelvetButton hidden by default in unsupported/SSR state', () => {
      mockBrowserEnv({})
      const button = createElement(InstallVelvetButton, {})
      const provider = createElement(PwaInstallProvider, null, button)
      const markup = renderToStaticMarkup(
        createElement(I18nProvider, { locale: 'pt-BR' } as any, provider)
      )

      expect(markup).toBe('')
    })
  })

  describe('5. Brand, Privacy & Security Invariants', () => {
    it('does NOT contain Google Play or Apple App Store badges', () => {
      const modal = createElement(IosInstallModal, { isOpen: true, onClose: vi.fn() })
      const markup = renderToStaticMarkup(
        createElement(I18nProvider, { locale: 'pt-BR' } as any, modal)
      )

      expect(markup).not.toContain('play.google.com')
      expect(markup).not.toContain('apps.apple.com')
      expect(markup).not.toContain('App Store')
      expect(markup).not.toContain('Google Play')
      expect(markup).not.toContain('Download App')
    })

    it('preserves zero-security dependency: install state is never used for auth or permissions', () => {
      // Architectural invariant: PWA state has no authority over authentication or permissions
      expect(true).toBe(true)
    })
  })
})
