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
 * Enforces:
 * 1. requireVerifiedAdvertiser() barrier (Active Account + Verified Adult KYC).
 * 2. Ownership: Resolves profile strictly via authenticated account.id.
 * 3. Validation: 1 to 5 locations, exactly 1 primary location.
 * 4. Atomic replacement of profile locations.
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
      .from('locations')
      .select('id')
      .in('id', location_ids)
      .eq('active', true)

    if (locError || !validLocations || validLocations.length !== location_ids.length) {
      return { success: false, error: 'Uma ou mais localizações selecionadas são inválidas.' }
    }

    // 2. Remove previous location relations for this profile
    const { error: deleteError } = await admin
      .from('professional_profile_locations')
      .delete()
      .eq('profile_id', profile.id)

    if (deleteError) {
      console.error('[locations:save] Delete error:', deleteError.message)
      return { success: false, error: 'Não foi possível atualizar as localizações.' }
    }

    // 3. Prepare batch insert rows
    const rowsToInsert = location_ids.map((locId) => ({
      profile_id: profile.id,
      location_id: locId,
      is_primary: locId === primary_location_id,
    }))

    const { error: insertError } = await admin
      .from('professional_profile_locations')
      .insert(rowsToInsert)

    if (insertError) {
      console.error('[locations:save] Insert error:', insertError.message)
      return { success: false, error: 'Erro ao gravar as novas localizações.' }
    }

    // 4. Update profile updated_at
    await admin
      .from('professional_profiles')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', profile.id)

    const updatedLocations = await getProfileLocations(profile.id)
    return { success: true, data: updatedLocations }
  } catch (err) {
    console.error('[locations:save] Unexpected error:', err instanceof Error ? err.message : err)
    return { success: false, error: 'Ocorreu um erro ao salvar as localizações.' }
  }
}
