'use client'

import { useState, useEffect, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { AdminProfileDetailedReview } from '@/modules/admin/types'
import {
  adminApproveProfileAction,
  adminRejectProfileAction,
  adminSuspendProfileAction,
  adminReactivateProfileAction,
} from '@/modules/admin/actions'
import { formatDate } from '@/lib/i18n/format'
import { useI18n } from '@/components/i18n'

interface AdminProfileReviewPanelProps {
  detail: AdminProfileDetailedReview
  onSuccessUrl?: string
  onClose?: () => void
}

type TabType = 'overview' | 'media' | 'didit' | 'services' | 'history'

const REJECTION_REASONS = [
  { code: 'INAPPROPRIATE_CONTENT', label: 'Conteúdo inadequado ou ilícito' },
  { code: 'UNDERAGE_SUSPICION', label: 'Suspeita de menor de idade' },
  { code: 'MISLEADING_INFORMATION', label: 'Informações falsas ou enganosas' },
  { code: 'CONTACT_POLICY_VIOLATION', label: 'Dados de contato fora das diretrizes' },
  { code: 'INSUFFICIENT_QUALITY', label: 'Qualidade da apresentação insuficiente' },
  { code: 'OTHER_POLICY_VIOLATION', label: 'Outra violação de diretrizes' },
]

const SUSPENSION_REASONS = [
  { code: 'TERMS_VIOLATION', label: 'Violação dos Termos de Uso' },
  { code: 'SUSPICIOUS_ACTIVITY', label: 'Atividade suspeita ou sob investigação' },
  { code: 'CUSTOMER_COMPLAINTS', label: 'Denúncias reiteradas de clientes' },
  { code: 'COMMERCIAL_MISCONDUCT', label: 'Conduta comercial irregular' },
  { code: 'LEGAL_REQUEST', label: 'Solicitação judicial ou notificação legal' },
  { code: 'OTHER_SAFETY_REASON', label: 'Outro motivo operacional ou de segurança' },
]

export function AdminProfileReviewPanel({
  detail,
  onSuccessUrl,
  onClose,
}: AdminProfileReviewPanelProps) {
  const router = useRouter()
  const { locale, t } = useI18n()
  const isPt = locale === 'pt-BR'

  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Moderation state
  const [isPending, startTransition] = useTransition()
  const [operatorNotes, setOperatorNotes] = useState('')
  const [selectedReason, setSelectedReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendNotes, setSuspendNotes] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Keyboard accessibility: Escape key closes lightbox and modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxUrl) setLightboxUrl(null)
        if (showRejectModal) setShowRejectModal(false)
        if (showSuspendModal) setShowSuspendModal(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxUrl, showRejectModal, showSuspendModal])

  const isReviewable =
    detail.profileStatus === 'READY_FOR_REVIEW' &&
    detail.contentModerationStatus !== 'APPROVED' &&
    detail.contentModerationStatus !== 'REJECTED'

  const handleApprove = () => {
    if (
      !confirm(
        isPt
          ? `Confirmar aprovação do perfil de "${detail.stageName}"? Todos os requisitos de publicação serão validados atomicamente no servidor.`
          : `Confirm approval for profile "${detail.stageName}"? All publication requirements will be validated atomically on the server.`
      )
    ) {
      return
    }

    setErrorMsg(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const res = await adminApproveProfileAction({
        profileId: detail.profileId,
        notes: operatorNotes.trim() || undefined,
      })

      if (!res.success) {
        setErrorMsg(res.message || res.error || (isPt ? 'Erro ao aprovar perfil.' : 'Failed to approve profile.'))
      } else {
        setSuccessMsg(res.message || (isPt ? 'Perfil aprovado com sucesso.' : 'Profile approved successfully.'))
        if (onSuccessUrl) {
          router.push(onSuccessUrl)
        } else {
          router.refresh()
        }
      }
    })
  }

  const handleReject = () => {
    if (!selectedReason) {
      setErrorMsg(isPt ? 'Selecione um motivo obrigatório para a rejeição.' : 'Select a mandatory rejection reason.')
      return
    }

    setErrorMsg(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const res = await adminRejectProfileAction({
        profileId: detail.profileId,
        reasonCode: selectedReason,
        notes: operatorNotes.trim() || undefined,
      })

      if (!res.success) {
        setErrorMsg(res.message || res.error || (isPt ? 'Erro ao rejeitar perfil.' : 'Failed to reject profile.'))
      } else {
        setSuccessMsg(res.message || (isPt ? 'Perfil rejeitado com sucesso.' : 'Profile rejected successfully.'))
        setShowRejectModal(false)
        if (onSuccessUrl) {
          router.push(onSuccessUrl)
        } else {
          router.refresh()
        }
      }
    })
  }

  const handleSuspend = () => {
    if (!suspendReason) {
      setErrorMsg(isPt ? 'Selecione um motivo obrigatório para a suspensão.' : 'Select a mandatory suspension reason.')
      return
    }

    if (
      !confirm(
        isPt
          ? `Confirmar suspensão do perfil de "${detail.stageName}"? O perfil sairá imediatamente do ar.`
          : `Confirm suspension of profile "${detail.stageName}"? The profile will be unpublished immediately.`
      )
    ) {
      return
    }

    setErrorMsg(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const res = await adminSuspendProfileAction({
        profileId: detail.profileId,
        reasonCode: suspendReason,
        notes: suspendNotes.trim() || undefined,
      })

      if (!res.success) {
        setErrorMsg(res.message || res.error || (isPt ? 'Erro ao suspender perfil.' : 'Failed to suspend profile.'))
      } else {
        setSuccessMsg(res.message || (isPt ? 'Perfil suspenso com sucesso.' : 'Profile suspended successfully.'))
        setShowSuspendModal(false)
        if (onSuccessUrl) {
          router.push(onSuccessUrl)
        } else {
          router.refresh()
        }
      }
    })
  }

  const handleReactivate = () => {
    if (
      !confirm(
        isPt
          ? `Confirmar reativação do perfil de "${detail.stageName}"? Todos os critérios de publicação serão revalidados.`
          : `Confirm reactivation for profile "${detail.stageName}"? All publication criteria will be revalidated.`
      )
    ) {
      return
    }

    setErrorMsg(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const res = await adminReactivateProfileAction({ profileId: detail.profileId })
      if (!res.success) {
        setErrorMsg(res.message || res.error || (isPt ? 'Falha ao reativar perfil.' : 'Failed to reactivate profile.'))
      } else {
        setSuccessMsg(res.message || (isPt ? 'Perfil reativado com sucesso.' : 'Profile reactivated successfully.'))
        if (onSuccessUrl) {
          router.push(onSuccessUrl)
        } else {
          router.refresh()
        }
      }
    })
  }

  // Primary photo
  const primaryPhoto = detail.photos.find((p) => p.isPrimary && p.status === 'APPROVED') || detail.photos[0]

  return (
    <article
      aria-label={isPt ? `Revisão operacional de ${detail.stageName}` : `Operational review of ${detail.stageName}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#111827',
        border: '1px solid #374151',
        borderRadius: '.5rem',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {/* Profile Header Bar */}
      <header
        style={{
          padding: '1.25rem 1.5rem',
          backgroundColor: '#1f2937',
          borderBottom: '1px solid #374151',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Avatar Thumbnail */}
          <div
            style={{
              position: 'relative',
              width: '56px',
              height: '56px',
              borderRadius: '9999px',
              overflow: 'hidden',
              backgroundColor: '#374151',
              flexShrink: 0,
              border: '2px solid #4b5563',
            }}
          >
            {primaryPhoto?.previewUrl ? (
              <Image
                src={primaryPhoto.previewUrl}
                alt={detail.stageName}
                fill
                sizes="56px"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#9ca3af',
                  fontWeight: 700,
                  fontSize: '1.25rem',
                }}
              >
                {detail.stageName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
              <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                {detail.stageName}
              </h2>
              <span style={{ color: '#9ca3af', fontSize: '.8rem', fontFamily: 'monospace' }}>
                @{detail.slug}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '.5rem', marginTop: '.35rem', flexWrap: 'wrap' }}>
              {/* Operational Classification Badge */}
              <span
                style={{
                  backgroundColor:
                    detail.operationalClassification === 'NEEDS_REVIEW'
                      ? '#78350f'
                      : detail.operationalClassification === 'ACTIVE'
                      ? '#064e3b'
                      : detail.operationalClassification === 'SUSPENDED'
                      ? '#7f1d1d'
                      : '#374151',
                  color:
                    detail.operationalClassification === 'NEEDS_REVIEW'
                      ? '#fde68a'
                      : detail.operationalClassification === 'ACTIVE'
                      ? '#a7f3d0'
                      : detail.operationalClassification === 'SUSPENDED'
                      ? '#fecaca'
                      : '#d1d5db',
                  padding: '.15rem .5rem',
                  borderRadius: '4px',
                  fontSize: '.7rem',
                  fontWeight: 600,
                }}
              >
                {detail.operationalClassification}
              </span>

              {/* Didit Badge */}
              <span
                style={{
                  backgroundColor: detail.didit.identityVerified && detail.didit.ageVerified ? '#064e3b' : '#374151',
                  color: detail.didit.identityVerified && detail.didit.ageVerified ? '#a7f3d0' : '#d1d5db',
                  padding: '.15rem .5rem',
                  borderRadius: '4px',
                  fontSize: '.7rem',
                  fontWeight: 600,
                }}
              >
                DIDIT: {detail.didit.status}
              </span>

              {/* Publication State */}
              <span
                style={{
                  backgroundColor: detail.publicationState === 'PUBLIC' ? '#064e3b' : '#374151',
                  color: detail.publicationState === 'PUBLIC' ? '#a7f3d0' : '#fbbf24',
                  padding: '.15rem .5rem',
                  borderRadius: '4px',
                  fontSize: '.7rem',
                  fontWeight: 600,
                }}
              >
                PUB: {detail.publicationState}
              </span>
            </div>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#374151',
              color: '#d1d5db',
              border: 'none',
              borderRadius: '.375rem',
              padding: '.4rem .75rem',
              fontSize: '.8rem',
              cursor: 'pointer',
            }}
          >
            ✕ {t('admin.close')}
          </button>
        )}
      </header>

      {/* Messages */}
      {errorMsg && (
        <div
          role="alert"
          style={{
            backgroundColor: '#7f1d1d',
            color: '#fecaca',
            padding: '.75rem 1.25rem',
            borderBottom: '1px solid #b91c1c',
            fontSize: '.85rem',
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          style={{
            backgroundColor: '#064e3b',
            color: '#a7f3d0',
            padding: '.75rem 1.25rem',
            borderBottom: '1px solid #059669',
            fontSize: '.85rem',
          }}
        >
          ✓ {successMsg}
        </div>
      )}

      {/* Navigation Tabs */}
      <nav
        aria-label={isPt ? 'Abas da revisão' : 'Review tabs'}
        style={{
          display: 'flex',
          borderBottom: '1px solid #374151',
          backgroundColor: '#172033',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '.75rem 1.25rem',
            color: activeTab === 'overview' ? '#f59e0b' : '#9ca3af',
            borderBottom: activeTab === 'overview' ? '2px solid #f59e0b' : '2px solid transparent',
            background: 'none',
            border: 'none',
            borderBottomWidth: '2px',
            borderBottomStyle: 'solid',
            fontSize: '.85rem',
            fontWeight: activeTab === 'overview' ? 600 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {t('admin.profileTabOverview')}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('media')}
          style={{
            padding: '.75rem 1.25rem',
            color: activeTab === 'media' ? '#f59e0b' : '#9ca3af',
            borderBottom: activeTab === 'media' ? '2px solid #f59e0b' : '2px solid transparent',
            background: 'none',
            border: 'none',
            borderBottomWidth: '2px',
            borderBottomStyle: 'solid',
            fontSize: '.85rem',
            fontWeight: activeTab === 'media' ? 600 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '.4rem',
          }}
        >
          {t('admin.profileTabMedia')}
          <span
            style={{
              backgroundColor: '#374151',
              color: '#d1d5db',
              fontSize: '.7rem',
              padding: '0.1rem .4rem',
              borderRadius: '9999px',
            }}
          >
            {detail.photos.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('didit')}
          style={{
            padding: '.75rem 1.25rem',
            color: activeTab === 'didit' ? '#f59e0b' : '#9ca3af',
            borderBottom: activeTab === 'didit' ? '2px solid #f59e0b' : '2px solid transparent',
            background: 'none',
            border: 'none',
            borderBottomWidth: '2px',
            borderBottomStyle: 'solid',
            fontSize: '.85rem',
            fontWeight: activeTab === 'didit' ? 600 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {t('admin.profileTabDidit')}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('services')}
          style={{
            padding: '.75rem 1.25rem',
            color: activeTab === 'services' ? '#f59e0b' : '#9ca3af',
            borderBottom: activeTab === 'services' ? '2px solid #f59e0b' : '2px solid transparent',
            background: 'none',
            border: 'none',
            borderBottomWidth: '2px',
            borderBottomStyle: 'solid',
            fontSize: '.85rem',
            fontWeight: activeTab === 'services' ? 600 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {t('admin.profileTabServices')}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          style={{
            padding: '.75rem 1.25rem',
            color: activeTab === 'history' ? '#f59e0b' : '#9ca3af',
            borderBottom: activeTab === 'history' ? '2px solid #f59e0b' : '2px solid transparent',
            background: 'none',
            border: 'none',
            borderBottomWidth: '2px',
            borderBottomStyle: 'solid',
            fontSize: '.85rem',
            fontWeight: activeTab === 'history' ? 600 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {t('admin.profileTabHistory')}
        </button>
      </nav>

      {/* Tab Contents Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* TAB 1: OVERVIEW & PUBLIC DATA */}
        {activeTab === 'overview' && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Headline & Bio */}
            <div style={{ backgroundColor: '#1f2937', padding: '1rem', borderRadius: '.375rem', border: '1px solid #374151' }}>
              <span style={{ color: '#9ca3af', fontSize: '.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
                {t('admin.profileHeadline')}
              </span>
              <p style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, margin: '.35rem 0 .75rem' }}>
                {detail.headline || (isPt ? '(Sem apresentação)' : '(No headline)')}
              </p>

              <span style={{ color: '#9ca3af', fontSize: '.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
                {t('admin.profileBio')}
              </span>
              <p style={{ color: '#d1d5db', fontSize: '.875rem', margin: '.35rem 0 0', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {detail.bio || (isPt ? '(Sem biografia)' : '(No biography)')}
              </p>
            </div>

            {/* Physical Attributes Grid */}
            <div style={{ backgroundColor: '#1f2937', padding: '1rem', borderRadius: '.375rem', border: '1px solid #374151' }}>
              <h3 style={{ color: '#f59e0b', fontSize: '.85rem', textTransform: 'uppercase', margin: '0 0 .75rem', fontWeight: 600 }}>
                {t('admin.profilePhysical')}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.75rem', fontSize: '.85rem' }}>
                <div>
                  <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>Idade Declarada:</span>
                  <p style={{ color: '#fff', margin: '.15rem 0 0' }}>
                    {detail.publicAge ? `${detail.publicAge} anos` : 'Não informada'}{' '}
                    <span style={{ fontSize: '.7rem', color: detail.showAge ? '#10b981' : '#6b7280' }}>
                      ({detail.showAge ? 'Exibida' : 'Oculta'})
                    </span>
                  </p>
                </div>
                <div>
                  <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>{t('admin.profileHeight')}:</span>
                  <p style={{ color: '#fff', margin: '.15rem 0 0' }}>
                    {detail.heightCm ? `${detail.heightCm} cm` : '—'}{' '}
                    <span style={{ fontSize: '.7rem', color: detail.showHeight ? '#10b981' : '#6b7280' }}>
                      ({detail.showHeight ? 'Exibida' : 'Oculta'})
                    </span>
                  </p>
                </div>
                <div>
                  <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>{t('admin.profileWeight')}:</span>
                  <p style={{ color: '#fff', margin: '.15rem 0 0' }}>
                    {detail.weightKg ? `${detail.weightKg} kg` : '—'}{' '}
                    <span style={{ fontSize: '.7rem', color: detail.showWeight ? '#10b981' : '#6b7280' }}>
                      ({detail.showWeight ? 'Exibida' : 'Oculta'})
                    </span>
                  </p>
                </div>
                <div>
                  <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>Medidas (B/C/Q):</span>
                  <p style={{ color: '#fff', margin: '.15rem 0 0' }}>
                    {detail.bustCm || detail.waistCm || detail.hipsCm
                      ? `${detail.bustCm || '—'} / ${detail.waistCm || '—'} / ${detail.hipsCm || '—'}`
                      : '—'}{' '}
                    <span style={{ fontSize: '.7rem', color: detail.showMeasurements ? '#10b981' : '#6b7280' }}>
                      ({detail.showMeasurements ? 'Exibidas' : 'Ocultas'})
                    </span>
                  </p>
                </div>
                <div>
                  <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>{t('admin.profileHair')}:</span>
                  <p style={{ color: '#fff', margin: '.15rem 0 0' }}>
                    {detail.hairColor || '—'} {detail.hairLength ? `(${detail.hairLength})` : ''}
                  </p>
                </div>
                <div>
                  <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>{t('admin.profileEyes')}:</span>
                  <p style={{ color: '#fff', margin: '.15rem 0 0' }}>{detail.eyeColor || '—'}</p>
                </div>
                <div>
                  <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>{t('admin.profileBody')}:</span>
                  <p style={{ color: '#fff', margin: '.15rem 0 0' }}>{detail.bodyType || '—'}</p>
                </div>
                <div>
                  <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>Tatuagens / Piercings:</span>
                  <p style={{ color: '#fff', margin: '.15rem 0 0' }}>
                    {detail.hasTattoos ? 'Possui tatuagens' : 'Sem tatuagens'} ·{' '}
                    {detail.hasPiercings ? 'Possui piercings' : 'Sem piercings'}
                  </p>
                </div>
              </div>
            </div>

            {/* Contacts */}
            <div style={{ backgroundColor: '#1f2937', padding: '1rem', borderRadius: '.375rem', border: '1px solid #374151' }}>
              <h3 style={{ color: '#f59e0b', fontSize: '.85rem', textTransform: 'uppercase', margin: '0 0 .75rem', fontWeight: 600 }}>
                {t('admin.profileContacts')}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '.75rem', fontSize: '.85rem' }}>
                <div>
                  <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>WhatsApp:</span>
                  <p style={{ color: '#fff', margin: '.15rem 0 0', fontFamily: 'monospace' }}>
                    {detail.whatsappPhone || 'Não informado'}{' '}
                    <span style={{ fontSize: '.7rem', color: detail.showWhatsapp ? '#10b981' : '#6b7280' }}>
                      ({detail.showWhatsapp ? 'Público' : 'Oculto'})
                    </span>
                  </p>
                </div>
                <div>
                  <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>Telefone Direto:</span>
                  <p style={{ color: '#fff', margin: '.15rem 0 0', fontFamily: 'monospace' }}>
                    {detail.directPhone || 'Não informado'}{' '}
                    <span style={{ fontSize: '.7rem', color: detail.showPhone ? '#10b981' : '#6b7280' }}>
                      ({detail.showPhone ? 'Público' : 'Oculto'})
                    </span>
                  </p>
                </div>
                <div>
                  <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>Telegram:</span>
                  <p style={{ color: '#fff', margin: '.15rem 0 0', fontFamily: 'monospace' }}>
                    {detail.telegramUsername ? `@${detail.telegramUsername}` : 'Não informado'}{' '}
                    <span style={{ fontSize: '.7rem', color: detail.showTelegram ? '#10b981' : '#6b7280' }}>
                      ({detail.showTelegram ? 'Público' : 'Oculto'})
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: MEDIA GALLERY */}
        {activeTab === 'media' && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#fff', fontSize: '1rem', margin: 0, fontWeight: 600 }}>
                {t('admin.mediaTotalPhotos')} ({detail.photos.length})
              </h3>
              <span style={{ color: '#9ca3af', fontSize: '.8rem' }}>
                🛡️ URLs assinadas e efêmeras para moderação
              </span>
            </div>

            {detail.photos.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#1f2937', borderRadius: '.375rem', color: '#9ca3af' }}>
                {t('admin.mediaNoPhotos')}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
                {detail.photos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    style={{
                      position: 'relative',
                      backgroundColor: '#1f2937',
                      borderRadius: '.375rem',
                      overflow: 'hidden',
                      border: photo.isPrimary ? '2px solid #f59e0b' : '1px solid #374151',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      style={{ position: 'relative', width: '100%', height: '180px', cursor: 'pointer' }}
                      onClick={() => photo.previewUrl && setLightboxUrl(photo.previewUrl)}
                    >
                      {photo.previewUrl ? (
                        <Image
                          src={photo.previewUrl}
                          alt={`Foto ${idx + 1}`}
                          fill
                          sizes="180px"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                          Erro de imagem
                        </div>
                      )}

                      {/* Primary badge */}
                      {photo.isPrimary && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '6px',
                            left: '6px',
                            backgroundColor: '#f59e0b',
                            color: '#111827',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontSize: '.65rem',
                            fontWeight: 700,
                          }}
                        >
                          CAPA
                        </span>
                      )}

                      {/* Status badge */}
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '6px',
                          right: '6px',
                          backgroundColor:
                            photo.status === 'APPROVED'
                              ? 'rgba(6, 78, 59, 0.9)'
                              : photo.status === 'PENDING_MODERATION'
                              ? 'rgba(120, 53, 15, 0.9)'
                              : 'rgba(127, 29, 29, 0.9)',
                          color: '#fff',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '.65rem',
                          fontWeight: 600,
                        }}
                      >
                        {photo.status}
                      </span>
                    </div>

                    <div style={{ padding: '.5rem', fontSize: '.75rem', color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Posição: {photo.position}</span>
                      <span>{photo.fileSizeBytes ? `${Math.round(photo.fileSizeBytes / 1024)} KB` : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Videos section if any */}
            {detail.videos.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', margin: '0 0 .75rem', fontWeight: 600 }}>
                  {t('admin.mediaTotalVideos')} ({detail.videos.length})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {detail.videos.map((vid) => (
                    <div
                      key={vid.id}
                      style={{
                        backgroundColor: '#1f2937',
                        borderRadius: '.375rem',
                        overflow: 'hidden',
                        border: '1px solid #374151',
                        padding: '.5rem',
                      }}
                    >
                      {vid.previewUrl ? (
                        <video
                          src={vid.previewUrl}
                          poster={vid.posterUrl || undefined}
                          controls
                          style={{ width: '100%', height: '160px', borderRadius: '.25rem', backgroundColor: '#000' }}
                        />
                      ) : (
                        <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                          Vídeo indisponível
                        </div>
                      )}
                      <div style={{ marginTop: '.5rem', fontSize: '.75rem', color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Status: {vid.status}</span>
                        <span>{vid.durationSeconds ? `${vid.durationSeconds}s` : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 3: DIDIT / VERIFICATION */}
        {activeTab === 'didit' && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '.375rem',
                padding: '1.25rem',
              }}
            >
              <h3 style={{ color: '#f59e0b', fontSize: '.9rem', textTransform: 'uppercase', margin: '0 0 1rem', fontWeight: 600 }}>
                {t('admin.diditVerifiedTitle')}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', fontSize: '.875rem' }}>
                <div style={{ backgroundColor: '#111827', padding: '.75rem', borderRadius: '.375rem' }}>
                  <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>{t('admin.diditIdentityLabel')}</span>
                  <p style={{ color: detail.didit.identityVerified ? '#10b981' : '#f87171', margin: '.25rem 0 0', fontWeight: 600 }}>
                    {detail.didit.identityVerified ? '✓ Aprovada' : '✕ Pendente'}
                  </p>
                </div>

                <div style={{ backgroundColor: '#111827', padding: '.75rem', borderRadius: '.375rem' }}>
                  <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>{t('admin.diditAgeLabel')}</span>
                  <p style={{ color: detail.didit.ageVerified ? '#10b981' : '#f87171', margin: '.25rem 0 0', fontWeight: 600 }}>
                    {detail.didit.ageVerified ? '✓ Aprovada (18+ Confirmado)' : '✕ Pendente'}
                  </p>
                </div>

                <div style={{ backgroundColor: '#111827', padding: '.75rem', borderRadius: '.375rem' }}>
                  <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>{t('admin.diditCpfLabel')}</span>
                  <p style={{ color: detail.didit.cpfVerified ? '#10b981' : '#9ca3af', margin: '.25rem 0 0', fontWeight: 600 }}>
                    {detail.didit.cpfVerified === true ? '✓ Validado' : detail.didit.cpfVerified === false ? '✕ Inconsistente' : 'Não aplicável'}
                  </p>
                </div>

                <div style={{ backgroundColor: '#111827', padding: '.75rem', borderRadius: '.375rem' }}>
                  <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>{t('admin.diditCountryLabel')}</span>
                  <p style={{ color: '#fff', margin: '.25rem 0 0', fontWeight: 600 }}>
                    {detail.didit.verifiedCountry || 'BR'}
                  </p>
                </div>

                <div style={{ backgroundColor: '#111827', padding: '.75rem', borderRadius: '.375rem' }}>
                  <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>{t('admin.diditDateLabel')}</span>
                  <p style={{ color: '#fff', margin: '.25rem 0 0' }}>
                    {detail.didit.verifiedAt ? formatDate(detail.didit.verifiedAt, locale) : 'Pendente'}
                  </p>
                </div>

                <div style={{ backgroundColor: '#111827', padding: '.75rem', borderRadius: '.375rem' }}>
                  <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>Provedor</span>
                  <p style={{ color: '#fff', margin: '.25rem 0 0', textTransform: 'uppercase' }}>
                    {detail.didit.provider}
                  </p>
                </div>
              </div>

              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '.75rem 1rem',
                  backgroundColor: '#111827',
                  border: '1px solid #4b5563',
                  borderRadius: '.375rem',
                  fontSize: '.8rem',
                  color: '#9ca3af',
                  lineHeight: 1.5,
                }}
              >
                🛡️ <strong>{t('admin.diditDisclaimerNotice')}</strong>
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: SERVICES & LOCATIONS */}
        {activeTab === 'services' && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Locations */}
            <div style={{ backgroundColor: '#1f2937', padding: '1rem', borderRadius: '.375rem', border: '1px solid #374151' }}>
              <h3 style={{ color: '#f59e0b', fontSize: '.85rem', textTransform: 'uppercase', margin: '0 0 .75rem', fontWeight: 600 }}>
                {t('admin.profileLocations')} ({detail.locations.length})
              </h3>
              {detail.locations.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '.85rem', margin: 0 }}>Nenhuma região cadastrada.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
                  {detail.locations.map((loc) => (
                    <span
                      key={loc.id}
                      style={{
                        backgroundColor: loc.isPrimary ? '#78350f' : '#111827',
                        color: loc.isPrimary ? '#fde68a' : '#d1d5db',
                        border: loc.isPrimary ? '1px solid #b45309' : '1px solid #374151',
                        padding: '.35rem .75rem',
                        borderRadius: '4px',
                        fontSize: '.85rem',
                      }}
                    >
                      {loc.cityName} — {loc.name} {loc.isPrimary ? '(Principal)' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Offerings */}
            <div style={{ backgroundColor: '#1f2937', padding: '1rem', borderRadius: '.375rem', border: '1px solid #374151' }}>
              <h3 style={{ color: '#f59e0b', fontSize: '.85rem', textTransform: 'uppercase', margin: '0 0 .75rem', fontWeight: 600 }}>
                {t('admin.profileServices')} ({detail.offerings.length})
              </h3>
              {detail.offerings.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '.85rem', margin: 0 }}>Nenhum serviço estruturado especificado.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '.5rem' }}>
                  {detail.offerings.map((offering) => (
                    <div
                      key={offering.optionCode}
                      style={{
                        backgroundColor: '#111827',
                        padding: '.5rem .75rem',
                        borderRadius: '.25rem',
                        fontSize: '.8rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ color: '#d1d5db' }}>{offering.optionCode}</span>
                      <span
                        style={{
                          color: offering.status === 'OFFERED' ? '#10b981' : offering.status === 'NOT_OFFERED' ? '#f87171' : '#6b7280',
                          fontWeight: 600,
                        }}
                      >
                        {offering.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 5: AUDIT HISTORY */}
        {activeTab === 'history' && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ color: '#fff', fontSize: '1rem', margin: '0 0 .25rem', fontWeight: 600 }}>
              {t('admin.decisionHistoryTitle')}
            </h3>

            {detail.history.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#1f2937', borderRadius: '.375rem', color: '#9ca3af' }}>
                {t('admin.decisionNoHistory')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {detail.history.map((evt) => (
                  <div
                    key={evt.id}
                    style={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '.375rem',
                      padding: '.75rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '.35rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          backgroundColor:
                            evt.decisionOrAction === 'APPROVE' || evt.decisionOrAction === 'REACTIVATE'
                              ? '#064e3b'
                              : '#7f1d1d',
                          color: '#fff',
                          fontSize: '.75rem',
                          fontWeight: 700,
                          padding: '.15rem .5rem',
                          borderRadius: '3px',
                        }}
                      >
                        {evt.decisionOrAction}
                      </span>
                      <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>
                        {formatDate(evt.createdAt, locale)}
                      </span>
                    </div>

                    {evt.reasonCode && (
                      <p style={{ color: '#fca5a5', fontSize: '.8rem', margin: 0 }}>
                        Motivo: <strong>{evt.reasonCode}</strong>
                      </p>
                    )}

                    {evt.notes && (
                      <p style={{ color: '#d1d5db', fontSize: '.8rem', margin: 0, fontStyle: 'italic' }}>
                        &ldquo;{evt.notes}&rdquo;
                      </p>
                    )}

                    <span style={{ color: '#6b7280', fontSize: '.7rem', fontFamily: 'monospace' }}>
                      Operador: {evt.reviewerOrActorId}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* PUBLICATION READINESS CHECKLIST (Always visible in review tab) */}
        <section
          style={{
            backgroundColor: '#1f2937',
            border: '1px solid #4b5563',
            borderRadius: '.5rem',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
            <h3 style={{ color: '#fff', fontSize: '.95rem', margin: 0, fontWeight: 700 }}>
              {t('admin.reviewChecklistTitle')}
            </h3>
            <span style={{ fontSize: '.75rem', color: '#9ca3af' }}>
              {t('admin.reviewChecklistSubtitle')}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {detail.checklist.map((item) => (
              <div
                key={item.key}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '.75rem',
                  padding: '.5rem .75rem',
                  borderRadius: '.375rem',
                  backgroundColor: item.ready ? 'rgba(6, 78, 59, 0.25)' : 'rgba(127, 29, 29, 0.25)',
                  border: item.ready ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <span style={{ fontSize: '1rem', lineHeight: 1 }}>{item.ready ? '✓' : '✕'}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ color: '#fff', fontSize: '.85rem', fontWeight: 600 }}>{item.title}</span>
                  <p style={{ color: item.ready ? '#a7f3d0' : '#fca5a5', fontSize: '.8rem', margin: '.15rem 0 0' }}>
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* OPERATOR NOTES FIELD */}
        {isReviewable && (
          <div style={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '.375rem', padding: '1rem' }}>
            <label
              htmlFor="operator-review-notes"
              style={{ display: 'block', color: '#d1d5db', fontSize: '.8rem', fontWeight: 600, marginBottom: '.35rem' }}
            >
              {t('admin.decisionNotesLabel')}
            </label>
            <textarea
              id="operator-review-notes"
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              disabled={isPending}
              maxLength={1000}
              rows={2}
              placeholder={t('admin.decisionNotesPlaceholder')}
              style={{
                width: '100%',
                backgroundColor: '#111827',
                border: '1px solid #4b5563',
                borderRadius: '.375rem',
                color: '#fff',
                padding: '.5rem .75rem',
                fontSize: '.85rem',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
            <span style={{ fontSize: '.7rem', color: '#6b7280' }}>
              {operatorNotes.length}/1000 caracteres
            </span>
          </div>
        )}
      </div>

      {/* FIXED BOTTOM ACTION BAR */}
      <footer
        style={{
          padding: '1rem 1.5rem',
          backgroundColor: '#1f2937',
          borderTop: '1px solid #374151',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          {detail.profileStatus === 'ACTIVE' && (
            <button
              type="button"
              onClick={() => setShowSuspendModal(true)}
              disabled={isPending}
              style={{
                backgroundColor: '#7f1d1d',
                color: '#ffffff',
                border: '1px solid #b91c1c',
                borderRadius: '.375rem',
                padding: '.5rem 1rem',
                fontSize: '.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🚫 Suspender Perfil
            </button>
          )}

          {detail.profileStatus === 'SUSPENDED' && (
            <button
              type="button"
              onClick={handleReactivate}
              disabled={isPending}
              style={{
                backgroundColor: '#059669',
                color: '#ffffff',
                border: '1px solid #10b981',
                borderRadius: '.375rem',
                padding: '.5rem 1rem',
                fontSize: '.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isPending ? 'Revalidando…' : '↻ Reativar Perfil'}
            </button>
          )}
        </div>

        {isReviewable ? (
          <div style={{ display: 'flex', gap: '.75rem' }}>
            <button
              type="button"
              onClick={() => setShowRejectModal(true)}
              disabled={isPending}
              style={{
                backgroundColor: '#991b1b',
                color: '#ffffff',
                border: '1px solid #dc2626',
                borderRadius: '.375rem',
                padding: '.6rem 1.25rem',
                fontSize: '.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('admin.decisionRejectBtn')}
            </button>

            <button
              type="button"
              onClick={handleApprove}
              disabled={isPending || !detail.checklist.every((c) => c.ready)}
              title={
                !detail.checklist.every((c) => c.ready)
                  ? isPt
                    ? 'Aprovação bloqueada: existem critérios de publicação pendentes no checklist.'
                    : 'Approval disabled: publication criteria unmet in checklist.'
                  : undefined
              }
              style={{
                backgroundColor: detail.checklist.every((c) => c.ready) ? '#059669' : '#374151',
                color: detail.checklist.every((c) => c.ready) ? '#ffffff' : '#9ca3af',
                border: detail.checklist.every((c) => c.ready) ? '1px solid #10b981' : '1px solid #4b5563',
                borderRadius: '.375rem',
                padding: '.6rem 1.5rem',
                fontSize: '.875rem',
                fontWeight: 700,
                cursor: (isPending || !detail.checklist.every((c) => c.ready)) ? 'not-allowed' : 'pointer',
                opacity: (isPending || !detail.checklist.every((c) => c.ready)) ? 0.6 : 1,
              }}
            >
              {isPending ? (isPt ? 'Aprovando…' : 'Approving…') : t('admin.decisionApproveBtn')}
            </button>
          </div>
        ) : (
          <span style={{ color: '#9ca3af', fontSize: '.85rem' }}>
            Status atual: <strong>{detail.profileStatus}</strong> (Moderação: {detail.contentModerationStatus})
          </span>
        )}
      </footer>

      {/* REJECTION MODAL */}
      {showRejectModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#1f2937',
              border: '2px solid #dc2626',
              borderRadius: '.5rem',
              padding: '1.5rem',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <h3 id="reject-modal-title" style={{ color: '#fca5a5', margin: '0 0 1rem', fontSize: '1.1rem' }}>
              Rejeitar Perfil — Motivo Obrigatório
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label
                htmlFor="rejection-reason-select"
                style={{ display: 'block', color: '#d1d5db', fontSize: '.85rem', marginBottom: '.35rem' }}
              >
                Motivo da rejeição *
              </label>
              <select
                id="rejection-reason-select"
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                disabled={isPending}
                style={{
                  width: '100%',
                  padding: '.5rem',
                  backgroundColor: '#111827',
                  color: '#fff',
                  border: '1px solid #4b5563',
                  borderRadius: '.375rem',
                  fontSize: '.85rem',
                }}
              >
                <option value="">Selecione um motivo...</option>
                {REJECTION_REASONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="rejection-notes-input"
                style={{ display: 'block', color: '#d1d5db', fontSize: '.85rem', marginBottom: '.35rem' }}
              >
                Observações complementares (opcional)
              </label>
              <textarea
                id="rejection-notes-input"
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                disabled={isPending}
                maxLength={1000}
                rows={3}
                placeholder="Instruções para correção ou detalhamento interno..."
                style={{
                  width: '100%',
                  padding: '.5rem',
                  backgroundColor: '#111827',
                  color: '#fff',
                  border: '1px solid #4b5563',
                  borderRadius: '.375rem',
                  fontSize: '.85rem',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.75rem' }}>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                disabled={isPending}
                style={{
                  backgroundColor: '#374151',
                  color: '#d1d5db',
                  border: 'none',
                  borderRadius: '.375rem',
                  padding: '.5rem 1rem',
                  fontSize: '.85rem',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleReject}
                disabled={isPending || !selectedReason}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '.375rem',
                  padding: '.5rem 1.25rem',
                  fontSize: '.85rem',
                  fontWeight: 600,
                  cursor: isPending || !selectedReason ? 'not-allowed' : 'pointer',
                  opacity: isPending || !selectedReason ? 0.5 : 1,
                }}
              >
                {isPending ? 'Processando…' : 'Confirmar Rejeição'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUSPENSION MODAL */}
      {showSuspendModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="suspend-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#1f2937',
              border: '2px solid #b91c1c',
              borderRadius: '.5rem',
              padding: '1.5rem',
              maxWidth: '500px',
              width: '100%',
            }}
          >
            <h3 id="suspend-modal-title" style={{ color: '#fecaca', margin: '0 0 1rem', fontSize: '1.1rem' }}>
              Suspensão Administrativa do Perfil
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label
                htmlFor="suspend-reason-select"
                style={{ display: 'block', color: '#d1d5db', fontSize: '.85rem', marginBottom: '.35rem' }}
              >
                Motivo da suspensão *
              </label>
              <select
                id="suspend-reason-select"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                disabled={isPending}
                style={{
                  width: '100%',
                  padding: '.5rem',
                  backgroundColor: '#111827',
                  color: '#fff',
                  border: '1px solid #4b5563',
                  borderRadius: '.375rem',
                  fontSize: '.85rem',
                }}
              >
                <option value="">Selecione um motivo...</option>
                {SUSPENSION_REASONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="suspend-notes-input"
                style={{ display: 'block', color: '#d1d5db', fontSize: '.85rem', marginBottom: '.35rem' }}
              >
                Observações internas
              </label>
              <textarea
                id="suspend-notes-input"
                value={suspendNotes}
                onChange={(e) => setSuspendNotes(e.target.value)}
                disabled={isPending}
                maxLength={1000}
                rows={3}
                placeholder="Detalhes adicionais sobre a suspensão..."
                style={{
                  width: '100%',
                  padding: '.5rem',
                  backgroundColor: '#111827',
                  color: '#fff',
                  border: '1px solid #4b5563',
                  borderRadius: '.375rem',
                  fontSize: '.85rem',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.75rem' }}>
              <button
                type="button"
                onClick={() => setShowSuspendModal(false)}
                disabled={isPending}
                style={{
                  backgroundColor: '#374151',
                  color: '#d1d5db',
                  border: 'none',
                  borderRadius: '.375rem',
                  padding: '.5rem 1rem',
                  fontSize: '.85rem',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSuspend}
                disabled={isPending || !suspendReason}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '.375rem',
                  padding: '.5rem 1.25rem',
                  fontSize: '.85rem',
                  fontWeight: 600,
                  cursor: isPending || !suspendReason ? 'not-allowed' : 'pointer',
                  opacity: isPending || !suspendReason ? 0.5 : 1,
                }}
              >
                {isPending ? 'Processando…' : 'Confirmar Suspensão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {lightboxUrl && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '1.5rem',
          }}
          onClick={() => setLightboxUrl(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <Image
              src={lightboxUrl}
              alt="Mídia em tamanho ampliado"
              width={900}
              height={900}
              style={{ objectFit: 'contain', maxHeight: '85vh', width: 'auto', borderRadius: '.375rem' }}
            />
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                backgroundColor: '#374151',
                color: '#fff',
                border: 'none',
                borderRadius: '.25rem',
                padding: '.35rem .75rem',
                cursor: 'pointer',
                fontSize: '.9rem',
              }}
            >
              ✕ Fechar (Esc)
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
