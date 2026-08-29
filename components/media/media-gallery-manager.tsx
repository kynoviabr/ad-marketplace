'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { confirmMediaUploadAction, continueAfterPhotosAction, deleteMediaAction, reorderMediaAction, requestMediaUploadUrlAction, retryMediaUploadUrlAction, setPrimaryMediaAction } from '@/modules/media/actions'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, MAX_PHOTOS_PER_PROFILE } from '@/modules/media/schemas'
import type { AllowedMimeType, ManageableProfileMedia, MediaStatus, ProfileMedia } from '@/modules/media/types'

const STATUS_LABELS: Record<MediaStatus, string> = {
  UPLOADING: 'Enviando', PROCESSING: 'Processando', PENDING_MODERATION: 'Em análise', APPROVED: 'Aprovada',
  PROCESSING_FAILED: 'Falha no processamento', REJECTED: 'Não aprovada', QUARANTINED: 'Indisponível', DELETED: 'Removida',
}
const STATUS_HELP: Partial<Record<MediaStatus, string>> = {
  PENDING_MODERATION: 'Esta foto ainda não aparece no perfil público.',
  REJECTED: 'Esta foto não foi aprovada.',
  PROCESSING_FAILED: 'Não foi possível processar esta foto.',
  QUARANTINED: 'Esta foto não está disponível no momento.',
}
type UploadItem = { key: string; name: string; state: string; error?: string; mediaId?: string; file: File }

function mergeMedia(current: ManageableProfileMedia[], next: ProfileMedia[]): ManageableProfileMedia[] {
  return next.map((item) => ({ ...item, previewUrl: current.find((old) => old.id === item.id)?.previewUrl ?? null }))
}

export function MediaGalleryManager({ initialMedia, showOnboardingNavigation = false, mode = 'onboarding' }: {
  initialMedia: Array<ProfileMedia | ManageableProfileMedia>
  showOnboardingNavigation?: boolean
  mode?: 'onboarding' | 'dashboard'
}) {
  const [media, setMedia] = useState<ManageableProfileMedia[]>(() => initialMedia.map((item) => ({ ...item, previewUrl: 'previewUrl' in item ? item.previewUrl : null })))
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const objectUrls = useRef(new Set<string>())
  const active = media.filter((item) => !item.deleted_at && item.status !== 'DELETED')
  const approvedCount = active.filter((item) => item.status === 'APPROVED').length
  const pendingCount = active.filter((item) => ['UPLOADING', 'PROCESSING', 'PENDING_MODERATION'].includes(item.status)).length
  const limitReached = active.length >= MAX_PHOTOS_PER_PROFILE
  const canContinue = active.some((item) => !['UPLOADING', 'PROCESSING_FAILED'].includes(item.status))
  const updateUpload = (key: string, patch: Partial<UploadItem>) => setUploads((items) => items.map((item) => item.key === key ? { ...item, ...patch } : item))

  useEffect(() => () => { objectUrls.current.forEach((url) => URL.revokeObjectURL(url)) }, [])

  const validate = (file: File): string | null => {
    if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) return 'Use uma imagem JPEG, PNG ou WebP.'
    if (file.size < 1 || file.size > MAX_FILE_SIZE_BYTES) return 'Cada imagem deve ter no máximo 15 MB.'
    return null
  }

  const uploadFile = async (item: UploadItem, retry = false) => {
    const invalid = validate(item.file)
    if (invalid) return updateUpload(item.key, { state: 'Não enviada', error: invalid })
    updateUpload(item.key, { state: 'Preparando…', error: undefined })
    if (retry && item.mediaId) {
      const existing = await confirmMediaUploadAction({ media_id: item.mediaId })
      if (existing.success) {
        const previewUrl = URL.createObjectURL(item.file)
        objectUrls.current.add(previewUrl)
        setMedia((current) => [...current.filter((photo) => photo.id !== existing.data.id), { ...existing.data, previewUrl }].sort((a, b) => a.position - b.position))
        updateUpload(item.key, { state: 'Em análise', error: undefined })
        return
      }
    }
    const request = retry && item.mediaId
      ? await retryMediaUploadUrlAction({ media_id: item.mediaId, mime_type: item.file.type as AllowedMimeType, file_size_bytes: item.file.size })
      : await requestMediaUploadUrlAction({ mime_type: item.file.type as AllowedMimeType, file_size_bytes: item.file.size })
    if (!request.success) return updateUpload(item.key, { state: 'Não enviada', error: request.error })
    updateUpload(item.key, { state: 'Enviando…', mediaId: request.data.mediaId })
    try {
      const response = await fetch(request.data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': item.file.type }, body: item.file })
      if (!response.ok) throw new Error('Falha no envio ao armazenamento seguro.')
      updateUpload(item.key, { state: 'Processando…' })
      const confirmed = await confirmMediaUploadAction({ media_id: request.data.mediaId })
      if (!confirmed.success) throw new Error(confirmed.error)
      const previewUrl = URL.createObjectURL(item.file)
      objectUrls.current.add(previewUrl)
      setMedia((current) => [...current.filter((photo) => photo.id !== confirmed.data.id), { ...confirmed.data, previewUrl }].sort((a, b) => a.position - b.position))
      updateUpload(item.key, { state: 'Em análise' })
    } catch (error) {
      updateUpload(item.key, { state: 'Falha no envio', error: error instanceof Error ? error.message : 'Não foi possível enviar.' })
    }
  }

  const onFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null)
    const selected = Array.from(event.target.files ?? [])
    const available = MAX_PHOTOS_PER_PROFILE - active.length
    const files = selected.slice(0, available)
    if (selected.length > available) setMessage(`Você pode adicionar somente mais ${available} foto(s).`)
    const items = files.map((file) => ({ key: crypto.randomUUID(), name: file.name, state: 'Na fila', file }))
    setUploads((current) => [...current, ...items])
    for (const item of items) await uploadFile(item)
    event.target.value = ''
  }

  const onRetryFile = async (event: React.ChangeEvent<HTMLInputElement>, photo: ManageableProfileMedia) => {
    const file = event.target.files?.[0]
    if (!file) return
    const item = { key: crypto.randomUUID(), name: file.name, state: 'Na fila', file, mediaId: photo.id }
    setUploads((current) => [...current, item])
    await uploadFile(item, true)
    event.target.value = ''
  }

  const mutate = (operation: () => Promise<{ success: true; data: ProfileMedia[] } | { success: false; error: string }>, success: string) => {
    setMessage(null)
    startTransition(async () => {
      const result = await operation()
      if (result.success) { setMedia((current) => mergeMedia(current, result.data)); setMessage(success) }
      else setMessage(result.error)
    })
  }
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= active.length) return
    const reordered = [...active]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    mutate(() => reorderMediaAction({ media_ids: reordered.map((item) => item.id) }), 'Ordem das fotos atualizada.')
  }
  const remove = (id: string) => {
    if (!window.confirm('Excluir esta foto? Ela será removida do seu perfil.')) return
    mutate(() => deleteMediaAction({ media_id: id }), 'Foto excluída do perfil.')
  }
  const proceed = () => startTransition(async () => {
    const result = await continueAfterPhotosAction()
    if (!result.success) setMessage(result.error)
  })

  return <section className={`photo-manager photo-manager--${mode}`} aria-label={mode === 'dashboard' ? 'Gerenciar galeria de fotos' : undefined} aria-labelledby={mode === 'onboarding' ? 'photo-manager-title' : undefined}>
    <div className="photo-manager-head">
      <div>{mode === 'onboarding' ? <><p className="onboarding-eyebrow">FOTOS</p><h2 id="photo-manager-title">Sua galeria</h2></> : <><p className="photo-count"><strong>{active.length} foto{active.length === 1 ? '' : 's'}</strong><span>{approvedCount} aprovada{approvedCount === 1 ? '' : 's'} · {pendingCount} em análise</span></p></>}</div>
      <span aria-live="polite">{active.length} de {MAX_PHOTOS_PER_PROFILE} fotos</span>
    </div>
    <div className="photo-upload-row">
      <p className="photo-guidance">JPEG, PNG ou WebP, até 15 MB. Fotos em análise ainda não aparecem no seu perfil público.</p>
      <input id={`photo-files-${mode}`} className="photo-file-input" type="file" multiple accept={ALLOWED_MIME_TYPES.join(',')} onChange={onFiles} disabled={limitReached || isPending} />
      <label className={`photo-add ${limitReached ? 'is-disabled' : ''}`} htmlFor={`photo-files-${mode}`} aria-disabled={limitReached}><span aria-hidden="true">＋</span> Adicionar fotos</label>
    </div>
    {limitReached ? <p className="photo-limit" role="status">Você chegou ao limite de {MAX_PHOTOS_PER_PROFILE} fotos.</p> : null}
    {uploads.length > 0 ? <ul className="photo-upload-list" aria-live="polite">{uploads.map((item) => <li key={item.key}><span><b>{item.name}</b><small>{item.error ?? item.state}</small></span>{item.error && item.mediaId ? <button type="button" onClick={() => uploadFile(item, true)}>Tentar novamente</button> : null}</li>)}</ul> : null}
    {message ? <p className="photo-message" role="status">{message}</p> : null}
    {active.length === 0 ? <div className="photo-empty"><p className="dashboard-eyebrow">SUA GALERIA</p><h3>Seu perfil começa<br />pelas imagens.</h3><p>Adicione uma foto para começar a construir sua presença na Velvet.</p><label className="photo-add" htmlFor={`photo-files-${mode}`}><span aria-hidden="true">＋</span> Adicionar primeira foto</label></div> : <ol className="photo-grid">{active.map((item, index) => <li key={item.id} className={`photo-item ${item.is_primary ? 'is-primary' : ''}`}>
      <div className="photo-preview">{item.previewUrl ? <Image src={item.previewUrl} alt={`Foto ${index + 1} do perfil${item.is_primary ? ', foto principal' : ''}`} fill sizes={item.is_primary ? '(max-width: 600px) 100vw, 520px' : '(max-width: 600px) 50vw, 300px'} unoptimized={item.previewUrl.startsWith('blob:')} /> : <span>Prévia indisponível</span>}{item.is_primary ? <b className="photo-primary"><i aria-hidden="true">V</i> PRINCIPAL</b> : null}<span className={`photo-status photo-status--${item.status.toLowerCase()}`}>{STATUS_LABELS[item.status]}</span></div>
      {STATUS_HELP[item.status] ? <p className="photo-status-help">{STATUS_HELP[item.status]}</p> : null}
      {mode === 'dashboard' ? <details className="photo-menu"><summary aria-label={`Abrir ações da foto ${index + 1}`}>Opções <span aria-hidden="true">•••</span></summary><div>
        {!item.is_primary ? <button type="button" disabled={isPending} onClick={() => mutate(() => setPrimaryMediaAction({ media_id: item.id }), 'Foto principal atualizada.')}>Tornar principal</button> : null}
        <button type="button" disabled={isPending || index === 0} onClick={() => move(index, -1)}>Mover antes</button>
        <button type="button" disabled={isPending || index === active.length - 1} onClick={() => move(index, 1)}>Mover depois</button>
        {item.status === 'PROCESSING_FAILED' ? <><input id={`retry-${item.id}`} className="photo-file-input" type="file" accept={ALLOWED_MIME_TYPES.join(',')} onChange={(event) => onRetryFile(event, item)} /><label htmlFor={`retry-${item.id}`}>Tentar novamente</label></> : null}
        <button type="button" className="photo-remove" disabled={isPending} onClick={() => remove(item.id)}>Excluir</button>
      </div></details> : <div className="photo-actions">{!item.is_primary ? <button type="button" disabled={isPending} onClick={() => mutate(() => setPrimaryMediaAction({ media_id: item.id }), 'Foto principal atualizada.')}>Definir principal</button> : null}<button type="button" aria-label={`Mover foto ${index + 1} para antes`} disabled={isPending || index === 0} onClick={() => move(index, -1)}>←</button><button type="button" aria-label={`Mover foto ${index + 1} para depois`} disabled={isPending || index === active.length - 1} onClick={() => move(index, 1)}>→</button><button type="button" className="photo-remove" disabled={isPending} onClick={() => remove(item.id)}>Remover</button></div>}
    </li>)}</ol>}
    {showOnboardingNavigation ? <div className="onboarding-actions photo-manager-actions"><Link className="onboarding-secondary" href="/onboarding/verificacao">Voltar</Link><button type="button" className="onboarding-primary" disabled={!canContinue || isPending} onClick={proceed}>Continuar <span aria-hidden="true">→</span></button></div> : null}
  </section>
}
