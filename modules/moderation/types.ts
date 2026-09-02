import type { ProfileMedia } from '../media/types'
import type { ReviewModerationQueueItem } from '../reviews/types'

export type { ReviewModerationQueueItem }

export type ModerationDecision = 'APPROVE' | 'REJECT' | 'QUARANTINE'
export type ProfileModerationDecision = 'APPROVE' | 'REJECT' | 'FLAG'
export type ReviewSource = 'HUMAN' | 'AUTOMATED' | 'ADMIN'

export type ModerationReasonCode =
  | 'UNDERAGE_SUSPICION'
  | 'EXPLICIT_ILLEGAL_CONTENT'
  | 'LOW_QUALITY_OR_BLURRY'
  | 'WATERMARK_OR_PROMOTIONAL'
  | 'NON_HUMAN_OR_MISMATCH'
  | 'VIOLENCE_OR_COERCION'
  | 'OTHER_POLICY_VIOLATION'

export interface MediaModerationReview {
  id: string
  media_id: string
  reviewer_id: string
  review_source: ReviewSource
  decision: ModerationDecision
  reason_code: ModerationReasonCode | null
  notes: string | null
  created_at: string
}

export interface ProfileModerationReview {
  id: string
  profile_id: string
  reviewer_id: string
  decision: ProfileModerationDecision
  reason_code: string | null
  notes: string | null
  content_snapshot: Record<string, unknown>
  created_at: string
}

export interface PendingMediaQueueItem {
  id: string
  profile_id: string
  stage_name: string
  public_age: number | null
  slug: string
  storage_path: string
  preview_url: string | null
  is_primary: boolean
  position: number
  created_at: string
  identity_verified: boolean
  age_verified: boolean
}

export interface PendingProfileQueueItem {
  id: string
  stage_name: string
  slug: string
  public_age: number | null
  headline: string | null
  bio: string | null
  whatsapp_phone: string | null
  direct_phone: string | null
  telegram_username: string | null
  content_moderation_status: string
  completed_at: string | null
  identity_verified: boolean
  age_verified: boolean
  approved_photos_count: number
  offerings: Array<{ option_code: string; status: 'OFFERED' | 'NOT_OFFERED' | 'UNSPECIFIED' }>
}
