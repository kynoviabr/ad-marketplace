import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ProfessionalProfile, PublicProfileDTO } from './types'

/**
 * Retrieves the professional profile record by account_user_id.
 * Restricted to server-side operations (uses admin client).
 */
export async function getProfileByAccountUserId(
  accountUserId: string
): Promise<ProfessionalProfile | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('professional_profiles')
    .select('*')
    .eq('account_user_id', accountUserId)
    .maybeSingle()

  if (error || !data) return null
  return data as ProfessionalProfile
}

/**
 * Retrieves the professional profile record by slug.
 */
export async function getProfileBySlug(slug: string): Promise<ProfessionalProfile | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('professional_profiles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) return null
  return data as ProfessionalProfile
}

/**
 * Checks if a given slug is already in use by any profile.
 */
export async function checkSlugExists(slug: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('professional_profiles')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  return Boolean(data)
}

/**
 * Returns a public DTO projection respecting visibility toggles.
 */
export async function getPublicProfileDTO(slug: string): Promise<PublicProfileDTO | null> {
  const profile = await getProfileBySlug(slug)
  if (!profile) return null

  return {
    stageName: profile.stage_name,
    slug: profile.slug,
    headline: profile.headline,
    bio: profile.bio,
    publicAge: profile.show_age ? profile.public_age : null,
    heightCm: profile.show_height ? profile.height_cm : null,
    weightKg: profile.show_weight ? profile.weight_kg : null,
    bustCm: profile.show_measurements ? profile.bust_cm : null,
    waistCm: profile.show_measurements ? profile.waist_cm : null,
    hipsCm: profile.show_measurements ? profile.hips_cm : null,
    eyeColor: profile.eye_color,
    hairColor: profile.hair_color,
    hairLength: profile.hair_length,
    bodyType: profile.body_type,
    hasTattoos: profile.has_tattoos,
    hasPiercings: profile.has_piercings,
    languages: profile.languages,
    whatsappPhone: profile.show_whatsapp ? profile.whatsapp_phone : null,
    directPhone: profile.show_phone ? profile.direct_phone : null,
    telegramUsername: profile.show_telegram ? profile.telegram_username : null,
    status: profile.status,
    contentModerationStatus: profile.content_moderation_status || 'PENDING',
  }
}
