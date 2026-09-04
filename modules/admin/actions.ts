'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/modules/moderation/guards'
import { evaluateProfileCompleteness } from '@/modules/profiles/completeness'
import { hasPublicationEntitlement } from '@/modules/billing/entitlements'
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

      // Check if already moderated (terminal states: no duplicate moderation)
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

      // Block moderation while media is still uploading or processing
      if (photo.status === 'UPLOADING' || photo.status === 'PROCESSING') {
        return {
          success: false,
          error: 'INVALID_TRANSITION',
          message: `Mídia em ${photo.status} não está pronta para moderação.`,
          currentStatus: photo.status,
        }
      }

      // Quarantined is blocked from direct approval/rejection
      if (photo.status === 'QUARANTINED') {
        return {
          success: false,
          error: 'QUARANTINED_BLOCKED',
          message: 'Mídia em quarentena não pode ser moderada diretamente.',
          currentStatus: photo.status,
        }
      }

      // Primary and only permitted reviewable state is PENDING_MODERATION
      if (photo.status !== 'PENDING_MODERATION') {
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

      // Check if already moderated (terminal states: no duplicate moderation)
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

      // Block moderation while video is still uploading or processing
      if (video.status === 'UPLOADING' || video.status === 'PROCESSING') {
        return {
          success: false,
          error: 'INVALID_TRANSITION',
          message: `Vídeo em ${video.status} não está pronto para moderação.`,
          currentStatus: video.status,
        }
      }

      // Quarantined is blocked
      if (video.status === 'QUARANTINED') {
        return {
          success: false,
          error: 'QUARANTINED_BLOCKED',
          message: 'Vídeo em quarentena não pode ser moderado diretamente.',
          currentStatus: video.status,
        }
      }

      // Primary and only permitted reviewable state is PENDING_MODERATION
      if (video.status !== 'PENDING_MODERATION') {
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

export interface AdminModerateProfileInput {
  profileId: string
  decision: 'APPROVE' | 'REJECT'
  reasonCode?: string
  notes?: string
}

export interface AdminModerateProfileResult {
  success: boolean
  error?: string
  message?: string
  currentStatus?: string
}

/**
 * Server Action: Moderate an operational professional profile (Approve / Reject).
 *
 * Enforces:
 * 1. ADMIN-only authorization via requireAdmin() (rejects CLIENT and ADVERTISER)
 * 2. Strict input validation and mandatory reasonCode on rejection
 * 3. Fail-closed concurrency re-read before mutation (rejects already approved/rejected or non-reviewable states)
 * 4. Comprehensive publication gates validation on approval (account status, KYC verification 18+, completeness, locations, approved primary media, publication entitlement)
 * 5. Atomic state mutation via moderate_profile RPC with immutable profile_moderation_reviews audit logging
 * 6. Canonical transition into ACTIVE/public state setting/preserving published_at
 * 7. Safe operational response (never leaks identity/KYC/biometric data)
 */
export async function adminModerateProfileAction(
  input: AdminModerateProfileInput
): Promise<AdminModerateProfileResult> {
  try {
    // 1. Authorize ADMIN actor server-side
    const adminUser = await requireAdmin()

    // 2. Validate input parameters
    const { profileId, decision, reasonCode, notes } = input

    if (!profileId || !UUID_REGEX.test(profileId)) {
      return { success: false, error: 'INVALID_INPUT', message: 'ID de perfil inválido' }
    }

    if (decision !== 'APPROVE' && decision !== 'REJECT') {
      return { success: false, error: 'INVALID_INPUT', message: 'Decisão de moderação inválida' }
    }

    if (decision === 'REJECT') {
      if (!reasonCode || !reasonCode.trim()) {
        return {
          success: false,
          error: 'MISSING_REASON_CODE',
          message: 'Informe o motivo da rejeição do perfil',
        }
      }
      if (reasonCode.length > 50) {
        return {
          success: false,
          error: 'INVALID_INPUT',
          message: 'Código de motivo excede 50 caracteres',
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

    // 3. Concurrency check & Fail-closed state validation
    const { data: profile, error: fetchErr } = await adminClient
      .from('professional_profiles')
      .select('id, stage_name, headline, bio, status, content_moderation_status, account_user_id, show_whatsapp, whatsapp_phone, show_phone, direct_phone, show_telegram, telegram_username, published_at, created_at, updated_at')
      .eq('id', profileId)
      .maybeSingle()

    if (fetchErr || !profile) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'Perfil não encontrado.',
      }
    }

    // Terminal/moderated states check
    if (profile.status === 'ACTIVE' && profile.content_moderation_status === 'APPROVED') {
      return {
        success: false,
        error: 'ALREADY_APPROVED',
        message: 'Este perfil já foi aprovado e está ativo.',
        currentStatus: profile.status,
      }
    }

    if (profile.content_moderation_status === 'REJECTED') {
      return {
        success: false,
        error: 'ALREADY_REJECTED',
        message: 'Este perfil já foi rejeitado pela moderação.',
        currentStatus: profile.content_moderation_status,
      }
    }

    if (profile.status === 'SUSPENDED') {
      return {
        success: false,
        error: 'SUSPENDED_BLOCKED',
        message: 'Perfis suspensos não podem ser moderados diretamente na fila de revisão.',
        currentStatus: profile.status,
      }
    }

    if (profile.status === 'DRAFT') {
      return {
        success: false,
        error: 'DRAFT_BLOCKED',
        message: 'Perfis em rascunho ainda não foram submetidos para moderação.',
        currentStatus: profile.status,
      }
    }

    // Capture content snapshot for audit trail
    const snapshot = {
      stage_name: profile.stage_name,
      headline: profile.headline,
      bio: profile.bio,
      whatsapp_phone: profile.show_whatsapp ? profile.whatsapp_phone : null,
      direct_phone: profile.show_phone ? profile.direct_phone : null,
      telegram_username: profile.show_telegram ? profile.telegram_username : null,
    }

    if (decision === 'APPROVE') {
      // 4. Validate ALL publication gates strictly before approval
      const [accountRes, verificationRes, locationRes, mediaRes, entitlementResult] = await Promise.all([
        adminClient.from('account_users').select('id, status').eq('id', profile.account_user_id).maybeSingle(),
        adminClient.from('identity_verifications').select('status, identity_verified, age_verified').eq('account_user_id', profile.account_user_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        adminClient.from('professional_profile_locations').select('location:marketplace_locations!inner(active, city:cities!inner(active))').eq('profile_id', profile.id).eq('location.active', true).eq('location.city.active', true).limit(1),
        adminClient.from('profile_media').select('id').eq('profile_id', profile.id).eq('status', 'APPROVED').eq('is_primary', true).is('deleted_at', null).limit(1),
        hasPublicationEntitlement(profile.account_user_id).then((value) => ({ value, error: null }), (error: unknown) => ({ value: false, error })),
      ])

      // Gate 1: Account status
      if (accountRes.error || !accountRes.data || accountRes.data.status !== 'ACTIVE') {
        return {
          success: false,
          error: 'PUBLICATION_GATE_FAILED',
          message: 'A conta associada ao perfil não está ativa.',
        }
      }

      // Gate 2: KYC identity & age verification (18+)
      const kyc = verificationRes.data
      if (verificationRes.error || !kyc || kyc.status !== 'VERIFIED' || kyc.identity_verified !== true || kyc.age_verified !== true) {
        return {
          success: false,
          error: 'PUBLICATION_GATE_FAILED',
          message: 'A verificação de identidade e maioridade (KYC) não está aprovada.',
        }
      }

      // Gate 3: Profile completeness
      const completeness = evaluateProfileCompleteness(profile)
      if (!completeness.isComplete) {
        return {
          success: false,
          error: 'PUBLICATION_GATE_FAILED',
          message: 'Os dados cadastrais do perfil estão incompletos.',
        }
      }

      const hasContactChannel =
        (profile.show_whatsapp && profile.whatsapp_phone?.trim()) ||
        (profile.show_phone && profile.direct_phone?.trim()) ||
        (profile.show_telegram && profile.telegram_username?.trim())
      if (!hasContactChannel) {
        return {
          success: false,
          error: 'PUBLICATION_GATE_FAILED',
          message: 'O perfil precisa ter ao menos um canal de contato ativo.',
        }
      }

      // Gate 4: Active service locations
      if (locationRes.error || !locationRes.data || locationRes.data.length === 0) {
        return {
          success: false,
          error: 'PUBLICATION_GATE_FAILED',
          message: 'O perfil não possui nenhuma localização ou cidade de atendimento ativa.',
        }
      }

      // Gate 5: Approved primary photo
      if (mediaRes.error || !mediaRes.data || mediaRes.data.length === 0) {
        return {
          success: false,
          error: 'PUBLICATION_GATE_FAILED',
          message: 'O perfil precisa ter ao menos uma foto aprovada definida como principal.',
        }
      }

      // Gate 6: Publication entitlement (subscription or override)
      if (entitlementResult.error || !entitlementResult.value) {
        return {
          success: false,
          error: 'PUBLICATION_GATE_FAILED',
          message: 'A conta não possui assinatura ou benefício de publicação ativo.',
        }
      }

      // 5. Execute atomic moderation approval via RPC moderate_profile
      const { error: rpcError } = await adminClient.rpc('moderate_profile', {
        p_profile_id: profile.id,
        p_reviewer_id: adminUser.id,
        p_decision: 'APPROVE',
        p_reason_code: null,
        p_notes: notes?.trim() || null,
        p_content_snapshot: snapshot,
      })

      if (rpcError) {
        console.error('[admin:actions] Error in moderate_profile RPC:', rpcError)
        return {
          success: false,
          error: 'MUTATION_FAILED',
          message: rpcError.message || 'Erro ao registrar aprovação do perfil.',
        }
      }

      // 6. Transition status to ACTIVE (trg_profile_first_published_at automatically sets/preserves published_at)
      const now = new Date().toISOString()
      const { data: activated, error: updateError } = await adminClient
        .from('professional_profiles')
        .update({
          status: 'ACTIVE',
          updated_at: now,
        })
        .eq('id', profile.id)
        .eq('status', profile.status) // Optimistic concurrency protection
        .select('id')
        .single()

      if (updateError || !activated) {
        return {
          success: false,
          error: 'CONCURRENCY_CONFLICT',
          message: 'O status do perfil foi alterado concorrentemente.',
        }
      }

      // 7. Complete onboarding status for the account user
      await adminClient
        .from('account_users')
        .update({
          onboarding_status: 'COMPLETED',
          onboarding_step: 6,
          updated_at: now,
        })
        .eq('id', profile.account_user_id)
    } else {
      // REJECT PROFILE
      // Execute atomic moderation rejection via RPC moderate_profile
      const { error: rpcError } = await adminClient.rpc('moderate_profile', {
        p_profile_id: profile.id,
        p_reviewer_id: adminUser.id,
        p_decision: 'REJECT',
        p_reason_code: reasonCode!.trim(),
        p_notes: notes?.trim() || null,
        p_content_snapshot: snapshot,
      })

      if (rpcError) {
        console.error('[admin:actions] Error in moderate_profile RPC:', rpcError)
        return {
          success: false,
          error: 'MUTATION_FAILED',
          message: rpcError.message || 'Erro ao registrar rejeição do perfil.',
        }
      }
    }

    revalidatePath('/admin/profiles/review')
    revalidatePath('/admin/profiles')
    revalidatePath('/admin')

    return {
      success: true,
      message: decision === 'APPROVE' ? 'Perfil aprovado e publicado com sucesso.' : 'Perfil rejeitado com sucesso.',
    }
  } catch (err: any) {
    console.error('[admin:actions] Unexpected error during profile moderation:', err)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: err.message || 'Erro interno ao processar moderação do perfil.',
    }
  }
}

/**
 * Convenience helper: Approve profile
 */
export async function adminApproveProfileAction(input: {
  profileId: string
  notes?: string
}): Promise<AdminModerateProfileResult> {
  return adminModerateProfileAction({
    profileId: input.profileId,
    decision: 'APPROVE',
    notes: input.notes,
  })
}

/**
 * Convenience helper: Reject profile
 */
export async function adminRejectProfileAction(input: {
  profileId: string
  reasonCode: string
  notes?: string
}): Promise<AdminModerateProfileResult> {
  return adminModerateProfileAction({
    profileId: input.profileId,
    decision: 'REJECT',
    reasonCode: input.reasonCode,
    notes: input.notes,
  })
}
