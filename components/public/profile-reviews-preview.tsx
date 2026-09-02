import Link from 'next/link'

export const PROFILE_REVIEW_PREVIEW_LIMIT = 3

export interface ProfileReviewPreviewItem {
  id: string
  rating: number
  body: string | null
  authorLabel: string
  dateLabel?: string
  professionalResponse?: string
  moderationState?: 'VISIBLE' | 'PENDING' | 'HIDDEN'
}

export interface ProfileReviewsPresentation {
  averageRating: number
  totalReviews: number
  previews: ProfileReviewPreviewItem[]
}

interface ProfileReviewsPreviewProps {
  data?: ProfileReviewsPresentation | null
  viewAllHref?: string
  labels: {
    eyebrow: string
    title: string
    noReviews: string
    noReviewsDescription: string
    ratingSummary: string
    viewAll: string
  }
}

export function getBoundedReviewPreviews(data: ProfileReviewsPresentation) {
  return data.previews.slice(0, PROFILE_REVIEW_PREVIEW_LIMIT)
}

export function ProfileReviewsPreview({ data, labels, viewAllHref }: ProfileReviewsPreviewProps) {
  const hasReviews = Boolean(data && data.totalReviews > 0)

  if (!hasReviews || !data) {
    return (
      <section className="profile-reviews-preview profile-reviews-preview--empty" aria-labelledby="profile-reviews-title">
        <div className="profile-detail-wrap profile-reviews-empty-layout">
          <header>
            <p className="profile-kicker">{labels.eyebrow}</p>
            <h2 id="profile-reviews-title">{labels.title}</h2>
          </header>
          <div className="profile-reviews-empty-copy">
            <div className="profile-reviews-empty-stars" role="img" aria-label={labels.noReviews}>
              <span aria-hidden="true">☆ ☆ ☆ ☆ ☆</span>
            </div>
            <strong>{labels.noReviews}</strong>
            <p>{labels.noReviewsDescription}</p>
          </div>
        </div>
      </section>
    )
  }

  const previews = getBoundedReviewPreviews(data)

  return (
    <section className="profile-reviews-preview profile-detail-wrap" aria-labelledby="profile-reviews-title">
      <header className="profile-reviews-heading">
        <div>
          <p className="profile-kicker">{labels.eyebrow}</p>
          <h2 id="profile-reviews-title">{labels.title}</h2>
        </div>
        <p><span aria-hidden="true">★★★★★</span> {labels.ratingSummary}</p>
      </header>
      <div className="profile-reviews-grid">
        {previews.map((review) => (
          <article key={review.id}>
            <div className="profile-review-stars" role="img" aria-label={`${review.rating} / 5`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
            {review.body ? <p>{review.body}</p> : null}
            <small>{review.authorLabel}{review.dateLabel ? ` · ${review.dateLabel}` : ''}</small>
            {review.professionalResponse ? <blockquote className="profile-review-response">{review.professionalResponse}</blockquote> : null}
          </article>
        ))}
      </div>
      {viewAllHref ? <Link className="profile-reviews-view-all" href={viewAllHref}>{labels.viewAll} <span aria-hidden="true">→</span></Link> : null}
    </section>
  )
}
