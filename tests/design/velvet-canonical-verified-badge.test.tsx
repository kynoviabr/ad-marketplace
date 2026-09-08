import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { VelvetVerifiedChip } from '@/components/ui/velvet-verified-chip'
import { VelvetBrandMark } from '@/components/ui/velvet-brand-mark'
import { PublicProfileCard } from '@/components/public/public-profile-card'
import type { SearchResultDTO } from '@/modules/search/types'

vi.mock('@/components/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => (key === 'common.verified18' ? 'VERIFICADA 18+' : key),
    locale: 'pt-BR',
  }),
}))

const publicCss = readFileSync(resolve(process.cwd(), 'app/velvet-public.css'), 'utf8')
const globalsCss = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8')

const mockVerifiedProfile: SearchResultDTO = {
  id: 'profile-v1',
  slug: 'helena-test',
  stageName: 'Helena',
  headline: null,
  publicAge: 23,
  isVerified: true,
  isSponsored: false,
  primaryLocation: { name: 'Jardins', slug: 'jardins', zone: 'OESTE' },
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
  contact: {
    whatsapp: null,
    phone: null,
    telegram: null,
  },
  placementType: 'ORGANIC',
}

const mockUnverifiedProfile: SearchResultDTO = {
  id: 'profile-v2',
  slug: 'isabela-test',
  stageName: 'Isabela',
  headline: null,
  publicAge: 25,
  isVerified: false,
  isSponsored: false,
  primaryLocation: { name: 'Itaim Bibi', slug: 'itaim-bibi', zone: 'SUL' },
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
  contact: {
    whatsapp: null,
    phone: null,
    telegram: null,
  },
  placementType: 'ORGANIC',
}

describe('Canonical Velvet Verified Badge & V Mark Integrity', () => {
  describe('1. VelvetBrandMark Canonical Component', () => {
    it('renders the approved lowercase editorial serif "v" monogram', () => {
      const html = renderToStaticMarkup(<VelvetBrandMark />)
      expect(html).toContain('velvet-brand-mark')
      expect(html).toContain('velvet-brand-monogram')
      expect(html).toContain('>v<')
      expect(html).not.toContain('>V<')
      expect(html).toContain('aria-hidden="true"')
    })
  })

  describe('2. VelvetVerifiedChip Component', () => {
    it('renders the canonical lowercase "v" mark inside the badge', () => {
      const htmlPT = renderToStaticMarkup(<VelvetVerifiedChip label="VERIFICADA 18+" />)
      expect(htmlPT).toContain('velvet-verified-chip')
      expect(htmlPT).toContain('velvet-verified-chip-icon')
      expect(htmlPT).toContain('velvet-brand-monogram')
      expect(htmlPT).toContain('>v<')
      expect(htmlPT).not.toContain('>V<')
      expect(htmlPT).toContain('VERIFICADA 18+')
    })

    it('renders the localized English label without altering the canonical mark', () => {
      const htmlEN = renderToStaticMarkup(<VelvetVerifiedChip label="VERIFIED 18+" />)
      expect(htmlEN).toContain('VERIFIED 18+')
      expect(htmlEN).toContain('>v<')
      expect(htmlEN).not.toContain('>V<')
    })
  })

  describe('3. PublicProfileCard Integration', () => {
    it('renders the verified badge for verified profiles and never for unverified profiles', () => {
      const verifiedHtml = renderToStaticMarkup(
        <PublicProfileCard profile={mockVerifiedProfile} mediaUrl={null} />
      )
      expect(verifiedHtml).toContain('velvet-verified-chip')
      expect(verifiedHtml).toContain('>v<')
      expect(verifiedHtml).not.toContain('>V<')

      const unverifiedHtml = renderToStaticMarkup(
        <PublicProfileCard profile={mockUnverifiedProfile} mediaUrl={null} />
      )
      expect(unverifiedHtml).not.toContain('velvet-verified-chip')
      expect(unverifiedHtml).not.toContain('VERIFICADA 18+')
    })

    it('uses canonical VelvetVerifiedChip in search card view', () => {
      const searchHtml = renderToStaticMarkup(
        <PublicProfileCard profile={mockVerifiedProfile} mediaUrl={null} variant="search" />
      )
      expect(searchHtml).toContain('velvet-profile-card--search')
      expect(searchHtml).toContain('velvet-profile-verification')
      expect(searchHtml).toContain('velvet-verified-chip')
      expect(searchHtml).toContain('>v<')
      expect(searchHtml).not.toContain('>V<')
    })

    it('renders lowercase "v" in fallback avatar when no photo is provided', () => {
      const html = renderToStaticMarkup(
        <PublicProfileCard profile={mockUnverifiedProfile} mediaUrl={null} />
      )
      expect(html).toContain('velvet-photo-fallback')
      expect(html).toContain('>v<')
      expect(html).not.toContain('>V<')
    })
  })

  describe('4. Brand Consistency & CSS Defense', () => {
    it('enforces text-transform: none !important on velvet-brand-monogram to prevent uppercase font rendering', () => {
      expect(globalsCss).toMatch(/\.velvet-brand-monogram\s*\{[^}]*text-transform:\s*none\s*!important;/)
      expect(publicCss).toMatch(/\.velvet-brand-monogram[^{]*\{[^}]*text-transform:\s*none\s*!important;/)
    })

    it('specifies the canonical badge dimensions (~30px height, ~21px icon circle)', () => {
      expect(publicCss).toMatch(/\.velvet-verified-chip\s*\{[^}]*min-height:\s*30px;/)
      expect(publicCss).toMatch(/\.velvet-verified-chip\s*\{[^}]*height:\s*30px;/)
      expect(publicCss).toMatch(/\.velvet-verified-chip-icon[^{]*\{[^}]*width:\s*21px;/)
      expect(publicCss).toMatch(/\.velvet-verified-chip-icon[^{]*\{[^}]*height:\s*21px;/)
      expect(publicCss).toMatch(/\.velvet-verified-chip-icon[^{]*\{[^}]*border-radius:\s*50%;/)
    })
  })
})
