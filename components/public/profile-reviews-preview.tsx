export const PROFILE_REVIEW_PREVIEW_LIMIT = 3

export interface ProfileReviewPreviewItem {
  id: string
  body: string
  authorLabel: string
}

export interface ProfileReviewsPresentation {
  averageRating: number
  totalReviews: number
  previews: ProfileReviewPreviewItem[]
}

interface ProfileReviewsPreviewProps {
  data?: ProfileReviewsPresentation | null
  labels?: {
    eyebrow: string
    title: string
    ratingSummary: string
    viewAll: string
  }
}

export function getBoundedReviewPreviews(data: ProfileReviewsPresentation) {
  return data.previews.slice(0, PROFILE_REVIEW_PREVIEW_LIMIT)
}

export function ProfileReviewsPreview({ data, labels }: ProfileReviewsPreviewProps) {
  if (!data || !labels || data.totalReviews < 1 || data.previews.length < 1) return null

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
            <small>{review.authorLabel}</small>
          </article>
        ))}
      </div>
      <span className="profile-reviews-view-all">{labels.viewAll} <span aria-hidden="true">→</span></span>
    </section>
  )
}
