export type ReportReasonCategory =
  | 'UNDERAGE_SUSPICION'
  | 'NON_CONSENSUAL'
  | 'IMPERSONATION_OR_STOLEN'
  | 'VIOLENCE_OR_EXPLOITATION'
  | 'SCAM_OR_FRAUD'
  | 'MISLEADING_LOCATION'
  | 'OTHER'

export type ReportStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED'

export type ReportResolutionAction = 'NONE' | 'QUARANTINE_MEDIA' | 'FLAG_PROFILE' | 'DISMISS'

export interface ContentReport {
  id: string
  profile_id: string | null
  media_id: string | null
  reason_category: ReportReasonCategory
  description: string | null
  reporter_hash: string
  status: ReportStatus
  resolution_action: ReportResolutionAction | null
  resolution_notes: string | null
  resolved_by: string | null
  created_at: string
  resolved_at: string | null
}

export interface ReportQueueItem {
  id: string
  profile_id: string | null
  media_id: string | null
  target_type: 'PROFILE' | 'MEDIA'
  stage_name: string
  slug: string
  reason_category: ReportReasonCategory
  description: string | null
  status: ReportStatus
  created_at: string
  media_preview_url?: string | null
}
