import { describe, expect, it } from 'vitest'
import {
  DESKTOP_MEDIA_PREVIEW_LIMIT,
  MOBILE_MEDIA_PREVIEW_LIMIT,
  getProfileMediaPreview,
} from '@/components/public/profile-gallery'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const photos = (count: number) => Array.from({ length: count }, (_, index) => ({
  url: `https://example.test/photo-${index + 1}.jpg`,
  alt: `Photo ${index + 1}`,
}))

describe('Velvet R4.4 bounded media preview', () => {
  const component = read('components/public/profile-gallery.tsx')
  const route = read('app/(public)/perfil/[slug]/page.tsx')
  const css = read('app/velvet-public.css')
  const messages = read('lib/i18n/messages/public.ts')
  const implementation = read('docs/design/IMPLEMENTATION_R4_4_MEDIA_PREVIEW.md')

  it('keeps four-photo collections complete in the inline preview', () => {
    expect(getProfileMediaPreview(photos(4))).toHaveLength(4)
  })

  it('bounds nine-photo collections to four visible mobile thumbnails', () => {
    expect(getProfileMediaPreview(photos(9))).toHaveLength(9)
    expect(MOBILE_MEDIA_PREVIEW_LIMIT).toBe(4)
    expect(css).toContain('.profile-gallery-thumbnail:nth-child(n + 5) { display: none; }')
  })

  it('bounds a synthetic thirty-photo collection while preserving full viewer input', () => {
    const collection = photos(30)
    expect(getProfileMediaPreview(collection)).toHaveLength(10)
    expect(collection).toHaveLength(30)
    expect(DESKTOP_MEDIA_PREVIEW_LIMIT).toBe(10)
    expect(component).toContain('src={images[activeIndex].url}')
    expect(component).toContain('{activeIndex + 1} / {images.length}')
  })

  it('opens visible thumbnails at their exact collection index and View all at the first item', () => {
    expect(component).toContain('onClick={() => open(index)}')
    expect(component).toContain('setActiveIndex(0)')
    expect(component).toContain('onClick={openAll}')
  })

  it('uses real localized counts and a restrained accessible View all action', () => {
    expect(route).toContain("t('profile.mediaCountMany', { count: supportingMedia.length })")
    expect(route).toContain("t('profile.viewAllPhotos', { count: supportingMedia.length })")
    expect(messages).toContain("'profile.mediaCountMany': '{count} fotos'")
    expect(messages).toContain("'profile.viewAllPhotos': 'Ver todas as {count} fotos'")
    expect(messages).toContain("'profile.mediaCountMany': '{count} photos'")
    expect(messages).toContain("'profile.viewAllPhotos': 'View all {count} photos'")
    expect(css).toMatch(/\.profile-gallery-view-all \{[\s\S]*?min-height: 44px;/)
  })

  it('requests thumbnail-sized lazy images without eagerly rendering the full collection', () => {
    expect(component).toContain('previewImages.map')
    expect(component).toContain('loading="lazy"')
    expect(component).toContain('quality={72}')
    expect(component).toContain('210px')
  })

  it('uses six small wide-desktop tiles with a stable square preview frame', () => {
    expect(css).toMatch(/@media \(min-width: 1280px\)[\s\S]*?repeat\(6,/)
    expect(css).toMatch(/\.profile-gallery-thumbnail \{[\s\S]*?aspect-ratio: 1;/)
  })

  it('keeps the hero unique and the approved lightbox behavior', () => {
    expect(route).toContain('item.url !== primary.url')
    expect(component).toContain("event.key === 'Escape'")
    expect(component).toContain("event.key === 'ArrowLeft'")
    expect(component).toContain("event.key === 'ArrowRight'")
    expect(component).toContain('returnFocusRef.current?.focus()')
    expect(css).toContain('.profile-lightbox-stage img { object-fit: contain; }')
  })

  it('documents future video and reviews without implementing fabricated entries', () => {
    expect(implementation).toContain('Future video records')
    expect(implementation).toContain('Future reviews belong after Media and before Trust/Safety')
    expect(implementation).toMatch(/Ratings, reviews and review schema are not part of\s+this release/)
    expect(route).not.toMatch(/fakeReview|videoPoster|autoplay/)
  })

  it('preserves publication, analytics and SEO contracts', () => {
    expect(route).toContain('getEligiblePublicProfileBySlug')
    expect(route).toContain('<ProfileViewTracker')
    expect(route).toContain('constructProfileMetadata')
    expect(route).toContain('generateProfileJsonLd(seoContract)')
  })
})
