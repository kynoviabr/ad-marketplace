import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Velvet public Home regression hotfix — structural contract', () => {
  const layout = read('app/(public)/layout.tsx')
  const home = read('app/(public)/page.tsx')
  const header = read('components/public/public-header.tsx')
  const hero = read('components/public/home-hero.tsx')
  const profiles = read('components/public/public-profile-grid.tsx')
  const locations = read('components/public/home-locations.tsx')
  const footer = read('components/public/public-footer.tsx')
  const cityPage = read('app/[city]/page.tsx')
  const neighborhoodPage = read('app/[city]/[neighborhood]/page.tsx')
  const publicCss = read('app/velvet-public.css')
  const globalCss = read('app/globals.css')

  it('uses a dedicated public shell rather than dashboard chrome', () => {
    expect(layout).toContain('className="velvet-public-shell"')
    expect(layout).not.toContain('velvet-dashboard')
    expect(globalCss).toContain("@import './velvet-public.css';")
  })

  it('locks the Velvet identity and editorial navigation contract', () => {
    expect(header).toContain('velvet<span>.</span>')
    for (const label of ['São Paulo', 'Explorar', 'Anuncie', 'Entrar']) expect(header).toContain(label)
    expect(header).not.toContain('{brandName}')
  })

  it('preserves the approved asymmetric photographic hero and editorial search', () => {
    expect(hero).toContain('Encontre perfis<br />em São Paulo')
    expect(hero).toContain('velvet-home-hero-art')
    expect(hero).toContain('velvet-home-hero-offset')
    expect(hero).toContain('velvet-home-search')
    expect(home).toContain('<HomeHero profiles={profilesWithMedia.slice(0, 2)} />')
  })

  it('keeps canonical profiles and approved-media delivery as the data source', () => {
    expect(home).toContain("getHomeDiscoveryProfiles('sao-paulo'")
    expect(home).toContain('resolveProfilesWithMedia(homeProfiles)')
    expect(profiles).toContain('<PublicProfileCard')
  })

  it('protects the photographic grid, Olive city chapter and deep closing rhythm', () => {
    expect(publicCss).toContain('grid-template-columns:repeat(4,minmax(0,1fr))')
    expect(publicCss).toContain('grid-template-columns:repeat(2,minmax(0,1fr))')
    expect(locations).toContain('Explore São Paulo')
    expect(publicCss).toContain('background:var(--public-olive)')
    expect(publicCss).toContain('background:var(--public-aubergine-deep)')
    expect(footer).toContain('className="velvet-public-footer"')
  })

  it('keeps public rules in a separate stylesheet from Dashboard Photos', () => {
    expect(publicCss).not.toContain('.velvet-dashboard')
    expect(publicCss).not.toContain('.photo-studio')
    expect(globalCss).toContain('.photo-studio')
  })

  it('keeps Explore and neighborhood routes inside the Velvet public shell', () => {
    for (const route of [cityPage, neighborhoodPage]) {
      expect(route).toContain('className="velvet-public-shell"')
      expect(route).toContain('<PublicHeader />')
      expect(route).toContain('<PublicFooter />')
      expect(route).toContain('className="velvet-explore-grid"')
      expect(route).toContain('resolveProfilesWithMedia(searchResponse.results)')
    }
  })
})
