export const PROFILE_REVIEW_PREVIEW_LIMIT = 3

export interface ProfileReviewPreviewItem {
  id: string
  body: string
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

export function ProfileReviewsPreview({ data, labels }: ProfileReviewsPreviewProps) {
  const hasReviews = Boolean(data && data.totalReviews > 0 && data.previews.length > 0)

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
        <p>{labels.ratingSummary}</p>
      </header>
      <div className="profile-reviews-grid">
        {previews.map((review) => (
          <article key={review.id}>
            <p>{review.body}</p>
            <small>{review.authorLabel}{review.dateLabel ? ` · ${review.dateLabel}` : ''}</small>
            {review.professionalResponse ? <p className="profile-review-response">{review.professionalResponse}</p> : null}
          </article>
        ))}
      </div>
      <span className="profile-reviews-view-all">{labels.viewAll} <span aria-hidden="true">→</span></span>
    </section>
  )
}
