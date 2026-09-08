import React, { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/components/i18n/i18n-provider'
import { LanguageSelector } from '@/components/i18n/language-selector'
import * as fs from 'node:fs'
import * as path from 'node:path'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/sao-paulo'),
  useSearchParams: vi.fn().mockReturnValue({
    toString: vi.fn().mockReturnValue(''),
  }),
}))

describe('Velvet Language Selector & Homepage Discovery Deduplication', () => {
  function renderSelector(props: { compact?: boolean; expanded?: boolean; variant?: 'inline' | 'popover' } = {}, locale = 'pt-BR') {
    return renderToStaticMarkup(
      createElement(
        I18nProvider,
        { locale } as any,
        createElement(LanguageSelector, props)
      )
    )
  }

  describe('1. Language Selector Variants', () => {
    it('renders inline PT / EN text control by default', () => {
      const html = renderSelector({ compact: true })
      expect(html).toContain('velvet-language-selector')
      expect(html).toContain('is-compact')
      expect(html).toContain('>PT<')
      expect(html).toContain('>EN<')
      expect(html).not.toContain('velvet-language-trigger')
    })

    it('renders circular Brazil flag and chevron in popover variant for pt-BR', () => {
      const html = renderSelector({ variant: 'popover' }, 'pt-BR')
      expect(html).toContain('velvet-language-popover')
      expect(html).toContain('velvet-language-trigger')
      expect(html).toContain('velvet-flag-circle')
      expect(html).toContain('velvet-language-chevron')
      expect(html).toContain('#009c3b') // Brazil flag green
      expect(html).toContain('aria-haspopup="listbox"')
      expect(html).toContain('aria-expanded="false"')
    })

    it('renders circular US flag and chevron in popover variant for en', () => {
      const html = renderSelector({ variant: 'popover' }, 'en')
      expect(html).toContain('velvet-language-popover')
      expect(html).toContain('velvet-language-trigger')
      expect(html).toContain('velvet-flag-circle')
      expect(html).toContain('#b22234') // US flag red
      expect(html).toContain('#3c3b6e') // US flag blue canton
    })

    it('renders expanded full language names when expanded=true', () => {
      const html = renderSelector({ expanded: true }, 'pt-BR')
      expect(html).toContain('is-expanded')
      expect(html).toContain('Português')
      expect(html).toContain('English')
    })
  })

  describe('2. Public Desktop Navigation Integration', () => {
    it('uses variant="popover" in PublicDesktopNavigation', () => {
      const navFile = fs.readFileSync(
        path.join(process.cwd(), 'components/public/public-desktop-navigation.tsx'),
        'utf-8'
      )
      expect(navFile).toMatch(/<LanguageSelector[^>]*variant="popover"/)
    })
  })

  describe('3. Homepage Discovery Deduplication & Section Architecture', () => {
    it('removes HomeDiscoveryCarousel from PublicProfileGrid', () => {
      const gridFile = fs.readFileSync(
        path.join(process.cwd(), 'components/public/public-profile-grid.tsx'),
        'utf-8'
      )
      expect(gridFile).not.toContain('HomeDiscoveryCarousel')
      expect(gridFile).not.toContain('discoverDifferent')
    })

    it('specifies distinct discovery overlines for Novas Modelos and Novos Conteúdos in page.tsx', () => {
      const pageFile = fs.readFileSync(
        path.join(process.cwd(), 'app/(public)/page.tsx'),
        'utf-8'
      )
      expect(pageFile).toContain('RECÉM-CHEGADAS')
      expect(pageFile).toContain('NEW ARRIVALS')
      expect(pageFile).toContain('FOTOS & VÍDEOS')
      expect(pageFile).toContain('PHOTOS & VIDEOS')
    })

    it('includes media type chip and creator name in HomeNewContent', () => {
      const contentFile = fs.readFileSync(
        path.join(process.cwd(), 'components/public/home-new-content.tsx'),
        'utf-8'
      )
      expect(contentFile).toContain('velvet-media-type-chip')
      expect(contentFile).toContain('velvet-new-content-caption')
      expect(contentFile).toContain('velvet-new-content-name')
    })
  })
})
