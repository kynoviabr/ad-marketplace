export type ReviewModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type ReviewDecision = 'APPROVE' | 'REJECT'
export type ReviewReportReason = 'HARASSMENT' | 'FALSE_OR_MISLEADING' | 'PERSONAL_INFORMATION' | 'HATE_OR_VIOLENCE' | 'SPAM' | 'OTHER'

export interface PublicReviewItem {
  id: string
  rating: number
  comment: string | null
  authorLabel: string
  createdAt: string
  professionalResponse: string | null
}

export interface PublicReviewsPage {
  averageRating: number
  totalReviews: number
  items: PublicReviewItem[]
  page: number
  pageSize: number
  totalPages: number
}

export interface ReviewModerationQueueItem {
  id: string
  profileId: string
  profileStageName: string
  rating: number
  comment: string | null
  status: ReviewModerationStatus
  createdAt: string
  response: { id: string; body: string; status: ReviewModerationStatus } | null
  openReports: number
}
