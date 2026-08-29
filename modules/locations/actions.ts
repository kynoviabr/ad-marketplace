'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireVerifiedAdvertiser } from '@/modules/verification/dal'
import { requireAccount } from '@/modules/auth/dal'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { SaveProfileLocationsSchema, type SaveProfileLocationsInput } from './schemas'
import { getProfileLocations } from './dal'
import type { LocationActionResult, ProfileLocation } from './types'
import { redirect } from 'next/navigation'

export type OnboardingLocationsActionState = LocationActionResult<void>

/** Saves Step 03 through the canonical atomic location RPC. */
export async function saveOnboardingLocationsAction(
  _previousState: OnboardingLocationsActionState,
  formData: FormData
): Promise<OnboardingLocationsActionState> {
  const account = await requireAccount()
  const input = {
    location_ids: formData.getAll('location_ids').filter((value): value is string => typeof value === 'string'),
    primary_location_id: formData.get('primary_location_id'),
  }
  const validated = SaveProfileLocationsSchema.safeParse(input)

  if (!validated.success) {
    return {
      success: false,
      error: 'Revise as regiões selecionadas.',
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const admin = createAdminClient()
    const profile = await getProfileByAccountUserId(account.id)
    if (!profile) return { success: false, error: 'Perfil não encontrado. Volte ao início do cadastro.' }

    const { location_ids, primary_location_id } = validated.data
    const { data: validLocations, error: catalogError } = await admin
      .from('marketplace_locations')
      .select('id')
      .in('id', location_ids)
      .eq('active', true)

    if (catalogError || !validLocations || validLocations.length !== location_ids.length) {
      return { success: false, error: 'Uma das regiões selecionadas não está mais disponível.' }
    }

    const { error: rpcError } = await admin.rpc('save_profile_service_areas', {
      p_profile_id: profile.id,
      p_location_ids: location_ids,
      p_primary_location_id: primary_location_id,
    })

    if (rpcError) {
      console.error('[onboarding:locations] Atomic save failed:', rpcError.message)
      return { success: false, error: 'Não foi possível salvar as regiões agora. Tente novamente.' }
    }

    await admin
      .from('account_users')
      .update({ onboarding_status: 'IN_PROGRESS', onboarding_step: 4 })
      .eq('id', account.id)
      .lt('onboarding_step', 4)
  } catch (error) {
    console.error('[onboarding:locations] Unexpected failure:', error instanceof Error ? error.message : error)
    return { success: false, error: 'Não foi possível salvar as regiões agora. Tente novamente.' }
  }

  redirect('/onboarding/verificacao')
}

/**
 * Server Action: Save Service Locations for Advertiser Profile.
 *
 * Uses the atomic PostgreSQL RPC function `save_profile_service_areas` to
 * ensure that deletion of old locations and insertion of new locations with
 * the single primary location flag happen inside a single transaction.
 */
export async function saveProfileLocationsAction(
  input: SaveProfileLocationsInput
): Promise<LocationActionResult<ProfileLocation[]>> {
  try {
    const { account } = await requireVerifiedAdvertiser()

    const validated = SaveProfileLocationsSchema.safeParse(input)
    if (!validated.success) {
      return {
        success: false,
        error: 'Dados de localização inválidos.',
        fieldErrors: validated.error.flatten().fieldErrors,
      }
    }

    const admin = createAdminClient()
    const profile = await getProfileByAccountUserId(account.id)
    if (!profile) {
      return { success: false, error: 'Perfil não encontrado. Inicie a criação do perfil primeiro.' }
    }

    const { location_ids, primary_location_id } = validated.data

    // 1. Verify that all location_ids exist and are active
    const { data: validLocations, error: locError } = await admin
      .from('marketplace_locations')
      .select('id')
      .in('id', location_ids)
      .eq('active', true)

    if (locError || !validLocations || validLocations.length !== location_ids.length) {
      return { success: false, error: 'Uma ou mais localizações selecionadas são inválidas.' }
    }

    // 2. Call the atomic PostgreSQL RPC function
    const { error: rpcError } = await admin.rpc('save_profile_service_areas', {
      p_profile_id: profile.id,
      p_location_ids: location_ids,
      p_primary_location_id: primary_location_id,
    })

    if (rpcError) {
      console.error('[locations:save] RPC error:', rpcError.message)
      return { success: false, error: 'Erro ao gravar as novas localizações.' }
    }

    const updatedLocations = await getProfileLocations(profile.id)
    return { success: true, data: updatedLocations }
  } catch (err) {
    console.error('[locations:save] Unexpected error:', err instanceof Error ? err.message : err)
    return { success: false, error: 'Ocorreu um erro ao salvar as localizações.' }
  }
}
