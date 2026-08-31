'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { confirmMediaUploadAction, continueAfterPhotosAction, deleteMediaAction, reorderMediaAction, requestMediaUploadUrlAction, retryMediaUploadUrlAction, setPrimaryMediaAction } from '@/modules/media/actions'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, MAX_PHOTOS_PER_PROFILE } from '@/modules/media/schemas'
import type { AllowedMimeType, ManageableProfileMedia, MediaStatus, ProfileMedia } from '@/modules/media/types'
import { useI18n } from '@/components/i18n'
type UploadItem = { key: string; name: string; state: string; error?: string; mediaId?: string; file: File }

function mergeMedia(current: ManageableProfileMedia[], next: ProfileMedia[]): ManageableProfileMedia[] {
  return next.map((item) => ({ ...item, previewUrl: current.find((old) => old.id === item.id)?.previewUrl ?? null }))
}

export function MediaGalleryManager({ initialMedia, showOnboardingNavigation = false, mode = 'onboarding' }: {
  initialMedia: Array<ProfileMedia | ManageableProfileMedia>
  showOnboardingNavigation?: boolean
  mode?: 'onboarding' | 'dashboard'
}) {
  const { locale, t } = useI18n()
  const statusLabels: Record<MediaStatus, string> = {
    UPLOADING: t('media.status.UPLOADING'), PROCESSING: t('media.status.PROCESSING'),
    PENDING_MODERATION: t('media.status.PENDING_MODERATION'), APPROVED: t('media.status.APPROVED'),
    PROCESSING_FAILED: t('media.status.PROCESSING_FAILED'), REJECTED: t('media.status.REJECTED'),
    QUARANTINED: t('media.status.QUARANTINED'), DELETED: t('media.status.DELETED'),
  }
  const statusHelp: Partial<Record<MediaStatus, string>> = {
    PENDING_MODERATION: t('media.help.PENDING_MODERATION'), REJECTED: t('media.help.REJECTED'),
    PROCESSING_FAILED: t('media.help.PROCESSING_FAILED'), QUARANTINED: t('media.help.QUARANTINED'),
  }
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

  return <section className={`photo-manager photo-manager--${mode}`} aria-label={mode === 'dashboard' ? t('media.manageGallery') : undefined} aria-labelledby={mode === 'onboarding' ? 'photo-manager-title' : undefined}>
    <div className="photo-manager-head">
      <div>{mode === 'onboarding' ? <><p className="onboarding-eyebrow">{t('onboarding.step.photos').toUpperCase()}</p><h2 id="photo-manager-title">{t('media.gallery')}</h2></> : <><p className="photo-count"><strong>{active.length} {locale === 'en' ? 'photo(s)' : 'foto(s)'}</strong><span>{approvedCount} {locale === 'en' ? 'approved' : 'aprovada(s)'} · {pendingCount} {locale === 'en' ? 'under review' : 'em análise'}</span></p></>}</div>
      <span aria-live="polite">{t('media.photoCount', { count: active.length, max: MAX_PHOTOS_PER_PROFILE })}</span>
    </div>
    <div className="photo-upload-row">
      <p className="photo-guidance">{t('media.guidance')}</p>
      <input id={`photo-files-${mode}`} className="photo-file-input" type="file" multiple accept={ALLOWED_MIME_TYPES.join(',')} onChange={onFiles} disabled={limitReached || isPending} />
      <label className={`photo-add ${limitReached ? 'is-disabled' : ''}`} htmlFor={`photo-files-${mode}`} aria-disabled={limitReached}><span aria-hidden="true">＋</span> {t('media.addPhotos')}</label>
    </div>
    {limitReached ? <p className="photo-limit" role="status">{t('media.limit', { count: MAX_PHOTOS_PER_PROFILE })}</p> : null}
    {uploads.length > 0 ? <ul className="photo-upload-list" aria-live="polite">{uploads.map((item) => <li key={item.key}><span><b>{item.name}</b><small>{item.error ?? item.state}</small></span>{item.error && item.mediaId ? <button type="button" onClick={() => uploadFile(item, true)}>{t('media.retry')}</button> : null}</li>)}</ul> : null}
    {message ? <p className="photo-message" role="status">{message}</p> : null}
    {active.length === 0 ? <div className="photo-empty"><p className="dashboard-eyebrow">{t('media.yourGallery')}</p><h3>{t('media.emptyTitle').split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h3><p>{t('media.emptyDescription')}</p><label className="photo-add" htmlFor={`photo-files-${mode}`}><span aria-hidden="true">＋</span> {t('media.addFirst')}</label></div> : <ol className="photo-grid">{active.map((item, index) => <li key={item.id} className={`photo-item ${item.is_primary ? 'is-primary' : ''}`}>
      <div className="photo-preview">{item.previewUrl ? <Image src={item.previewUrl} alt={t(item.is_primary ? 'media.primaryPhotoAlt' : 'media.photoAlt', { number: index + 1 })} fill sizes={item.is_primary ? '(max-width: 600px) 100vw, 520px' : '(max-width: 600px) 50vw, 300px'} unoptimized={item.previewUrl.startsWith('blob:')} /> : <span>{t('media.previewUnavailable')}</span>}{item.is_primary ? <b className="photo-primary"><i aria-hidden="true">V</i> {t('media.primary')}</b> : null}<span className={`photo-status photo-status--${item.status.toLowerCase()}`}>{statusLabels[item.status]}</span></div>
      {statusHelp[item.status] ? <p className="photo-status-help">{statusHelp[item.status]}</p> : null}
      {mode === 'dashboard' ? <details className="photo-menu"><summary aria-label={t('media.openActions', { number: index + 1 })}>{t('media.options')} <span aria-hidden="true">•••</span></summary><div>
        {!item.is_primary ? <button type="button" disabled={isPending} onClick={() => mutate(() => setPrimaryMediaAction({ media_id: item.id }), 'Foto principal atualizada.')}>{t('media.makePrimary')}</button> : null}
        <button type="button" disabled={isPending || index === 0} onClick={() => move(index, -1)}>{t('media.moveBefore')}</button>
        <button type="button" disabled={isPending || index === active.length - 1} onClick={() => move(index, 1)}>{t('media.moveAfter')}</button>
        {item.status === 'PROCESSING_FAILED' ? <><input id={`retry-${item.id}`} className="photo-file-input" type="file" accept={ALLOWED_MIME_TYPES.join(',')} onChange={(event) => onRetryFile(event, item)} /><label htmlFor={`retry-${item.id}`}>Tentar novamente</label></> : null}
        <button type="button" className="photo-remove" disabled={isPending} onClick={() => remove(item.id)}>{t('media.delete')}</button>
      </div></details> : <div className="photo-actions">{!item.is_primary ? <button type="button" disabled={isPending} onClick={() => mutate(() => setPrimaryMediaAction({ media_id: item.id }), 'Foto principal atualizada.')}>{t('media.setPrimary')}</button> : null}<button type="button" aria-label={`${t('media.moveBefore')} ${index + 1}`} disabled={isPending || index === 0} onClick={() => move(index, -1)}>←</button><button type="button" aria-label={`${t('media.moveAfter')} ${index + 1}`} disabled={isPending || index === active.length - 1} onClick={() => move(index, 1)}>→</button><button type="button" className="photo-remove" disabled={isPending} onClick={() => remove(item.id)}>{t('media.remove')}</button></div>}
    </li>)}</ol>}
    {showOnboardingNavigation ? <div className="onboarding-actions photo-manager-actions"><Link className="onboarding-secondary" href="/onboarding/verificacao">{t('common.back')}</Link><button type="button" className="onboarding-primary" disabled={!canContinue || isPending} onClick={proceed}>{t('common.continue')} <span aria-hidden="true">→</span></button></div> : null}
  </section>
}
