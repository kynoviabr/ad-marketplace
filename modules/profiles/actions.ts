'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireVerifiedAdvertiser } from '@/modules/verification/dal'
import {
  CreateProfileDraftSchema,
  InitialProfessionalProfileSchema,
  PublicPresentationProfileSchema,
  UpdateProfileSchema,
  type CreateProfileDraftInput,
  type UpdateProfileInput,
} from './schemas'
import { redirect } from 'next/navigation'
import { requireAccount } from '@/modules/auth/dal'
import { generateUniqueSlug } from './slug'
import { isProfileDataComplete } from './completeness'
import { getProfileByAccountUserId, checkSlugExists } from './dal'
import type { ProfessionalProfile, ProfileActionResult } from './types'
import { parseOfferingFormData } from '@/modules/offerings/schema'

export type InitialProfileActionState = ProfileActionResult<{
  stageName: string
  whatsappPhone: string | null
}>

export type PublicPresentationActionState = ProfileActionResult<void>

/** Persists Step 02 against the profile owned by the authenticated account. */
export async function savePublicPresentationProfileAction(
  _previousState: PublicPresentationActionState,
  formData: FormData
): Promise<PublicPresentationActionState> {
  const account = await requireAccount()
  const parsed = PublicPresentationProfileSchema.safeParse({
    headline: formData.get('headline'),
    bio: formData.get('bio'),
    public_age: formData.get('public_age'),
    height_cm: formData.get('height_cm'),
    weight_kg: formData.get('weight_kg'),
    eye_color: formData.get('eye_color'),
    hair_color: formData.get('hair_color'),
    hair_length: formData.get('hair_length'),
    body_type: formData.get('body_type'),
    show_age: formData.get('show_age') === 'on',
    show_height: formData.get('show_height') === 'on',
    show_weight: formData.get('show_weight') === 'on',
  })
  let offerings
  try {
    offerings = parseOfferingFormData(formData)
  } catch {
    return { success: false, error: 'Revise as opções profissionais indicadas.' }
  }

  if (!parsed.success) {
    return {
      success: false,
      error: 'Revise os campos indicados.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('professional_profiles')
      .update({
        headline: parsed.data.headline,
        bio: parsed.data.bio,
        public_age: parsed.data.public_age,
        height_cm: parsed.data.height_cm,
        weight_kg: parsed.data.weight_kg,
        eye_color: parsed.data.eye_color,
        hair_color: parsed.data.hair_color,
        hair_length: parsed.data.hair_length,
        body_type: parsed.data.body_type,
        show_age: parsed.data.show_age,
        show_height: parsed.data.show_height,
        show_weight: parsed.data.show_weight,
        content_moderation_status: 'PENDING',
        updated_at: new Date().toISOString(),
      })
      .eq('account_user_id', account.id)
      .select('id')
      .maybeSingle()

    if (error || !data) {
      console.error('[onboarding:profile] Profile update failed:', error?.message)
      return { success: false, error: 'Não foi possível salvar agora. Tente novamente.' }
    }

    const { error: offeringError } = await admin.rpc('save_professional_profile_offerings', {
      p_profile_id: data.id,
      p_offerings: offerings,
    })
    if (offeringError) {
      console.error('[onboarding:profile] Offering update failed:', offeringError.message)
      return { success: false, error: 'O perfil foi salvo, mas não foi possível salvar as opções profissionais.' }
    }

    await admin
      .from('account_users')
      .update({ onboarding_status: 'IN_PROGRESS', onboarding_step: 3 })
      .eq('id', account.id)
      .lt('onboarding_step', 3)
  } catch (error) {
    console.error(
      '[onboarding:profile] Unexpected persistence failure:',
      error instanceof Error ? error.message : error
    )
    return { success: false, error: 'Não foi possível salvar agora. Tente novamente.' }
  }

  redirect('/onboarding/onde-atende')
}

/**
 * Persists Step 01 without accepting an account/profile id from the browser.
 * The account is resolved from the verified Supabase session and every write
 * is scoped to that canonical account id. KYC remains a later publication gate.
 */
export async function saveInitialProfessionalProfileAction(
  _previousState: InitialProfileActionState,
  formData: FormData
): Promise<InitialProfileActionState> {
  // Keep redirects from requireAccount outside the catch block so an expired
  // session reaches the existing login recovery flow.
  const account = await requireAccount()

  const parsed = InitialProfessionalProfileSchema.safeParse({
    stage_name: formData.get('stage_name'),
    whatsapp_phone: formData.get('whatsapp_phone'),
  })

  if (!parsed.success) {
    return {
      success: false,
      error: 'Revise os campos indicados.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const admin = createAdminClient()
    const existing = await getProfileByAccountUserId(account.id)
    let saved: ProfessionalProfile | null = null

    if (existing) {
      const { data, error } = await admin
        .from('professional_profiles')
        .update({
          stage_name: parsed.data.stage_name,
          whatsapp_phone: parsed.data.whatsapp_phone,
          content_moderation_status: 'PENDING',
          updated_at: new Date().toISOString(),
        })
        .eq('account_user_id', account.id)
        .select('*')
        .single()

      if (error || !data) {
        console.error('[onboarding:you] Profile update failed:', error?.message)
        return { success: false, error: 'Não foi possível salvar agora. Tente novamente.' }
      }
      saved = data as ProfessionalProfile
    } else {
      const slug = await generateUniqueSlug(parsed.data.stage_name, checkSlugExists)
      const { data, error } = await admin
        .from('professional_profiles')
        .insert({
          account_user_id: account.id,
          stage_name: parsed.data.stage_name,
          whatsapp_phone: parsed.data.whatsapp_phone,
          slug,
          status: 'DRAFT',
          content_moderation_status: 'PENDING',
        })
        .select('*')
        .single()

      if (error || !data) {
        console.error('[onboarding:you] Profile creation failed:', error?.message)
        return { success: false, error: 'Não foi possível salvar agora. Tente novamente.' }
      }
      saved = data as ProfessionalProfile
    }

    await admin
      .from('account_users')
      .update({ onboarding_status: 'IN_PROGRESS', onboarding_step: 2 })
      .eq('id', account.id)
      .lt('onboarding_step', 2)

  } catch (error) {
    console.error(
      '[onboarding:you] Unexpected persistence failure:',
      error instanceof Error ? error.message : error
    )
    return { success: false, error: 'Não foi possível salvar agora. Tente novamente.' }
  }

  redirect('/onboarding/seu-perfil')
}

/**
 * Server Action: Create Initial Profile Draft.
 *
 * Enforces:
 * 1. requireVerifiedAdvertiser() barrier (Active Account + Verified Adult KYC).
 * 2. 1:1 constraint idempotency (returns existing profile if already created).
 * 3. Unique slug generation based on stage_name.
 * 4. Monotonic onboarding_step update to 4.
 */
export async function createProfileDraftAction(
  input: CreateProfileDraftInput
): Promise<ProfileActionResult<ProfessionalProfile>> {
  try {
    const { account } = await requireVerifiedAdvertiser()

    const validated = CreateProfileDraftSchema.safeParse(input)
    if (!validated.success) {
      return {
        success: false,
        error: 'Dados inválidos para criação do perfil.',
        fieldErrors: validated.error.flatten().fieldErrors,
      }
    }

    const admin = createAdminClient()

    // 1. Idempotency check: check if profile already exists for this account
    const existing = await getProfileByAccountUserId(account.id)
    if (existing) {
      return { success: true, data: existing }
    }

    // 2. Generate unique slug
    const slug = await generateUniqueSlug(validated.data.stage_name, checkSlugExists)

    // 3. Insert new DRAFT profile
    const { data: created, error: insertError } = await admin
      .from('professional_profiles')
      .insert({
        account_user_id: account.id,
        stage_name: validated.data.stage_name,
        slug,
        status: 'DRAFT',
        content_moderation_status: 'PENDING',
      })
      .select('*')
      .single()

    if (insertError || !created) {
      // If concurrent insert occurred, fetch the existing row
      if (insertError?.code === '23505') {
        const raceProfile = await getProfileByAccountUserId(account.id)
        if (raceProfile) return { success: true, data: raceProfile }
      }
      console.error('[profile:create] Insert error:', insertError?.message)
      return { success: false, error: 'Não foi possível criar o perfil. Tente novamente.' }
    }

    // 4. Advance onboarding step to 4 monotonically
    await admin
      .from('account_users')
      .update({ onboarding_step: 4, updated_at: new Date().toISOString() })
      .eq('id', account.id)
      .lt('onboarding_step', 4)

    return { success: true, data: created as ProfessionalProfile }
  } catch (err) {
    console.error('[profile:create] Unexpected error:', err instanceof Error ? err.message : err)
    return { success: false, error: 'Ocorreu um erro ao criar o perfil.' }
  }
}

/**
 * Server Action: Update Profile Data & Evaluate Completeness.
 *
 * Enforces:
 * 1. requireVerifiedAdvertiser() barrier.
 * 2. Mass-assignment protection via explicit Zod parsing.
 * 3. Automatic transition to READY_FOR_REVIEW upon minimum completeness.
 * 4. Monotonic onboarding_step update to 5 upon completion.
 * 5. Automatic reset of content_moderation_status to PENDING upon material text edits.
 */
export async function updateProfileDraftAction(
  input: UpdateProfileInput
): Promise<ProfileActionResult<ProfessionalProfile>> {
  try {
    const { account } = await requireVerifiedAdvertiser()

    const validated = UpdateProfileSchema.safeParse(input)
    if (!validated.success) {
      return {
        success: false,
        error: 'Existem campos com preenchimento inválido.',
        fieldErrors: validated.error.flatten().fieldErrors,
      }
    }

    const admin = createAdminClient()
    const current = await getProfileByAccountUserId(account.id)
    if (!current) {
      return { success: false, error: 'Perfil não encontrado. Inicie a criação primeiro.' }
    }

    const payload = validated.data
    const isComplete = isProfileDataComplete({
      ...current,
      ...payload,
    })

    const newStatus = isComplete ? 'READY_FOR_REVIEW' : 'DRAFT'
    const now = new Date().toISOString()
    const completedAt = isComplete ? current.completed_at || now : null

    // Check if material text content changed
    const hasMaterialTextChange =
      current.stage_name !== payload.stage_name ||
      current.headline !== payload.headline ||
      current.bio !== payload.bio ||
      current.whatsapp_phone !== payload.whatsapp_phone ||
      current.direct_phone !== payload.direct_phone ||
      current.telegram_username !== payload.telegram_username

    const contentModerationStatus = hasMaterialTextChange
      ? 'PENDING'
      : current.content_moderation_status

    // Whitelist mutation (mass assignment defense)
    const { data: updated, error: updateError } = await admin
      .from('professional_profiles')
      .update({
        stage_name: payload.stage_name,
        headline: payload.headline,
        bio: payload.bio,
        public_age: payload.public_age,
        height_cm: payload.height_cm,
        weight_kg: payload.weight_kg,
        bust_cm: payload.bust_cm,
        waist_cm: payload.waist_cm,
        hips_cm: payload.hips_cm,
        eye_color: payload.eye_color,
        hair_color: payload.hair_color,
        hair_length: payload.hair_length,
        body_type: payload.body_type,
        has_tattoos: payload.has_tattoos,
        has_piercings: payload.has_piercings,
        languages: payload.languages,
        whatsapp_phone: payload.whatsapp_phone,
        direct_phone: payload.direct_phone,
        telegram_username: payload.telegram_username,
        show_age: payload.show_age,
        show_height: payload.show_height,
        show_weight: payload.show_weight,
        show_measurements: payload.show_measurements,
        show_whatsapp: payload.show_whatsapp,
        show_phone: payload.show_phone,
        show_telegram: payload.show_telegram,
        status: newStatus,
        content_moderation_status: contentModerationStatus,
        completed_at: completedAt,
        updated_at: now,
      })
      .eq('id', current.id)
      .select('*')
      .single()

    if (updateError || !updated) {
      console.error('[profile:update] DB error:', updateError?.message)
      return { success: false, error: 'Não foi possível salvar as alterações.' }
    }

    // If complete, advance onboarding step to 5
    if (isComplete) {
      await admin
        .from('account_users')
        .update({ onboarding_step: 5, updated_at: now })
        .eq('id', account.id)
        .lt('onboarding_step', 5)
    }

    return { success: true, data: updated as ProfessionalProfile }
  } catch (err) {
    console.error('[profile:update] Unexpected error:', err instanceof Error ? err.message : err)
    return { success: false, error: 'Ocorreu um erro ao atualizar o perfil.' }
  }
}
