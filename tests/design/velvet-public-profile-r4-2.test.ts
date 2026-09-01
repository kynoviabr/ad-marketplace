import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Velvet R4.2 public profile consolidation contracts', () => {
  const route = read('app/(public)/perfil/[slug]/page.tsx')
  const gallery = read('components/public/profile-gallery.tsx')
  const css = read('app/velvet-public.css')
  const messages = read('lib/i18n/messages/public.ts')
  const detail = read('modules/profiles/public-detail.ts')

  it('keeps service areas and identifies the primary location inside the profile block', () => {
    expect(route).toContain('profile-locations--compact')
    expect(route).toContain('locations.map')
    expect(route).toContain("t('profile.primaryLocation')")
    expect(route.indexOf('profile-locations--compact')).toBeLessThan(route.indexOf('profile-overview'))
  })

  it('preserves canonical service-area data without private address fields', () => {
    expect(detail).toContain('canonicalLocations')
    expect(route).not.toMatch(/street|address|latitude|longitude/i)
  })

  it('removes the standalone service-area chapter', () => {
    expect(route).not.toContain('profile-overview--areas-only')
    expect(route).not.toMatch(/<section className="profile-overview">[\s\S]*?<aside className="profile-locations"/)
  })

  it('passes every additional unique image to the compact gallery', () => {
    expect(route).toContain('const supportingMedia = media.filter((item) => item.url !== primary.url)')
    expect(route).toContain('images={supportingMedia.map')
    expect(detail).toContain('const uniqueMedia = Array.from(new Map')
  })

  it('does not duplicate the main photo in the gallery', () => {
    expect(route).toContain('item.url !== primary.url')
  })

  it('uses semantic thumbnail buttons with accessible labels', () => {
    expect(gallery).toContain('type="button"')
    expect(gallery).toContain('className="profile-gallery-thumbnail"')
    expect(gallery).toContain('aria-label={`${labels.open}: ${image.alt}`}')
  })

  it('opens the selected image and exposes an image counter', () => {
    expect(gallery).toContain('onClick={() => open(index)}')
    expect(gallery).toContain('src={images[activeIndex].url}')
    expect(gallery).toContain('{activeIndex + 1} / {images.length}')
  })

  it('uses a modal dialog and non-cropping full-image treatment', () => {
    expect(gallery).toContain('role="dialog"')
    expect(gallery).toContain('aria-modal="true"')
    expect(css).toMatch(/\.profile-detail-page--r4 \.profile-lightbox-stage img \{ object-fit: contain; \}/)
  })

  it('supports close, previous and next controls', () => {
    expect(gallery).toContain('onClick={close}')
    expect(gallery).toContain('onClick={showPrevious}')
    expect(gallery).toContain('onClick={showNext}')
  })

  it('supports Escape and Left/Right keyboard navigation', () => {
    expect(gallery).toContain("event.key === 'Escape'")
    expect(gallery).toContain("event.key === 'ArrowLeft'")
    expect(gallery).toContain("event.key === 'ArrowRight'")
  })

  it('traps focus, locks scrolling, makes the background inert and restores focus', () => {
    expect(gallery).toContain("event.key !== 'Tab'")
    expect(gallery).toContain("document.body.style.overflow = 'hidden'")
    expect(gallery).toContain('element.inert = true')
    expect(gallery).toContain('returnFocusRef.current?.focus()')
  })

  it('uses four desktop columns and two mobile columns', () => {
    expect(css).toMatch(/\.profile-detail-page--r4 \.profile-gallery-grid \{[\s\S]*?grid-template-columns: repeat\(4,/)
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*?\.profile-detail-page--r4 \.profile-gallery-grid \{[\s\S]*?grid-template-columns: repeat\(2,/)
  })

  it('keeps portrait-friendly thumbnails and minimum 44px lightbox controls', () => {
    expect(css).toMatch(/\.profile-detail-page--r4 \.profile-gallery-thumbnail \{[\s\S]*?aspect-ratio: 4 \/ 5;/)
    expect(css).toMatch(/\.profile-lightbox-close,[\s\S]*?min-height: 48px;/)
  })

  it('provides localized PT and EN lightbox copy', () => {
    expect(messages).toContain("'profile.openPhoto': 'Ampliar foto'")
    expect(messages).toContain("'profile.galleryDialog': 'Galeria de fotos ampliada'")
    expect(messages).toContain("'profile.openPhoto': 'Enlarge photo'")
    expect(messages).toContain("'profile.galleryDialog': 'Expanded photo gallery'")
  })

  it('preserves publication, analytics, metadata and JSON-LD behavior', () => {
    expect(route).toContain('getEligiblePublicProfileBySlug')
    expect(route).toContain('<ProfileViewTracker')
    expect(route).toContain('constructProfileMetadata')
    expect(route).toContain('generateProfileJsonLd(seoContract)')
    expect(route).not.toMatch(/\.update\(|\.insert\(|\.upsert\(|\.delete\(/)
  })
})
