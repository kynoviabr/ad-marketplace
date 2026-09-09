import React, { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/components/i18n/i18n-provider'
import { LanguageSelector, type LanguageSelectorProps } from '@/components/i18n/language-selector'
import * as fs from 'node:fs'
import * as path from 'node:path'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/sao-paulo'),
  useSearchParams: vi.fn().mockReturnValue({
    toString: vi.fn().mockReturnValue(''),
  }),
}))

describe('Velvet Language Selector & Homepage Discovery Deduplication', () => {
  function renderSelector(props: LanguageSelectorProps = {}, locale = 'pt-BR') {
    return renderToStaticMarkup(
      createElement(
        I18nProvider,
        { locale } as any,
        createElement(LanguageSelector, props)
      )
    )
  }

  describe('1. Language Selector Variants', () => {
    it('renders canonical popover by default without legacy raw PT / EN', () => {
      const html = renderSelector({ compact: true })
      expect(html).toContain('velvet-language-selector')
      expect(html).toContain('velvet-language-popover')
      expect(html).toContain('velvet-language-trigger')
      expect(html).toContain('velvet-flag-circle')
      expect(html).toContain('velvet-language-chevron')
      expect(html).toContain('is-compact')
      expect(html).not.toContain('>PT<')
      expect(html).not.toContain('>EN<')
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

    it('renders trigger label with full natural language name when showLabel or expanded is true', () => {
      const htmlPt = renderSelector({ showLabel: true }, 'pt-BR')
      expect(htmlPt).toContain('Português')
      expect(htmlPt).toContain('velvet-language-trigger-text')

      const htmlEn = renderSelector({ showLabel: true }, 'en')
      expect(htmlEn).toContain('English')
      expect(htmlEn).toContain('velvet-language-trigger-text')

      const htmlExpanded = renderSelector({ expanded: true }, 'pt-BR')
      expect(htmlExpanded).toContain('Português')
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

  describe('4. Public Footer Language Selector Standardization', () => {
    it('standardizes PublicFooter to use LanguageSelector with variant="popover"', () => {
      const footerFile = fs.readFileSync(
        path.join(process.cwd(), 'components/public/public-footer.tsx'),
        'utf-8'
      )
      expect(footerFile).toMatch(/<LanguageSelector[^>]*variant="popover"/)
      expect(footerFile).toMatch(/<LanguageSelector[^>]*theme="dark"/)
      expect(footerFile).toMatch(/<LanguageSelector[^>]*placement="top"/)
      expect(footerFile).toMatch(/<LanguageSelector[^>]*showLabel/)
      // Verifies no raw unconfigured LanguageSelector exists in the footer
      expect(footerFile).not.toMatch(/<LanguageSelector\s*\/>/)
    })

    it('renders popover trigger with flag, label and chevron when showLabel=true', () => {
      const htmlPt = renderSelector({ variant: 'popover', theme: 'dark', placement: 'top', showLabel: true }, 'pt-BR')
      expect(htmlPt).toContain('velvet-language-popover--dark')
      expect(htmlPt).toContain('velvet-language-popover--top')
      expect(htmlPt).toContain('velvet-language-trigger')
      expect(htmlPt).toContain('velvet-flag-circle')
      expect(htmlPt).toContain('velvet-language-trigger-text')
      expect(htmlPt).toContain('Português')
      expect(htmlPt).toContain('velvet-language-chevron')

      const htmlEn = renderSelector({ variant: 'popover', theme: 'dark', placement: 'top', showLabel: true }, 'en')
      expect(htmlEn).toContain('English')
    })

    it('defines dark theme and upward placement rules in public stylesheet', () => {
      const css = fs.readFileSync(
        path.join(process.cwd(), 'app/velvet-public.css'),
        'utf-8'
      )
      expect(css).toContain('.velvet-language-popover--dark')
      expect(css).toContain('.velvet-language-popover--top')
      expect(css).toContain('velvet-popover-in-up')
    })
  })
})

