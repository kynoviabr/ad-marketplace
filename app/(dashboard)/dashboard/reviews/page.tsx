import { ProfessionalDashboardHeader } from '@/components/dashboard/professional-dashboard-header'
import { ProfessionalResponseForm } from '@/components/reviews/professional-response-form'
import { requireAccount } from '@/modules/auth/dal'
import { getTranslations } from '@/lib/i18n/server'
import { getOwnerReviews } from '@/modules/reviews/dal'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false } }

export default async function ProfessionalReviewsPage() {
  const [account, { locale }] = await Promise.all([requireAccount(), getTranslations()])
  const reviews = await getOwnerReviews(account.id)
  const en = locale === 'en'
  return <div className="velvet-dashboard"><ProfessionalDashboardHeader activeHref="/dashboard/reviews" /><main><section className="velvet-dashboard-intro"><p className="dashboard-eyebrow">{en ? 'REVIEWS' : 'AVALIAÇÕES'}</p><h1>{en ? 'Your public reviews' : 'Suas avaliações públicas'}</h1><p>{en ? 'You may respond once to each review. Responses are moderated before publication.' : 'Você pode responder uma vez a cada avaliação. Respostas passam por moderação antes da publicação.'}</p></section><div className="owner-reviews-list">{reviews.length ? reviews.map((review: any) => { const response = Array.isArray(review.response) ? review.response[0] : review.response; return <article key={review.id}><div className="profile-review-stars">{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</div>{review.comment ? <p>{review.comment}</p> : <em>{en ? 'No comment' : 'Sem comentário'}</em>}<small>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(review.created_at))}</small><ProfessionalResponseForm reviewId={review.id} initialResponse={response?.response ?? ''} locale={locale} />{response ? <small>{en ? 'Response status' : 'Status da resposta'}: {response.moderation_status}</small> : null}</article> }) : <p>{en ? 'No published reviews yet.' : 'Ainda sem avaliações publicadas.'}</p>}</div></main></div>
}
