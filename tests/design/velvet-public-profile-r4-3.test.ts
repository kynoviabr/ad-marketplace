import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Velvet R4.3 desktop compaction contracts', () => {
  const css = read('app/velvet-public.css')
  const route = read('app/(public)/perfil/[slug]/page.tsx')
  const information = read('components/public/profile-information.tsx')
  const gallery = read('components/public/profile-gallery.tsx')

  it('uses a compact 5/7 desktop core with a portrait-bounded primary image', () => {
    expect(css).toMatch(/\.profile-detail-page--r4 \.profile-hero \{[\s\S]*?grid-template-columns: minmax\(0, 5fr\) minmax\(0, 7fr\)/)
    expect(css).toMatch(/\.profile-detail-page--r4 \.profile-hero-photo \{[\s\S]*?width: min\(100%, 416px\);[\s\S]*?aspect-ratio: 4 \/ 5;/)
  })

  it('uses three fact columns on wide desktop and two at narrower breakpoints', () => {
    expect(css).toMatch(/\.profile-detail-page--r4 \.profile-information \{[\s\S]*?grid-template-columns: repeat\(3,/)
    expect(css).toMatch(/@media \(max-width: 1023px\)[\s\S]*?\.profile-detail-page--r4 \.profile-information \{[\s\S]*?repeat\(2,/)
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*?\.profile-detail-page--r4 \.profile-information \{[\s\S]*?repeat\(2,/)
  })

  it('keeps service areas as one extensible information row', () => {
    expect(route).toContain('<ProfileInformation')
    expect(information).toContain('profile-information-list-group')
    expect(route).not.toContain('profile-locations--compact')
  })

  it('does not fabricate future professional attributes', () => {
    expect(route).not.toMatch(/servicesOffered|audienceServed|partyAvailability|travelAvailability/)
  })

  it('uses six compact gallery columns at 1280+ and preserves four/three/two responsive steps', () => {
    expect(css).toMatch(/@media \(min-width: 1280px\)[\s\S]*?repeat\(6,/)
    expect(css).toMatch(/\.profile-detail-page--r4 \.profile-gallery-grid \{[\s\S]*?repeat\(4,/)
    expect(css).toMatch(/@media \(max-width: 899px\)[\s\S]*?repeat\(3,/)
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*?repeat\(2,/)
  })

  it('preserves the approved unique-image lightbox behavior', () => {
    expect(route).toContain('item.url !== primary.url')
    expect(gallery).toContain("event.key === 'Escape'")
    expect(gallery).toContain("event.key === 'ArrowLeft'")
    expect(gallery).toContain("event.key === 'ArrowRight'")
    expect(gallery).toContain('returnFocusRef.current?.focus()')
  })
})
