import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from '@/lib/i18n/server'
import { localizePathname } from '@/lib/i18n/routing'
import { getEligiblePublicProfileBySlug } from '@/modules/profiles/public-detail'
import { getPublicReviews } from '@/modules/reviews/dal'
import { ReviewReportButton } from '@/components/reviews/review-report-button'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: true } }

export default async function AllReviewsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> }) {
  const [{ slug }, query, { locale }] = await Promise.all([params, searchParams, getTranslations()])
  const detail = await getEligiblePublicProfileBySlug(slug)
  if (!detail) notFound()
  const requestedPage = Number.parseInt(query.page ?? '1', 10)
  const reviews = await getPublicReviews(detail.profileId, Number.isFinite(requestedPage) ? requestedPage : 1)
  if (reviews.page > reviews.totalPages && reviews.totalReviews > 0) notFound()
  const en = locale === 'en'
  const base = localizePathname(`/perfil/${slug}/avaliacoes`, locale)
  return <div className="reviews-page profile-detail-wrap">
    <Link href={localizePathname(`/perfil/${slug}`, locale)}>← {en ? 'Back to profile' : 'Voltar ao perfil'}</Link>
    <header><p className="profile-kicker">{en ? 'REVIEWS' : 'AVALIAÇÕES'}</p><h1>{en ? `Reviews for ${detail.profile.stageName}` : `Avaliações de ${detail.profile.stageName}`}</h1>{reviews.totalReviews ? <p><span aria-hidden="true">★★★★★</span> {reviews.averageRating.toFixed(1)} · {reviews.totalReviews}</p> : <p>{en ? 'No published reviews yet.' : 'Ainda sem avaliações publicadas.'}</p>}</header>
    <div className="reviews-page-list">{reviews.items.map((review) => <article key={review.id}><div className="profile-review-stars" role="img" aria-label={`${review.rating} / 5`}>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</div>{review.comment ? <p>{review.comment}</p> : null}<small>{en ? 'Velvet member' : 'Membro Velvet'} · {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(review.createdAt))}</small>{review.professionalResponse ? <blockquote><strong>{en ? 'Professional response' : 'Resposta profissional'}</strong><p>{review.professionalResponse}</p></blockquote> : null}<ReviewReportButton reviewId={review.id} locale={locale} /></article>)}</div>
    {reviews.totalPages > 1 ? <nav className="reviews-pagination" aria-label={en ? 'Reviews pagination' : 'Paginação das avaliações'}>{reviews.page > 1 ? <Link href={`${base}?page=${reviews.page-1}`}>{en ? 'Previous' : 'Anterior'}</Link> : <span /> }<span>{reviews.page} / {reviews.totalPages}</span>{reviews.page < reviews.totalPages ? <Link href={`${base}?page=${reviews.page+1}`}>{en ? 'Next' : 'Próxima'}</Link> : <span />}</nav> : null}
  </div>
}
