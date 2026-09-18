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
import type { ModerationReasonCode } from '@/modules/moderation/types'

export const VALID_MODERATION_REASON_CODES: readonly ModerationReasonCode[] = [
  'UNDERAGE_SUSPICION',
  'EXPLICIT_ILLEGAL_CONTENT',
  'LOW_QUALITY_OR_BLURRY',
  'WATERMARK_OR_PROMOTIONAL',
  'NON_HUMAN_OR_MISMATCH',
  'VIOLENCE_OR_COERCION',
  'OTHER_POLICY_VIOLATION',
] as const

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
  contentModerationStatus?: ContentModerationStatus
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
  slug?: string
  avatarUrl?: string | null
  pendingPhotosCount?: number
  pendingVideosCount?: number
}

export interface AdminProfileDetailedReview {
  profileId: string
  stageName: string
  slug: string
  headline: string | null
  bio: string | null
  publicAge: number | null
  heightCm: number | null
  weightKg: number | null
  bustCm: number | null
  waistCm: number | null
  hipsCm: number | null
  eyeColor: string | null
  hairColor: string | null
  hairLength: string | null
  bodyType: string | null
  hasTattoos: boolean
  hasPiercings: boolean
  languages: string[]
  whatsappPhone: string | null
  directPhone: string | null
  telegramUsername: string | null
  showAge: boolean
  showHeight: boolean
  showWeight: boolean
  showMeasurements: boolean
  showWhatsapp: boolean
  showPhone: boolean
  showTelegram: boolean
  profileStatus: ProfileStatus
  contentModerationStatus: ContentModerationStatus
  accountStatus: UserStatus
  publicationState: 'PUBLIC' | 'INELIGIBLE' | 'SUSPENDED' | 'BLOCKED'
  operationalClassification: OperationalClassification
  createdAt: string
  updatedAt: string
  completedAt: string | null
  publishedAt: string | null

  // Mídias seguras (Short-lived signed URLs)
  photos: Array<{
    id: string
    storagePath: string
    previewUrl: string | null
    isPrimary: boolean
    status: MediaStatus
    position: number
    mimeType: string
    fileSizeBytes: number
    width: number | null
    height: number | null
    createdAt: string
  }>
  videos: Array<{
    id: string
    storagePath: string
    posterStoragePath: string
    previewUrl: string | null
    posterUrl: string | null
    status: MediaStatus
    durationSeconds: number | null
    fileSizeBytes: number
    mimeType: string
    createdAt: string
  }>

  // Didit / Verificação Operacional (Data Minimization: NUNCA expõe documentos brutos, biometria ou selfies)
  didit: {
    status: VerificationStatus
    identityVerified: boolean
    ageVerified: boolean
    cpfVerified: boolean | null
    verifiedCountry: string | null
    verifiedAt: string | null
    provider: string
  }

  // Ofertas & Serviços
  offerings: Array<{
    optionCode: string
    group: string
    status: string
  }>

  // Regiões de Atendimento
  locations: Array<{
    id: string
    name: string
    cityName: string
    isPrimary: boolean
    active: boolean
  }>

  // Entitlement de Publicação / Assinatura
  publicationEntitlement: {
    hasEntitlement: boolean
    planCode?: string | null
    planName?: string | null
    isFounder?: boolean
    expiresAt?: string | null
  }

  // Checklist de Prontidão Operacional Canônico
  checklist: Array<{
    key: string
    title: string
    ready: boolean
    detail: string
  }>

  // Linha do tempo operacional / auditoria
  history: Array<{
    id: string
    type: 'REVIEW' | 'STATUS_CHANGE'
    decisionOrAction: string
    reasonCode: string | null
    notes: string | null
    reviewerOrActorId: string
    createdAt: string
  }>
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
