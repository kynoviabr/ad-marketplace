'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from './guards'
import { ModerateCustomerReviewSchema, ModerateMediaSchema, ModerateProfileSchema } from './schemas'
import type { ModerationDecision, ModerationReasonCode, ProfileModerationDecision } from './types'

export interface ModerationActionResult {
  success: boolean
  error?: string
}

export async function moderateCustomerReviewAction(input: { reviewId: string; target: 'REVIEW' | 'RESPONSE'; decision: 'APPROVE' | 'REJECT'; reason?: string }): Promise<ModerationActionResult> {
  try {
    const moderator = await requireAdmin()
    const parsed = ModerateCustomerReviewSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
    const admin = createAdminClient()
    const status = parsed.data.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED'
    const { data: review } = await admin.from('professional_reviews').select('id,rating,comment,response:professional_review_responses(id,response)').eq('id', parsed.data.reviewId).single()
    if (!review) return { success: false, error: 'Avaliação não encontrada' }
    const response = Array.isArray((review as any).response) ? (review as any).response[0] : (review as any).response
    const responseId = parsed.data.target === 'RESPONSE' ? response?.id : null
    if (parsed.data.target === 'RESPONSE' && !responseId) return { success: false, error: 'Resposta não encontrada' }
    const table = parsed.data.target === 'REVIEW' ? 'professional_reviews' : 'professional_review_responses'
    const targetId = parsed.data.target === 'REVIEW' ? review.id : responseId
    const { error } = await admin.from(table).update({ moderation_status: status, moderation_reason: parsed.data.reason ?? null, moderated_by: moderator.id, moderated_at: new Date().toISOString() }).eq('id', targetId)
    if (error) return { success: false, error: 'Falha ao moderar conteúdo' }
    await admin.from('professional_review_moderation_events').insert({
      review_id: review.id, response_id: responseId, moderator_account_user_id: moderator.id,
      target_type: parsed.data.target, decision: parsed.data.decision, reason: parsed.data.reason ?? null,
      content_snapshot: parsed.data.target === 'REVIEW' ? { rating: review.rating, comment: review.comment } : { response: response.response },
    })
    if (parsed.data.target === 'REVIEW') {
      await admin.from('review_reports').update({
        status: parsed.data.decision === 'APPROVE' ? 'DISMISSED' : 'RESOLVED',
        resolved_by: moderator.id,
        resolution_notes: parsed.data.reason ?? 'Resolvido durante a moderação da avaliação.',
        resolved_at: new Date().toISOString(),
      }).eq('review_id', review.id).in('status', ['OPEN', 'IN_REVIEW'])
    }
    revalidatePath('/admin/moderation')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message ?? 'Erro interno de moderação' }
  }
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
