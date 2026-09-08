import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { HERO_MURAL_COLUMNS, TOTAL_HERO_MURAL_ASSETS } from '@/components/public/hero-portrait-mural'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Velvet Living Portrait Mural — Design & Structural Contracts', () => {
  const homeHeroSrc = read('components/public/home-hero.tsx')
  const muralSrc = read('components/public/hero-portrait-mural.tsx')
  const publicCss = read('app/velvet-public.css')

  it('provides a rich dataset of 30-50 curated synthetic adult editorial portraits', () => {
    expect(TOTAL_HERO_MURAL_ASSETS).toBeGreaterThanOrEqual(30)
    expect(TOTAL_HERO_MURAL_ASSETS).toBeLessThanOrEqual(50)
    expect(HERO_MURAL_COLUMNS.length).toBe(5)

    // Verify all 40 local image files exist on disk
    let verifiedCount = 0
    for (const col of HERO_MURAL_COLUMNS) {
      for (const item of col) {
        expect(item.src).toMatch(/^\/images\/hero-mural\/mural-\d{2}\.jpg$/)
        const localPath = resolve(process.cwd(), `public${item.src}`)
        expect(existsSync(localPath)).toBe(true)
        verifiedCount++
      }
    }
    expect(verifiedCount).toBe(40)
  })

  it('completely removes the old oversized two-image Hero composition', () => {
    expect(homeHeroSrc).not.toContain('velvet-home-hero-art')
    expect(homeHeroSrc).not.toContain('velvet-home-hero-main')
    expect(homeHeroSrc).not.toContain('velvet-home-hero-offset')
    expect(homeHeroSrc).not.toContain('<figcaption')
  })

  it('integrates HeroPortraitMural while preserving editorial copy and search', () => {
    expect(homeHeroSrc).toContain('<HeroPortraitMural />')
    expect(homeHeroSrc).toContain("t('home.heroTitle')")
    expect(homeHeroSrc).toContain("t('home.heroOverline')")
    expect(homeHeroSrc).toContain("t('home.heroDescription')")
    expect(homeHeroSrc).toContain('velvet-home-search')
    expect(homeHeroSrc).toContain('input name="local"')
  })

  it('enforces decorative invariants: no fake identities, links, badges, or contact buttons', () => {
    // Zero link navigation inside decorative mural
    expect(muralSrc).not.toContain('<a ')
    expect(muralSrc).not.toContain('href=')
    expect(muralSrc).not.toContain('/profile/')
    expect(muralSrc).not.toContain('whatsapp')
    expect(muralSrc).not.toContain('verified')

    // Accessibility contracts
    expect(muralSrc).toContain('aria-hidden="true"')
    expect(muralSrc).toContain('role="presentation"')
    expect(muralSrc).toContain('alt=""')
  })

  it('implements continuous CSS animation with reduced motion support', () => {
    expect(publicCss).toContain('.velvet-hero-mural')
    expect(publicCss).toContain('.velvet-mural-columns')
    expect(publicCss).toContain('.velvet-mural-track')
    expect(publicCss).toContain('@keyframes velvet-mural-up')
    expect(publicCss).toContain('@keyframes velvet-mural-down')

    // Keyframe translation should be -50% for seamless looping
    expect(publicCss).toContain('translate3d(0,-50%,0)')

    // Accessible fallback for users with vestibular disorders / motion sensitivity
    expect(publicCss).toContain('@media(prefers-reduced-motion:reduce)')
    expect(publicCss).toMatch(/@media\(prefers-reduced-motion:reduce\)[\s\S]*animation:\s*none/)
  })

  it('provides responsive column breakpoints for desktop, tablet, and mobile', () => {
    // Flex columns on ultra-wide / desktop
    expect(publicCss).toContain('.velvet-mural-columns{display:flex')
    // Responsive suppression of outer columns
    expect(publicCss).toContain('.velvet-mural-column--5{display:none}')
    expect(publicCss).toContain('.velvet-mural-column--4{display:none}')
    expect(publicCss).toContain('.velvet-mural-column--3{display:none}')
  })
})
