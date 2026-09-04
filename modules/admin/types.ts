/**
 * Admin Operations Domain Types — R12.1
 *
 * Defines types for internal administrative operations, operational status
 * classification, safe professional summaries, and operations dashboard overview.
 *
 * Privacy Invariant:
 * AdminProfessionalSummary strictly projects operational-safe fields only.
 * NEVER exposes legal names, CPFs, DOBs, documents, biometric data, or private credentials.
 */

import type { ProfileStatus, ContentModerationStatus } from '@/modules/profiles/types'
import type { UserStatus } from '@/modules/auth/types'
import type { VerificationStatus } from '@/modules/verification/types'
import type { MediaStatus } from '@/modules/media/types'

/**
 * Reusable operational status classification.
 * Derived from canonical database enums without creating duplicate status models.
 */
export type OperationalClassification =
  | 'NEEDS_REVIEW'
  | 'ACTIVE'
  | 'PAUSED'
  | 'SUSPENDED'
  | 'BLOCKED_OR_INELIGIBLE'

/**
 * Reusable internal professional summary containing only operational-safe fields.
 * Explicitly projected; never spreads unvetted database rows.
 */
export interface AdminProfessionalSummary {
  profileId: string
  stageName: string
  profileStatus: ProfileStatus
  verificationStatus: VerificationStatus
  accountStatus: UserStatus
  publicationState: 'PUBLIC' | 'INELIGIBLE' | 'SUSPENDED' | 'BLOCKED'
  primaryLocation: string | null
  createdAt: string
  updatedAt: string
}

/** Filter options for the admin profile review queue — R12.2 */
export type AdminProfileQueueFilter =
  | 'ALL'
  | 'NEEDS_REVIEW'
  | 'SUSPENDED'
  | 'PAUSED'
  | 'BLOCKED_OR_INELIGIBLE'

/** Queue item extending the safe professional summary with operational classification */
export interface AdminProfileQueueItem extends AdminProfessionalSummary {
  operationalClassification: OperationalClassification
}

/** Parameters for retrieving the admin profile review queue */
export interface AdminProfileQueueParams {
  filter?: AdminProfileQueueFilter
  search?: string
  page?: number
  pageSize?: number
}

/** Bounded server-side paginated result for the profile review queue */
export interface AdminProfileQueueResult {
  items: AdminProfileQueueItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** Filter options for the admin media review queue — R12.3 */
export type AdminMediaQueueFilter =
  | 'PENDING'
  | 'PHOTOS'
  | 'VIDEOS'
  | 'APPROVED'
  | 'REJECTED'
  | 'ALL'

export type AdminMediaType = 'PHOTO' | 'VIDEO'

/** Safe media queue item containing operational-safe fields only */
export interface AdminMediaQueueItem {
  id: string
  profileId: string
  mediaType: AdminMediaType
  stageName: string
  status: MediaStatus
  isPrimary: boolean
  previewUrl: string | null
  videoUrl?: string | null
  posterUrl?: string | null
  storagePath: string
  createdAt: string
  updatedAt: string
  approvedAt: string | null
  mimeType?: string | null
  fileSizeBytes?: number | null
  durationSeconds?: number | null
  width?: number | null
  height?: number | null
}

/** Parameters for retrieving the admin media review queue */
export interface AdminMediaQueueParams {
  filter?: AdminMediaQueueFilter
  search?: string
  page?: number
  pageSize?: number
}

/** Bounded server-side paginated result for the media review queue */
export interface AdminMediaQueueResult {
  items: AdminMediaQueueItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** Profile requiring administrative attention (e.g. pending/flagged text or ready for review) */
export interface AdminAttentionProfile {
  profileId: string
  stageName: string
  profileStatus: ProfileStatus
  contentModerationStatus: ContentModerationStatus
  accountUserId: string
  updatedAt: string
}

/** Media item awaiting moderation */
export interface AdminAttentionMedia {
  id: string
  profileId: string
  type: 'PHOTO' | 'VIDEO'
  createdAt: string
}

/** Suspended profile or account */
export interface AdminSuspendedProfile {
  profileId: string
  stageName: string
  profileStatus: ProfileStatus
  accountStatus: UserStatus
  accountUserId: string
  updatedAt: string
}

/** Recent administrative activity entry */
export type AdminRecentActivityType =
  | 'PROFILE_MODERATION'
  | 'MEDIA_MODERATION'
  | 'VIDEO_MODERATION'
  | 'BILLING_ACTION'

export interface AdminRecentActivityItem {
  id: string
  type: AdminRecentActivityType
  actorId: string
  action: string
  subject: string
  timestamp: string
  notes: string | null
}

/** Real database counts and compact queues for the admin operations home */
export interface AdminOperationsOverview {
  profilesRequiringAttention: {
    count: number
    items: AdminAttentionProfile[]
  }
  mediaRequiringAttention: {
    photosCount: number
    videosCount: number
    totalCount: number
    items: AdminAttentionMedia[]
  }
  suspendedProfiles: {
    count: number
    items: AdminSuspendedProfile[]
  }
  recentActivity: AdminRecentActivityItem[]
}
