'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from './guards'
import { ModerateMediaSchema, ModerateProfileSchema } from './schemas'
import type { ModerationDecision, ModerationReasonCode, ProfileModerationDecision } from './types'

export interface ModerationActionResult {
  success: boolean
  error?: string
}

/**
 * Server Action: Moderates a media photo (Approve / Reject / Quarantine).
 * Enforces atomic database transaction via RPC moderate_media.
 */
export async function moderateMediaAction(formData: {
  mediaId: string
  decision: ModerationDecision
  reasonCode?: ModerationReasonCode
  notes?: string
}): Promise<ModerationActionResult> {
  try {
    const admin = await requireAdmin()
    const parsed = ModerateMediaSchema.safeParse(formData)

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Dados inválidos' }
    }

    const { mediaId, decision, reasonCode, notes } = parsed.data
    const supabaseAdmin = createAdminClient()

    const { error: rpcError } = await supabaseAdmin.rpc('moderate_media', {
      p_media_id: mediaId,
      p_reviewer_id: admin.id,
      p_decision: decision,
      p_reason_code: reasonCode || null,
      p_notes: notes || null,
    })

    if (rpcError) {
      console.error('[moderation:action] Error in moderate_media RPC:', rpcError)
      return { success: false, error: rpcError.message || 'Erro ao moderar mídia' }
    }

    revalidatePath('/admin/moderation')
    return { success: true }
  } catch (err: any) {
    console.error('[moderation:action] Unexpected error:', err)
    return { success: false, error: err.message || 'Erro interno de moderação' }
  }
}

/**
 * Server Action: Moderates profile text content (Approve / Reject / Flag).
 * Enforces atomic database transaction with content snapshot via RPC moderate_profile.
 */
export async function moderateProfileAction(formData: {
  profileId: string
  decision: ProfileModerationDecision
  reasonCode?: string
  notes?: string
}): Promise<ModerationActionResult> {
  try {
    const admin = await requireAdmin()
    const parsed = ModerateProfileSchema.safeParse(formData)

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Dados inválidos' }
    }

    const { profileId, decision, reasonCode, notes } = parsed.data
    const supabaseAdmin = createAdminClient()

    // Capture current profile text snapshot for audit trail
    const { data: profile } = await supabaseAdmin
      .from('professional_profiles')
      .select('stage_name, headline, bio, whatsapp_phone, direct_phone, telegram_username')
      .eq('id', profileId)
      .single()

    const snapshot = profile || {}

    const { error: rpcError } = await supabaseAdmin.rpc('moderate_profile', {
      p_profile_id: profileId,
      p_reviewer_id: admin.id,
      p_decision: decision,
      p_reason_code: reasonCode || null,
      p_notes: notes || null,
      p_content_snapshot: snapshot,
    })

    if (rpcError) {
      console.error('[moderation:action] Error in moderate_profile RPC:', rpcError)
      return { success: false, error: rpcError.message || 'Erro ao moderar perfil' }
    }

    revalidatePath('/admin/profiles')
    return { success: true }
  } catch (err: any) {
    console.error('[moderation:action] Unexpected error:', err)
    return { success: false, error: err.message || 'Erro interno de moderação' }
  }
}
