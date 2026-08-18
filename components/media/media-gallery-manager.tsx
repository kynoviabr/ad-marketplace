'use client'

import { useState, useTransition, useRef } from 'react'
import type { ProfileMedia } from '@/modules/media/types'
import {
  requestMediaUploadUrlAction,
  confirmMediaUploadAction,
  setPrimaryMediaAction,
  deleteMediaAction,
} from '@/modules/media/actions'
import { MAX_PHOTOS_PER_PROFILE } from '@/modules/media/schemas'

interface MediaGalleryManagerProps {
  initialMedia: ProfileMedia[]
  onUpdated?: () => void
}

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  UPLOADING: { text: 'Enviando...', color: 'bg-blue-100 text-blue-800' },
  PROCESSING: { text: 'Processando...', color: 'bg-yellow-100 text-yellow-800' },
  PENDING_MODERATION: { text: 'Aguardando Moderação', color: 'bg-amber-100 text-amber-800' },
  APPROVED: { text: 'Aprovada', color: 'bg-emerald-100 text-emerald-800' },
  REJECTED: { text: 'Rejeitada', color: 'bg-rose-100 text-rose-800' },
  QUARANTINED: { text: 'Em Análise', color: 'bg-purple-100 text-purple-800' },
  DELETED: { text: 'Excluída', color: 'bg-gray-100 text-gray-500' },
}

export function MediaGalleryManager({ initialMedia, onUpdated }: MediaGalleryManagerProps) {
  const [mediaList, setMediaList] = useState<ProfileMedia[]>(initialMedia)
  const [isPending, startTransition] = useTransition()
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeMedia = mediaList.filter((m) => !m.deleted_at)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFeedback(null)
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFeedback({ type: 'error', message: 'Formato inválido. Selecione JPEG, PNG ou WebP.' })
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'O arquivo excede o limite de 15 MB.' })
      return
    }

    if (activeMedia.length >= MAX_PHOTOS_PER_PROFILE) {
      setFeedback({
        type: 'error',
        message: `Limite de ${MAX_PHOTOS_PER_PROFILE} fotos atingido para este plano.`,
      })
      return
    }

    setUploadProgress('Solicitando autorização de upload...')

    try {
      // 1. Request signed upload URL from backend
      const reqResult = await requestMediaUploadUrlAction({
        mime_type: file.type as any,
        file_size_bytes: file.size,
      })

      if (!reqResult.success) {
        setFeedback({ type: 'error', message: reqResult.error })
        setUploadProgress(null)
        return
      }

      setUploadProgress('Enviando imagem diretamente para o storage seguro...')

      // 2. Upload file directly to Supabase storage signed URL
      const uploadResponse = await fetch(reqResult.data.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      })

      if (!uploadResponse.ok) {
        setFeedback({ type: 'error', message: 'Falha no envio para o storage.' })
        setUploadProgress(null)
        return
      }

      setUploadProgress('Registrando foto e enviando para moderação...')

      // 3. Confirm upload
      const confirmResult = await confirmMediaUploadAction({
        media_id: reqResult.data.mediaId,
      })

      if (confirmResult.success) {
        setMediaList((prev) => [...prev, confirmResult.data])
        setFeedback({
          type: 'success',
          message: 'Foto enviada com sucesso! Ela foi enviada para a fila de moderação.',
        })
        if (onUpdated) onUpdated()
      } else {
        setFeedback({ type: 'error', message: confirmResult.error })
      }
    } catch (err) {
      console.error('Upload error:', err)
      setFeedback({ type: 'error', message: 'Ocorreu um erro inesperado durante o upload.' })
    } finally {
      setUploadProgress(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSetPrimary = (mediaId: string) => {
    setFeedback(null)
    startTransition(async () => {
      const result = await setPrimaryMediaAction({ media_id: mediaId })
      if (result.success) {
        setMediaList(result.data)
        setFeedback({ type: 'success', message: 'Foto principal atualizada!' })
        if (onUpdated) onUpdated()
      } else {
        setFeedback({ type: 'error', message: result.error })
      }
    })
  }

  const handleDelete = (mediaId: string) => {
    if (!confirm('Tem certeza de que deseja excluir esta foto?')) return

    setFeedback(null)
    startTransition(async () => {
      const result = await deleteMediaAction({ media_id: mediaId })
      if (result.success) {
        setMediaList(result.data)
        setFeedback({ type: 'success', message: 'Foto excluída com sucesso.' })
        if (onUpdated) onUpdated()
      } else {
        setFeedback({ type: 'error', message: result.error })
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header with quota */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Galeria de Fotos do Perfil</h3>
          <p className="text-xs text-gray-500 mt-1">
            Envie até {MAX_PHOTOS_PER_PROFILE} fotos. Todas as fotos passam por verificação de moderação
            antes da exibição pública no marketplace.
          </p>
        </div>
        <div className="text-right">
          <span className="inline-block bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-200">
            {activeMedia.length} / {MAX_PHOTOS_PER_PROFILE} fotos
          </span>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-lg text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Upload Dropzone */}
      <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors rounded-xl p-6 text-center bg-slate-50">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileUpload}
          disabled={Boolean(uploadProgress) || activeMedia.length >= MAX_PHOTOS_PER_PROFILE}
          className="hidden"
          id="photo-upload-input"
        />
        <label
          htmlFor="photo-upload-input"
          className={`flex flex-col items-center justify-center cursor-pointer ${
            activeMedia.length >= MAX_PHOTOS_PER_PROFILE ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl mb-2">
            📸
          </div>
          <span className="text-sm font-bold text-gray-800">
            {uploadProgress ? uploadProgress : 'Clique para adicionar uma nova foto'}
          </span>
          <span className="text-xs text-gray-500 mt-1">
            Suporta JPEG, PNG e WebP de até 15 MB. Metadados EXIF e GPS são removidos automaticamente.
          </span>
        </label>
      </div>

      {/* Media Grid */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-gray-800">Suas Fotos Cadastradas</h4>

        {activeMedia.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-gray-200 text-gray-400 text-xs">
            Nenhuma foto cadastrada ainda. Adicione sua primeira foto acima.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {activeMedia.map((media) => {
              const statusInfo = STATUS_LABELS[media.status] || {
                text: media.status,
                color: 'bg-gray-100 text-gray-800',
              }

              return (
                <div
                  key={media.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col justify-between"
                >
                  {/* Photo Preview Container */}
                  <div className="relative aspect-[3/4] bg-slate-100 flex flex-col items-center justify-center p-2 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 font-bold text-lg mb-1">
                      🖼️
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">
                      Posição #{media.position}
                    </span>

                    {/* Primary Badge */}
                    {media.is_primary && (
                      <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                        ★ Principal
                      </div>
                    )}

                    {/* Status Badge */}
                    <div
                      className={`absolute bottom-2 inset-x-2 text-center text-[10px] font-bold py-0.5 px-1 rounded shadow-sm ${statusInfo.color}`}
                    >
                      {statusInfo.text}
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="p-2 border-t flex items-center justify-between gap-1 text-[11px]">
                    {!media.is_primary ? (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(media.id)}
                        disabled={isPending}
                        className="text-blue-600 hover:underline font-semibold cursor-pointer"
                      >
                        Tornar Principal
                      </button>
                    ) : (
                      <span className="text-gray-400 font-medium">Principal</span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(media.id)}
                      disabled={isPending}
                      className="text-rose-600 hover:underline font-semibold cursor-pointer"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
