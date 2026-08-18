'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireVerifiedAdvertiser } from '@/modules/verification/dal'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { SaveProfileLocationsSchema, type SaveProfileLocationsInput } from './schemas'
import { getProfileLocations } from './dal'
import type { LocationActionResult, ProfileLocation } from './types'

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
