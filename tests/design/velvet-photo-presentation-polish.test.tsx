import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { VelvetVerifiedChip } from '@/components/ui/velvet-verified-chip'
import { PublicProfileCard } from '@/components/public/public-profile-card'
import { I18nProvider } from '@/components/i18n/i18n-provider'
import type { SearchResultDTO } from '@/modules/search/types'

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')

describe('Velvet Photo Presentation & Editorial Card Finish', () => {
  const publicCss = read('app/velvet-public.css')
  const profileCardSource = read('components/public/public-profile-card.tsx')
  const newContentSource = read('components/public/home-new-content.tsx')
  const newProfSource = read('components/public/home-new-professionals.tsx')

  describe('1. "Perfis para conhecer" Card Polish', () => {
    it('provides finished card elevation, 4px radius, and subtle hairline framing', () => {
      expect(publicCss).toMatch(/\.velvet-profile-photo\s*\{[^}]*aspect-ratio:\s*4\/5;[^}]*border-radius:\s*4px;/)
      expect(publicCss).toMatch(/\.velvet-profile-photo\s*\{[^}]*box-shadow:[^}]*rgba\(59,32,63,\.08\)/)
      expect(publicCss).toContain('.velvet-profile-card:hover{transform:translateY(-3px)}')
      expect(publicCss).toContain('.velvet-profile-card:hover .velvet-profile-photo{box-shadow:0 0 0 1px rgba(113,53,125,.22),0 12px 30px -4px rgba(33,27,25,.16)}')
    })

    it('has subtle vignette gradient to eliminate raw-cut photo edges', () => {
      expect(publicCss).toMatch(/\.velvet-profile-photo::after\s*\{[^}]*border-radius:\s*4px;/)
    })

    it('implements editorial typography with clear separation for stage name and age', () => {
      expect(profileCardSource).toContain('velvet-profile-name')
      expect(profileCardSource).toContain('velvet-profile-age')
      expect(publicCss).toContain('.velvet-profile-age{font-weight:300;font-size:.92em;color:var(--public-muted);font-style:italic}')
      expect(publicCss).toContain('.velvet-profile-location{color:var(--public-muted);font-size:11px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;')
    })
  })

  describe('2. Canonical Verification Chip System', () => {
    it('renders the approved circular "v" monogram in VelvetVerifiedChip', () => {
      const html = renderToStaticMarkup(<VelvetVerifiedChip label="VERIFICADA 18+" />)
      expect(html).toContain('velvet-verified-chip')
      expect(html).toContain('velvet-brand-monogram')
      expect(html).toContain('>v<')
      expect(html).toContain('VERIFICADA 18+')
    })

    it('uses frosted glass surface and delicate hairline border', () => {
      expect(publicCss).toMatch(/\.velvet-verified-chip\s*\{[^}]*border-radius:\s*9999px;/)
      expect(publicCss).toMatch(/\.velvet-verified-chip\s*\{[^}]*backdrop-filter:\s*blur\(10px\);/)
      expect(publicCss).toMatch(/\.velvet-verified-chip-icon\s*\{[^}]*border-radius:\s*50%;/)
    })

    it('integrates VelvetVerifiedChip in PublicProfileCard while maintaining backward compatibility', () => {
      expect(profileCardSource).toContain('VelvetVerifiedChip')
      expect(profileCardSource).toContain('className="velvet-verified-mark"')
      expect(profileCardSource).toContain('velvet-brand-monogram')
    })
  })

  describe('3. "Novos Conteúdos" Editorial Media Feed Distinction', () => {
    it('sets 4/5 editorial portrait ratio with dark luxury background', () => {
      expect(publicCss).toMatch(/\.velvet-new-content-card\s*\{[^}]*aspect-ratio:\s*4\/5;[^}]*background:\s*#181312;[^}]*border-radius:\s*4px;/)
    })

    it('features dedicated icons for FOTO and VÍDEO in media format chip', () => {
      expect(newContentSource).toContain('velvet-media-type-chip')
      expect(newContentSource).toContain('<svg width="10" height="10"')
      expect(newContentSource).toContain('<svg width="9" height="9"')
      expect(publicCss).toMatch(/\.velvet-media-type-chip\s*\{[^}]*border-radius:\s*9999px;/)
    })

    it('features center luxury frosted play disc for video content', () => {
      expect(newContentSource).toContain('velvet-video-badge')
      expect(newContentSource).toContain('velvet-video-play-icon')
      expect(publicCss).toMatch(/\.velvet-video-play-icon\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;/)
    })

    it('provides deep editorial gradient caption with byline, creator name and hover cue', () => {
      expect(newContentSource).toContain('velvet-new-content-caption')
      expect(newContentSource).toContain('velvet-new-content-tag')
      expect(newContentSource).toContain('velvet-new-content-name')
      expect(newContentSource).toContain('velvet-new-content-arrow')
      expect(publicCss).toMatch(/\.velvet-new-content-caption\s*\{[^}]*position:\s*absolute;/)
      expect(publicCss).toMatch(/\.velvet-new-content-caption\s*\{[\s\S]*?linear-gradient\(180deg/)
    })
  })

  describe('4. "Novas Modelos" Polish & Cohesion', () => {
    it('aligns new professional cards with 4px radius and elevation', () => {
      expect(publicCss).toMatch(/\.velvet-new-prof-photo\s*\{[^}]*aspect-ratio:\s*4\/5;[^}]*border-radius:\s*4px;/)
      expect(newProfSource).toContain('velvet-profile-age')
    })
  })

  describe('5. Static Render Validation', () => {
    it('renders PublicProfileCard with verified badge and editorial meta', () => {
      const mockProfile = {
        id: 'test-1',
        slug: 'isabella-m',
        stageName: 'Isabella M',
        headline: null,
        publicAge: 23,
        primaryLocation: { name: 'Jardins', slug: 'jardins', zone: 'Zona Oeste' },
        locations: [],
        attributes: {
          heightCm: null,
          weightKg: null,
          eyeColor: null,
          hairColor: null,
          hairLength: null,
          bodyType: null,
          hasTattoos: false,
          hasPiercings: false,
          languages: [],
        },
        isVerified: true,
        isSponsored: false,
        serviceAreas: [],
      } as unknown as SearchResultDTO

      const html = renderToStaticMarkup(
        <I18nProvider locale="pt-BR">
          <PublicProfileCard profile={mockProfile} mediaUrl="https://example.com/photo.jpg" />
        </I18nProvider>
      )

      expect(html).toContain('Isabella M')
      expect(html).toContain('23')
      expect(html).toContain('Jardins')
      expect(html).toContain('velvet-verified-chip')
      expect(html).toContain('velvet-brand-monogram')
      expect(html).toContain('velvet-profile-photo')
    })
  })
})
