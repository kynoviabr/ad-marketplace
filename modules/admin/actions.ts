'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/modules/moderation/guards'
import type { AdminMediaType } from './types'
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface AdminModerateMediaInput {
  mediaId: string
  mediaType: AdminMediaType
  decision: 'APPROVE' | 'REJECT'
  reasonCode?: ModerationReasonCode
  notes?: string
}

export interface AdminModerateMediaResult {
  success: boolean
  error?: string
  message?: string
  currentStatus?: string
}

/**
 * Server Action: Moderate an operational media item (photo or video).
 *
 * Enforces:
 * 1. ADMIN-only authorization via requireAdmin()
 * 2. Strict input validation and mandatory reasonCode on rejection
 * 3. Fail-closed concurrency re-read before mutation (rejects already approved/rejected items)
 * 4. Atomic status transition, recency update, and immutable moderation audit logging
 * 5. Safe operational response (never leaks identity/KYC/biometric data)
 */
export async function adminModerateMediaAction(
  input: AdminModerateMediaInput
): Promise<AdminModerateMediaResult> {
  try {
    // 1. Authorize ADMIN actor server-side
    const adminUser = await requireAdmin()

    // 2. Validate input parameters
    const { mediaId, mediaType, decision, reasonCode, notes } = input

    if (!mediaId || !UUID_REGEX.test(mediaId)) {
      return { success: false, error: 'INVALID_INPUT', message: 'ID de mídia inválido' }
    }

    if (mediaType !== 'PHOTO' && mediaType !== 'VIDEO') {
      return { success: false, error: 'INVALID_INPUT', message: 'Tipo de mídia inválido' }
    }

    if (decision !== 'APPROVE' && decision !== 'REJECT') {
      return { success: false, error: 'INVALID_INPUT', message: 'Decisão de moderação inválida' }
    }

    if (decision === 'REJECT') {
      if (!reasonCode || !VALID_MODERATION_REASON_CODES.includes(reasonCode)) {
        return {
          success: false,
          error: 'MISSING_REASON_CODE',
          message: 'Informe o motivo da rejeição',
        }
      }
    }

    if (notes && notes.length > 1000) {
      return {
        success: false,
        error: 'INVALID_INPUT',
        message: 'Observações excedem o limite de 1000 caracteres',
      }
    }

    const adminClient = createAdminClient()
    const now = new Date().toISOString()

    // 3. Concurrency check & Fail-closed state validation
    if (mediaType === 'PHOTO') {
      const { data: photo, error: fetchErr } = await adminClient
        .from('profile_media')
        .select('id, status, profile_id, approved_at, is_primary, deleted_at')
        .eq('id', mediaId)
        .is('deleted_at', null)
        .maybeSingle()

      if (fetchErr || !photo) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: 'Mídia não encontrada ou já excluída.',
        }
      }

      // Check if already moderated
      if (photo.status === 'APPROVED') {
        return {
          success: false,
          error: 'ALREADY_APPROVED',
          message: 'Esta foto já foi aprovada.',
          currentStatus: photo.status,
        }
      }

      if (photo.status === 'REJECTED') {
        return {
          success: false,
          error: 'ALREADY_REJECTED',
          message: 'Esta foto já foi rejeitada.',
          currentStatus: photo.status,
        }
      }

      const reviewableStates = ['PENDING_MODERATION', 'PROCESSING', 'UPLOADING', 'QUARANTINED']
      if (!reviewableStates.includes(photo.status)) {
        return {
          success: false,
          error: 'INVALID_TRANSITION',
          message: `Mídia em status ${photo.status} não pode ser moderada diretamente.`,
          currentStatus: photo.status,
        }
      }

      // Execute photo moderation via canonical atomic RPC moderate_media
      const { error: rpcError } = await adminClient.rpc('moderate_media', {
        p_media_id: mediaId,
        p_reviewer_id: adminUser.id,
        p_decision: decision,
        p_reason_code: decision === 'REJECT' ? reasonCode : null,
        p_notes: notes?.trim() || null,
      })

      if (rpcError) {
        console.error('[admin:actions] Error in moderate_media RPC:', rpcError)
        return {
          success: false,
          error: 'MUTATION_FAILED',
          message: rpcError.message || 'Erro ao moderar foto.',
        }
      }
    } else {
      // VIDEO moderation
      const { data: video, error: fetchErr } = await adminClient
        .from('profile_videos')
        .select('id, status, profile_id, approved_at, deleted_at')
        .eq('id', mediaId)
        .is('deleted_at', null)
        .maybeSingle()

      if (fetchErr || !video) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: 'Vídeo não encontrado ou já excluído.',
        }
      }

      // Check if already moderated
      if (video.status === 'APPROVED') {
        return {
          success: false,
          error: 'ALREADY_APPROVED',
          message: 'Este vídeo já foi aprovado.',
          currentStatus: video.status,
        }
      }

      if (video.status === 'REJECTED') {
        return {
          success: false,
          error: 'ALREADY_REJECTED',
          message: 'Este vídeo já foi rejeitado.',
          currentStatus: video.status,
        }
      }

      const reviewableStates = ['PENDING_MODERATION', 'PROCESSING', 'UPLOADING']
      if (!reviewableStates.includes(video.status)) {
        return {
          success: false,
          error: 'INVALID_TRANSITION',
          message: `Vídeo em status ${video.status} não pode ser moderado diretamente.`,
          currentStatus: video.status,
        }
      }

      if (decision === 'APPROVE') {
        const { data: updated, error: updateError } = await adminClient
          .from('profile_videos')
          .update({
            status: 'APPROVED',
            moderated_by: adminUser.id,
            moderated_at: now,
            approved_at: video.approved_at || now, // Never overwrite existing approval timestamp unnecessarily
            updated_at: now,
          })
          .eq('id', mediaId)
          .eq('status', video.status) // Concurrency guard
          .select('id')
          .single()

        if (updateError || !updated) {
          return {
            success: false,
            error: 'CONCURRENCY_CONFLICT',
            message: 'O status do vídeo foi alterado concorrentemente.',
          }
        }

        // Record immutable audit event
        const { error: auditError } = await adminClient
          .from('profile_video_moderation_events')
          .insert({
            video_id: mediaId,
            moderator_account_user_id: adminUser.id,
            decision: 'APPROVE',
            reason: notes?.trim() || null,
          })

        if (auditError) {
          console.error('[admin:actions] Failed to record video moderation audit event:', auditError)
        }

        // Reconcile profile recency
        await adminClient
          .from('professional_profiles')
          .update({ updated_at: now })
          .eq('id', video.profile_id)
      } else {
        // REJECT
        const reasonText = notes?.trim() ? `${reasonCode}: ${notes.trim()}` : reasonCode!

        const { data: updated, error: updateError } = await adminClient
          .from('profile_videos')
          .update({
            status: 'REJECTED',
            moderated_by: adminUser.id,
            moderation_reason: reasonText,
            moderated_at: now,
            approved_at: null,
            updated_at: now,
          })
          .eq('id', mediaId)
          .eq('status', video.status) // Concurrency guard
          .select('id')
          .single()

        if (updateError || !updated) {
          return {
            success: false,
            error: 'CONCURRENCY_CONFLICT',
            message: 'O status do vídeo foi alterado concorrentemente.',
          }
        }

        // Record immutable audit event
        const { error: auditError } = await adminClient
          .from('profile_video_moderation_events')
          .insert({
            video_id: mediaId,
            moderator_account_user_id: adminUser.id,
            decision: 'REJECT',
            reason: reasonText,
          })

        if (auditError) {
          console.error('[admin:actions] Failed to record video moderation audit event:', auditError)
        }

        // Reconcile profile recency
        await adminClient
          .from('professional_profiles')
          .update({ updated_at: now })
          .eq('id', video.profile_id)
      }
    }

    revalidatePath('/admin/media/review')
    revalidatePath('/admin')

    return {
      success: true,
      message: decision === 'APPROVE' ? 'Mídia aprovada com sucesso.' : 'Mídia rejeitada com sucesso.',
    }
  } catch (err: any) {
    console.error('[admin:actions] Unexpected error during media moderation:', err)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: err.message || 'Erro interno ao processar moderação.',
    }
  }
}

/**
 * Convenience helper: Approve media
 */
export async function adminApproveMediaAction(
  mediaId: string,
  mediaType: AdminMediaType
): Promise<AdminModerateMediaResult> {
  return adminModerateMediaAction({
    mediaId,
    mediaType,
    decision: 'APPROVE',
  })
}

/**
 * Convenience helper: Reject media
 */
export async function adminRejectMediaAction(input: {
  mediaId: string
  mediaType: AdminMediaType
  reasonCode: ModerationReasonCode
  notes?: string
}): Promise<AdminModerateMediaResult> {
  return adminModerateMediaAction({
    mediaId: input.mediaId,
    mediaType: input.mediaType,
    decision: 'REJECT',
    reasonCode: input.reasonCode,
    notes: input.notes,
  })
}
