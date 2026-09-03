import type { OfferedOfferingGroups } from '@/modules/offerings/types'

/**
 * Professional Profile domain types — FASE 03 / FASE 06
 *
 * Defines the canonical TypeScript types for professional profiles,
 * physical attributes, contact channels, visibility settings and moderation status.
 */

export type ProfileStatus =
  | 'DRAFT'
  | 'READY_FOR_REVIEW'
  | 'ACTIVE'
  | 'PAUSED'
  | 'SUSPENDED'

export type ContentModerationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'FLAGGED'

export type EyeColor =
  | 'BLACK'
  | 'BROWN'
  | 'GREEN'
  | 'BLUE'
  | 'HAZEL'
  | 'OTHER'

export type HairColor =
  | 'BLACK'
  | 'BRUNETTE'
  | 'BLONDE'
  | 'REDHEAD'
  | 'OTHER'

export type HairLength =
  | 'SHORT'
  | 'MEDIUM'
  | 'LONG'
  | 'VERY_LONG'
  | 'BALD'

export type BodyType =
  | 'SLIM'
  | 'ATHLETIC'
  | 'CURVY'
  | 'AVERAGE'
  | 'PLUS_SIZE'
  | 'OTHER'

/**
 * Full domain record of public.professional_profiles.
 */
export interface ProfessionalProfile {
  id: string
  account_user_id: string
  audience_setting: 'PUBLIC' | 'VIP_ONLY'

  // Public Identity
  stage_name: string
  slug: string
  headline: string | null
  bio: string | null

  // Public Age
  public_age: number | null

  // Physical Attributes / Measurements
  height_cm: number | null
  weight_kg: number | null
  bust_cm: number | null
  waist_cm: number | null
  hips_cm: number | null
  eye_color: EyeColor | null
  hair_color: HairColor | null
  hair_length: HairLength | null
  body_type: BodyType | null
  has_tattoos: boolean
  has_piercings: boolean

  // Languages
  languages: string[]

  // Contact Channels
  whatsapp_phone: string | null
  direct_phone: string | null
  telegram_username: string | null

  // Visibility Toggles
  show_age: boolean
  show_height: boolean
  show_weight: boolean
  show_measurements: boolean
  show_whatsapp: boolean
  show_phone: boolean
  show_telegram: boolean

  // Profile State & Moderation
  status: ProfileStatus
  content_moderation_status: ContentModerationStatus

  // Timestamps
  completed_at: string | null
  created_at: string
  updated_at: string
  published_at?: string | null
}

/**
 * Sanitized public DTO respecting visibility toggles.
 * Used for public profiles and preview cards.
 */
export interface PublicProfileDTO {
  stageName: string
  slug: string
  headline: string | null
  audienceSetting: 'PUBLIC' | 'VIP_ONLY'
  bio: string | null
  publicAge: number | null
  heightCm: number | null
  weightKg: number | null
  bustCm: number | null
  waistCm: number | null
  hipsCm: number | null
  eyeColor: EyeColor | null
  hairColor: HairColor | null
  hairLength: HairLength | null
  bodyType: BodyType | null
  hasTattoos: boolean
  hasPiercings: boolean
  languages: string[]
  whatsappPhone: string | null
  directPhone: string | null
  telegramUsername: string | null
  offerings: OfferedOfferingGroups
  status: ProfileStatus
  contentModerationStatus: ContentModerationStatus
}

/** Result type for profile Server Actions */
export type ProfileActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
