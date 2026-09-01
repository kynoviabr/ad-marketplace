import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  PROFILE_REVIEW_PREVIEW_LIMIT,
  ProfileReviewsPreview,
  getBoundedReviewPreviews,
  type ProfileReviewsPresentation,
} from '@/components/public/profile-reviews-preview'
import { DESKTOP_MEDIA_PREVIEW_LIMIT, MOBILE_MEDIA_PREVIEW_LIMIT, getProfileMediaPreview } from '@/components/public/profile-gallery'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')
const photos = (count: number) => Array.from({ length: count }, (_, index) => ({ url: `/photo-${index}.jpg`, alt: `Photo ${index + 1}` }))
const reviews = (count: number): ProfileReviewsPresentation => ({
  averageRating: 4.8,
  totalReviews: count,
  previews: Array.from({ length: count }, (_, index) => ({ id: String(index), body: `Synthetic review ${index + 1}`, authorLabel: `Synthetic customer ${index + 1}` })),
})
const labels = { eyebrow: 'AVALIAÇÕES', title: 'Avaliações', ratingSummary: '4,8 · 37 avaliações', viewAll: 'Ver todas as 37 avaliações' }

describe('Velvet R4.5 future-ready public profile architecture', () => {
  const route = read('app/(public)/perfil/[slug]/page.tsx')
  const gallery = read('components/public/profile-gallery.tsx')
  const css = read('app/velvet-public.css')
  const structuredData = read('modules/seo/structured-data.ts')

  it('caps desktop media at 8 and mobile presentation at 6', () => {
    expect(DESKTOP_MEDIA_PREVIEW_LIMIT).toBe(8)
    expect(MOBILE_MEDIA_PREVIEW_LIMIT).toBe(6)
    expect(getProfileMediaPreview(photos(4))).toHaveLength(4)
    expect(getProfileMediaPreview(photos(9))).toHaveLength(8)
    expect(getProfileMediaPreview(photos(30))).toHaveLength(8)
    expect(css).toContain('.profile-gallery-thumbnail:nth-child(n + 7) { display: none; }')
  })

  it('keeps the complete viewer collection and exact clicked index', () => {
    expect(gallery).toContain('src={images[activeIndex].url}')
    expect(gallery).toContain('{activeIndex + 1} / {images.length}')
    expect(gallery).toContain('onClick={() => open(index)}')
    expect(gallery).toContain('setActiveIndex(0)')
  })

  it('renders no reviews markup or blank placeholder without approved data', () => {
    expect(renderToStaticMarkup(<ProfileReviewsPreview />)).toBe('')
    expect(route).toContain('<ProfileReviewsPreview />')
  })

  it.each([3, 37, 500])('bounds a synthetic %i-review collection to three previews', (count) => {
    const fixture = reviews(count)
    expect(getBoundedReviewPreviews(fixture)).toHaveLength(3)
    const markup = renderToStaticMarkup(<ProfileReviewsPreview data={fixture} labels={{ ...labels, ratingSummary: `4,8 · ${count} avaliações` }} />)
    expect((markup.match(/<article/g) ?? [])).toHaveLength(PROFILE_REVIEW_PREVIEW_LIMIT)
  })

  it('orders the reviews boundary after Media and before Trust/Safety', () => {
    expect(route.indexOf('<ProfileReviewsPreview />')).toBeGreaterThan(route.indexOf('<ProfileGallery'))
    expect(route.indexOf('<ProfileReviewsPreview />')).toBeLessThan(route.indexOf('<aside className="profile-trust"'))
  })

  it('cannot leak synthetic reviews or rating schema into the real profile', () => {
    expect(route).not.toMatch(/Synthetic review|4[,.]8|reviewRating|aggregateRating/)
    expect(structuredData).not.toMatch(/reviewRating|aggregateRating/)
  })

  it('introduces no database, migration or domain dependency in the presentation boundary', () => {
    const reviewsComponent = read('components/public/profile-reviews-preview.tsx')
    expect(reviewsComponent).not.toMatch(/supabase|database|migration|@\/modules\//i)
  })

  it('uses fixed micro-thumbnail tracks and a portrait crop without touching the full viewer', () => {
    expect(css).toContain('grid-template-columns: repeat(8, 136px)')
    expect(css).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))')
    expect(css).toContain('aspect-ratio: 10 / 11')
    expect(css).toContain('.profile-lightbox-stage img { object-fit: contain; }')
  })
})
