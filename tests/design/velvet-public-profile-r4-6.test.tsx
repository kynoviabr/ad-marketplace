import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProfileReviewsPreview, getBoundedReviewPreviews, type ProfileReviewsPresentation } from '@/components/public/profile-reviews-preview'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')
const pt = { eyebrow: 'AVALIAÇÕES', title: 'Avaliações', noReviews: 'Ainda sem avaliações', noReviewsDescription: 'Este perfil ainda não recebeu avaliações.', ratingSummary: '', viewAll: '' }
const en = { eyebrow: 'REVIEWS', title: 'Reviews', noReviews: 'No reviews yet', noReviewsDescription: 'This profile has not received any reviews yet.', ratingSummary: '', viewAll: '' }
const fixture = (count: number): ProfileReviewsPresentation => ({ averageRating: 4.8, totalReviews: count, previews: Array.from({ length: count }, (_, index) => ({ id: String(index), body: `Synthetic fixture ${index}`, authorLabel: `Fixture label ${index}` })) })

describe('Velvet R4.6 reviews empty state', () => {
  const route = read('app/(public)/perfil/[slug]/page.tsx')
  const messages = read('lib/i18n/messages/public.ts')
  const component = read('components/public/profile-reviews-preview.tsx')
  const structuredData = read('modules/seo/structured-data.ts')

  it.each([[pt, 'Ainda sem avaliações'], [en, 'No reviews yet']] as const)('renders the localized empty state', (labels, expected) => {
    const markup = renderToStaticMarkup(<ProfileReviewsPreview labels={labels} />)
    expect(markup).toContain(expected)
    expect(markup).toContain('☆ ☆ ☆ ☆ ☆')
    expect((markup.match(/☆/g) ?? [])).toHaveLength(5)
  })

  it('does not display a numeric rating or imply a zero rating', () => {
    const markup = renderToStaticMarkup(<ProfileReviewsPreview labels={pt} />)
    expect(markup).not.toMatch(/0[,.]0|0\/5|ratingValue/)
    expect(markup).toContain('aria-label="Ainda sem avaliações"')
  })

  it('keeps empty stars non-interactive and visually restrained', () => {
    const markup = renderToStaticMarkup(<ProfileReviewsPreview labels={pt} />)
    expect(markup).not.toMatch(/<button|onClick|tabindex/)
    expect(component).not.toMatch(/hover-rating|cursor:\s*pointer/)
  })

  it('uses the shared i18n architecture for PT and EN copy', () => {
    expect(route).toContain("t('profile.noReviews')")
    expect(route).toContain("t('profile.noReviewsDescription')")
    expect(messages).toContain("'profile.noReviews': 'Ainda sem avaliações'")
    expect(messages).toContain("'profile.noReviews': 'No reviews yet'")
  })

  it.each([3, 37, 500])('bounds synthetic %i-review fixtures to three previews', (count) => {
    expect(getBoundedReviewPreviews(fixture(count))).toHaveLength(3)
  })

  it('keeps fixtures and unverified claims out of the real route', () => {
    expect(route).not.toMatch(/Synthetic fixture|Fixture label|Avaliação verificada|Verified review|Verified customer/)
  })

  it('keeps review structured data unchanged', () => {
    expect(structuredData).not.toMatch(/AggregateRating|ratingValue|reviewCount|reviewRating/)
  })

  it('introduces no database or domain dependency', () => {
    expect(component).not.toMatch(/supabase|database|migration|@\/modules\//i)
  })
})
