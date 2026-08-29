import type { PublicProfileDTO } from '@/modules/profiles/types'
import type { MediaStatus } from '@/modules/media/types'

export type ReadinessKey = 'profile' | 'verification' | 'locations' | 'photos' | 'publication'
export interface PublicationReadinessItem { key: ReadinessKey; label: string; ready: boolean; detail: string; editHref?: string; editLabel?: string }
export interface PublicationPhotoSummary { approved: number; pending: number; rejected: number; blocked: number; statuses: MediaStatus[] }
export interface PublicationReviewState {
  profileId: string | null; slug: string | null; preview: PublicProfileDTO | null; previewPhotoUrl: string | null
  primaryLocation: string | null; serviceAreas: string[]; readiness: PublicationReadinessItem[]
  photos: PublicationPhotoSummary; isCanonicallyEligible: boolean; onboardingCompleted: boolean
  isPublic: boolean; blockingReasons: string[]; hasDataError: boolean
}
export type PublishProfileActionState = { success: false; error: string } | { success: true; publicPath: string }
