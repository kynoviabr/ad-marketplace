'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireVerifiedAdvertiser } from '@/modules/verification/dal'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import {
  RequestUploadSchema,
  ConfirmUploadSchema,
  ReorderMediaSchema,
  SetPrimaryMediaSchema,
  DeleteMediaSchema,
  RetryUploadSchema,
  MAX_FILE_SIZE_BYTES,
  type RequestUploadInput,
  type ConfirmUploadInput,
  type ReorderMediaInput,
  type SetPrimaryMediaInput,
  type DeleteMediaInput,
  type RetryUploadInput,
} from './schemas'
import { getActivePhotoCount, getMediaById, getProfileMedia } from './dal'
import { submitOwnedProfileForReview } from '@/modules/profiles/submission'
import type { MediaActionResult, ProfileMedia, SignedUploadUrlResponse } from './types'
import { redirect } from 'next/navigation'
import { resolveEntitlements } from '@/modules/billing/entitlements'
import { ImageProcessingError, validateAndSanitizeImage } from './processing'

const SIGNED_UPLOAD_URL_TTL_MS = 2 * 60 * 60 * 1000

async function markMediaProcessingFailed(mediaId: string): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('profile_media').update({
      status: 'PROCESSING_FAILED',
      updated_at: new Date().toISOString(),
    }).eq('id', mediaId).in('status', ['UPLOADING', 'PROCESSING'])
  } catch {
    console.error('[media:confirmUpload] Unable to persist safe processing failure state')
  }
}

function safeImageProcessingError(error: unknown): string {
  if (!(error instanceof ImageProcessingError)) return 'Não foi possível processar a foto enviada.'
  if (error.code === 'IMAGE_TOO_LARGE') return 'A foto excede o limite de 15 MB.'
  if (error.code === 'INVALID_DIMENSIONS') return 'As dimensões da foto não são permitidas.'
  if (error.code === 'UNSUPPORTED_FORMAT') return 'O arquivo não corresponde a um formato de imagem permitido.'
  if (error.code === 'INVALID_IMAGE') return 'O arquivo enviado não é uma imagem válida.'
  return 'Não foi possível processar a foto enviada.'
}

/**
 * Server Action: Request Signed Upload URL for a new photo.
 */
export async function requestMediaUploadUrlAction(
  input: RequestUploadInput
): Promise<MediaActionResult<SignedUploadUrlResponse>> {
  try {
    const { account } = await requireVerifiedAdvertiser()

    const validated = RequestUploadSchema.safeParse(input)
    if (!validated.success) {
      return {
        success: false,
        error: 'Parâmetros de upload inválidos.',
        fieldErrors: validated.error.flatten().fieldErrors,
      }
    }

    const admin = createAdminClient()
    const profile = await getProfileByAccountUserId(account.id)
    if (!profile) {
      return { success: false, error: 'Perfil não encontrado. Inicie seu perfil primeiro.' }
    }

    const currentCount = await getActivePhotoCount(profile.id)
    const { maxPhotos } = await resolveEntitlements(account.id)
    if (currentCount >= maxPhotos) {
      return {
        success: false,
        error: `Limite de fotos atingido (${maxPhotos} fotos no plano atual).`,
      }
    }

    const mediaId = crypto.randomUUID()
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }
    const ext = extMap[validated.data.mime_type] || 'jpg'
    const storagePath = `profiles/${profile.id}/${mediaId}.${ext}`
    const isFirstPhoto = currentCount === 0

    // 1. Insert record in UPLOADING status
    const { error: dbError } = await admin.from('profile_media').insert({
      id: mediaId,
      profile_id: profile.id,
      storage_path: storagePath,
      status: 'UPLOADING',
      position: currentCount + 1,
      is_primary: isFirstPhoto,
      mime_type: validated.data.mime_type,
      file_size_bytes: validated.data.file_size_bytes,
    })

    if (dbError) {
      console.error('[media:requestUpload] DB error:', dbError.message)
      return { success: false, error: 'Erro ao preparar registro de foto.' }
    }

    // 2. Generate signed upload URL from Supabase Storage bucket
    const { data: signedData, error: storageError } = await admin.storage
      .from('profile-media')
      .createSignedUploadUrl(storagePath)

    if (storageError || !signedData) {
      // Clean up pending row if storage call fails
      await admin.from('profile_media').delete().eq('id', mediaId)
      console.error('[media:requestUpload] Storage error:', storageError?.message)
      return { success: false, error: 'Erro ao gerar URL de upload seguro.' }
    }

    return {
      success: true,
      data: {
        mediaId,
        uploadUrl: signedData.signedUrl,
        storagePath,
        expiresAt: new Date(Date.now() + SIGNED_UPLOAD_URL_TTL_MS).toISOString(),
      },
    }
  } catch (err) {
    console.error('[media:requestUpload] Unexpected error:', err instanceof Error ? err.message : err)
    return { success: false, error: 'Ocorreu um erro ao solicitar o upload.' }
  }
}

/**
 * Server Action: Confirm uploaded photo and transition to PENDING_MODERATION.
 */
export async function confirmMediaUploadAction(
  input: ConfirmUploadInput
): Promise<MediaActionResult<ProfileMedia>> {
  let processingMediaId: string | null = null
  try {
    const { account } = await requireVerifiedAdvertiser()

    const validated = ConfirmUploadSchema.safeParse(input)
    if (!validated.success) {
      return {
        success: false,
        error: 'ID de mídia inválido.',
        fieldErrors: validated.error.flatten().fieldErrors,
      }
    }

    const admin = createAdminClient()
    const profile = await getProfileByAccountUserId(account.id)
    if (!profile) {
      return { success: false, error: 'Perfil não encontrado.' }
    }

    const media = await getMediaById(validated.data.media_id)
    if (!media || media.profile_id !== profile.id) {
      return { success: false, error: 'Foto não encontrada ou não pertence a este perfil.' }
    }

    if (media.status === 'PENDING_MODERATION') {
      return { success: true, data: media }
    }
    if (!['UPLOADING', 'PROCESSING_FAILED'].includes(media.status)) {
      return { success: false, error: 'Esta foto não está aguardando confirmação.' }
    }

    const separator = media.storage_path.lastIndexOf('/')
    const folder = media.storage_path.slice(0, separator)
    const filename = media.storage_path.slice(separator + 1)
    const { data: storedObjects, error: storageError } = await admin.storage
      .from('profile-media')
      .list(folder, { search: filename, limit: 2 })
    const storedObject = storedObjects?.find((object) => object.name === filename)
    if (storageError || !storedObject) {
      return { success: false, error: 'O arquivo ainda não foi recebido pelo armazenamento seguro.' }
    }

    const authoritativeStoredSize = Number(storedObject.metadata?.size)
    if (!Number.isFinite(authoritativeStoredSize) || authoritativeStoredSize < 1) {
      await markMediaProcessingFailed(media.id)
      return { success: false, error: 'Não foi possível validar o tamanho da foto enviada.' }
    }
    if (authoritativeStoredSize > MAX_FILE_SIZE_BYTES) {
      await markMediaProcessingFailed(media.id)
      return { success: false, error: 'A foto excede o limite de 15 MB.' }
    }

    const { data: claimed, error: claimError } = await admin.from('profile_media')
      .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
      .eq('id', media.id)
      .eq('status', media.status)
      .select('id')
      .maybeSingle()
    if (claimError || !claimed) {
      return { success: false, error: 'Esta foto já está sendo processada.' }
    }
    processingMediaId = media.id

    const { data: rawObject, error: downloadError } = await admin.storage
      .from('profile-media')
      .download(media.storage_path)
    if (downloadError || !rawObject) throw new ImageProcessingError('PROCESSING_FAILED')

    const rawBytes = Buffer.from(await rawObject.arrayBuffer())
    const sanitized = await validateAndSanitizeImage(rawBytes)

    // Replace the private object in place. Downstream moderation and public
    // delivery can therefore only reference the decoded, metadata-free bytes.
    const { error: replaceError } = await admin.storage.from('profile-media').upload(
      media.storage_path,
      sanitized.buffer,
      { contentType: sanitized.mimeType, cacheControl: '3600', upsert: true }
    )
    if (replaceError) throw new ImageProcessingError('PROCESSING_FAILED')

    const { data: updated, error } = await admin
      .from('profile_media')
      .update({
        status: 'PENDING_MODERATION',
        mime_type: sanitized.mimeType,
        file_size_bytes: sanitized.fileSizeBytes,
        width: sanitized.width,
        height: sanitized.height,
        updated_at: new Date().toISOString(),
      })
      .eq('id', media.id)
      .eq('status', 'PROCESSING')
      .select('*')
      .single()

    if (error || !updated) throw new ImageProcessingError('PROCESSING_FAILED')

    return { success: true, data: updated as ProfileMedia }
  } catch (error) {
    if (processingMediaId) await markMediaProcessingFailed(processingMediaId)
    console.error('[media:confirmUpload] Image processing failed safely')
    return { success: false, error: safeImageProcessingError(error) }
  }
}

/**
 * Server Action: Reorder photos for the advertiser's profile.
 */
export async function reorderMediaAction(
  input: ReorderMediaInput
): Promise<MediaActionResult<ProfileMedia[]>> {
  try {
    const { account } = await requireVerifiedAdvertiser()

    const validated = ReorderMediaSchema.safeParse(input)
    if (!validated.success) {
      return {
        success: false,
        error: 'Lista de ordenação inválida.',
        fieldErrors: validated.error.flatten().fieldErrors,
      }
    }

    const admin = createAdminClient()
    const profile = await getProfileByAccountUserId(account.id)
    if (!profile) {
      return { success: false, error: 'Perfil não encontrado.' }
    }

    const current = await getProfileMedia(profile.id)
    const submitted = validated.data.media_ids
    if (new Set(submitted).size !== submitted.length || submitted.length !== current.length ||
      submitted.some((id) => !current.some((item) => item.id === id))) {
      return { success: false, error: 'A ordenação precisa incluir exatamente todas as fotos do perfil.' }
    }

    const { error } = await admin.rpc('reorder_profile_media', {
      p_profile_id: profile.id,
      p_media_ids: validated.data.media_ids,
    })

    if (error) {
      console.error('[media:reorder] RPC error:', error.message)
      return { success: false, error: 'Erro ao reordenar as fotos.' }
    }

    const updatedMedia = await getProfileMedia(profile.id)
    return { success: true, data: updatedMedia }
  } catch (err) {
    console.error('[media:reorder] Unexpected error:', err instanceof Error ? err.message : err)
    return { success: false, error: 'Ocorreu um erro ao reordenar fotos.' }
  }
}

/** Reuses a failed canonical record and storage path; it never consumes another quota slot. */
export async function retryMediaUploadUrlAction(
  input: RetryUploadInput
): Promise<MediaActionResult<SignedUploadUrlResponse>> {
  try {
    const { account } = await requireVerifiedAdvertiser()
    const validated = RetryUploadSchema.safeParse(input)
    if (!validated.success) return { success: false, error: 'Arquivo inválido para nova tentativa.' }
    const profile = await getProfileByAccountUserId(account.id)
    if (!profile) return { success: false, error: 'Perfil não encontrado.' }
    const media = await getMediaById(validated.data.media_id)
    if (!media || media.profile_id !== profile.id || media.deleted_at ||
      !['UPLOADING', 'PROCESSING_FAILED'].includes(media.status)) {
      return { success: false, error: 'Esta tentativa de upload não pode ser reutilizada.' }
    }
    if (media.mime_type !== validated.data.mime_type || media.file_size_bytes !== validated.data.file_size_bytes) {
      return { success: false, error: 'Selecione novamente o mesmo arquivo para tentar de novo.' }
    }
    const admin = createAdminClient()
    const { data, error } = await admin.storage.from('profile-media').createSignedUploadUrl(media.storage_path)
    if (error || !data) return { success: false, error: 'Não foi possível preparar a nova tentativa.' }
    await admin.from('profile_media').update({ status: 'UPLOADING', updated_at: new Date().toISOString() }).eq('id', media.id)
    return { success: true, data: { mediaId: media.id, uploadUrl: data.signedUrl, storagePath: media.storage_path, expiresAt: new Date(Date.now() + SIGNED_UPLOAD_URL_TTL_MS).toISOString() } }
  } catch (error) {
    console.error('[media:retryUpload] Unexpected error:', error instanceof Error ? error.message : error)
    return { success: false, error: 'Não foi possível tentar o upload novamente.' }
  }
}

/** Step 05 completion requires one persisted, non-deleted, non-failed photo. */
export async function continueAfterPhotosAction(): Promise<MediaActionResult<void>> {
  const { account } = await requireVerifiedAdvertiser()
  const profile = await getProfileByAccountUserId(account.id)
  if (!profile) return { success: false, error: 'Perfil não encontrado.' }
  const media = await getProfileMedia(profile.id)
  if (!media.some((item) => !['UPLOADING', 'PROCESSING_FAILED', 'DELETED'].includes(item.status))) {
    return { success: false, error: 'Adicione ao menos uma foto enviada com sucesso para continuar.' }
  }
  await submitOwnedProfileForReview(account.id)
  const admin = createAdminClient()
  const { error } = await admin.from('account_users')
    .update({ onboarding_status: 'IN_PROGRESS', onboarding_step: 6 })
    .eq('id', account.id).lt('onboarding_step', 6)
  if (error) return { success: false, error: 'Não foi possível continuar agora.' }
  redirect('/onboarding/revisar')
}

/**
 * Server Action: Set primary photo for the advertiser's profile.
 */
export async function setPrimaryMediaAction(
  input: SetPrimaryMediaInput
): Promise<MediaActionResult<ProfileMedia[]>> {
  try {
    const { account } = await requireVerifiedAdvertiser()

    const validated = SetPrimaryMediaSchema.safeParse(input)
    if (!validated.success) {
      return {
        success: false,
        error: 'ID de foto inválido.',
        fieldErrors: validated.error.flatten().fieldErrors,
      }
    }

    const admin = createAdminClient()
    const profile = await getProfileByAccountUserId(account.id)
    if (!profile) {
      return { success: false, error: 'Perfil não encontrado.' }
    }

    const media = await getMediaById(validated.data.media_id)
    if (!media || media.profile_id !== profile.id || media.deleted_at) {
      return { success: false, error: 'Foto não encontrada.' }
    }

    const { error } = await admin.rpc('set_primary_profile_media', {
      p_profile_id: profile.id,
      p_media_id: media.id,
    })

    if (error) {
      console.error('[media:setPrimary] RPC error:', error.message)
      return { success: false, error: 'Erro ao definir foto principal.' }
    }

    const updatedMedia = await getProfileMedia(profile.id)
    return { success: true, data: updatedMedia }
  } catch (err) {
    console.error('[media:setPrimary] Unexpected error:', err instanceof Error ? err.message : err)
    return { success: false, error: 'Ocorreu um erro ao alterar foto principal.' }
  }
}

/**
 * Server Action: Delete a photo from the advertiser's profile.
 */
export async function deleteMediaAction(
  input: DeleteMediaInput
): Promise<MediaActionResult<ProfileMedia[]>> {
  try {
    const { account } = await requireVerifiedAdvertiser()

    const validated = DeleteMediaSchema.safeParse(input)
    if (!validated.success) {
      return {
        success: false,
        error: 'ID de foto inválido.',
        fieldErrors: validated.error.flatten().fieldErrors,
      }
    }

    const admin = createAdminClient()
    const profile = await getProfileByAccountUserId(account.id)
    if (!profile) {
      return { success: false, error: 'Perfil não encontrado.' }
    }

    const media = await getMediaById(validated.data.media_id)
    if (!media || media.profile_id !== profile.id || media.deleted_at) {
      return { success: false, error: 'Foto não encontrada.' }
    }

    // Soft delete from DB
    await admin
      .from('profile_media')
      .update({
        deleted_at: new Date().toISOString(),
        is_primary: false,
        status: 'DELETED',
      })
      .eq('id', media.id)

    // If was primary, promote next available photo
    if (media.is_primary) {
      const remaining = await getProfileMedia(profile.id)
      if (remaining.length > 0) {
        const replacement = remaining.find((item) => item.status === 'APPROVED') ?? remaining[0]
        await admin.rpc('set_primary_profile_media', {
          p_profile_id: profile.id,
          p_media_id: replacement.id,
        })
      }
    }

    const updatedMedia = await getProfileMedia(profile.id)
    return { success: true, data: updatedMedia }
  } catch (err) {
    console.error('[media:delete] Unexpected error:', err instanceof Error ? err.message : err)
    return { success: false, error: 'Ocorreu um erro ao excluir foto.' }
  }
}
