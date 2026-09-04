'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { adminApproveProfileAction, adminRejectProfileAction } from '@/modules/admin/actions'
import type { ProfileStatus, ContentModerationStatus } from '@/modules/profiles/types'

interface Props {
  profileId: string
  stageName: string
  profileStatus: ProfileStatus
  contentModerationStatus?: ContentModerationStatus
  publicationState: 'PUBLIC' | 'INELIGIBLE' | 'SUSPENDED' | 'BLOCKED'
  onSuccessUrl?: string
}

const PROFILE_REASON_OPTIONS = [
  { code: 'INAPPROPRIATE_CONTENT', label: 'Conteúdo inadequado ou ilícito' },
  { code: 'UNDERAGE_SUSPICION', label: 'Suspeita de menor de idade' },
  { code: 'MISLEADING_INFORMATION', label: 'Informações falsas ou enganosas' },
  { code: 'CONTACT_POLICY_VIOLATION', label: 'Dados de contato fora das diretrizes' },
  { code: 'INSUFFICIENT_QUALITY', label: 'Qualidade da apresentação insuficiente' },
  { code: 'OTHER_POLICY_VIOLATION', label: 'Outra violação de diretrizes' },
]

export function AdminProfileModerationControls({
  profileId,
  stageName,
  profileStatus,
  contentModerationStatus,
  publicationState,
  onSuccessUrl,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [selectedReason, setSelectedReason] = useState('')
  const [notes, setNotes] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const isReviewable =
    profileStatus === 'READY_FOR_REVIEW' &&
    contentModerationStatus !== 'APPROVED' &&
    contentModerationStatus !== 'REJECTED'

  const handleApprove = () => {
    if (
      !confirm(
        `Confirmar aprovação do perfil de "${stageName}"? Todos os critérios de publicação (verificação KYC, fotos aprovadas, localização e plano) serão validados.`
      )
    ) {
      return
    }

    setErrorMsg(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const res = await adminApproveProfileAction({ profileId })
      if (!res.success) {
        setErrorMsg(res.message || res.error || 'Erro ao aprovar perfil.')
      } else {
        setSuccessMsg(res.message || 'Perfil aprovado com sucesso.')
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
      setErrorMsg('Selecione um motivo obrigatório para a rejeição.')
      return
    }

    setErrorMsg(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const res = await adminRejectProfileAction({
        profileId,
        reasonCode: selectedReason,
        notes: notes.trim() || undefined,
      })

      if (!res.success) {
        setErrorMsg(res.message || res.error || 'Erro ao rejeitar perfil.')
      } else {
        setSuccessMsg(res.message || 'Perfil rejeitado com sucesso.')
        setShowRejectForm(false)
        if (onSuccessUrl) {
          router.push(onSuccessUrl)
        } else {
          router.refresh()
        }
      }
    })
  }

  return (
    <div
      style={{
        backgroundColor: '#1f2937',
        border: '1px solid #374151',
        borderRadius: '.5rem',
        padding: '1.25rem',
        marginTop: '1.25rem',
      }}
    >
      <h3 style={{ color: '#fff', fontSize: '1rem', margin: '0 0 .75rem', fontWeight: 600 }}>
        Ações de Moderação do Perfil
      </h3>

      {/* Messages */}
      {errorMsg && (
        <div
          role="alert"
          style={{
            backgroundColor: '#7f1d1d',
            border: '1px solid #b91c1c',
            color: '#fecaca',
            padding: '.625rem .875rem',
            borderRadius: '.375rem',
            fontSize: '.85rem',
            marginBottom: '1rem',
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
            border: '1px solid #059669',
            color: '#a7f3d0',
            padding: '.625rem .875rem',
            borderRadius: '.375rem',
            fontSize: '.85rem',
            marginBottom: '1rem',
          }}
        >
          ✓ {successMsg}
        </div>
      )}

      {/* Already Moderated / Terminal States */}
      {!isReviewable ? (
        <div
          style={{
            color: '#9ca3af',
            fontSize: '.85rem',
            padding: '.75rem',
            backgroundColor: '#111827',
            borderRadius: '.375rem',
            border: '1px dashed #4b5563',
          }}
        >
          {profileStatus === 'ACTIVE' && publicationState === 'PUBLIC' ? (
            <span>✓ Este perfil já foi aprovado e está ativo no marketplace.</span>
          ) : contentModerationStatus === 'REJECTED' || publicationState === 'BLOCKED' ? (
            <span>🔒 Este perfil foi rejeitado pela moderação. Ações desabilitadas.</span>
          ) : profileStatus === 'SUSPENDED' ? (
            <span>🔒 Este perfil está suspenso. Moderação de perfil desabilitada.</span>
          ) : profileStatus === 'DRAFT' ? (
            <span>Rascunho não submetido para revisão operacional.</span>
          ) : (
            <span>
              Status atual: <strong>{profileStatus}</strong> (Moderação: {contentModerationStatus || 'PENDING'}). Ações desabilitadas.
            </span>
          )}
        </div>
      ) : (
        /* Action buttons for reviewable profiles */
        <div>
          {!showRejectForm ? (
            <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isPending}
                style={{
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: '1px solid #10b981',
                  borderRadius: '.375rem',
                  padding: '.5rem 1.25rem',
                  fontSize: '.875rem',
                  fontWeight: 600,
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  opacity: isPending ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.5rem',
                }}
              >
                {isPending ? 'Validando requisitos…' : '✓ Aprovar Perfil'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRejectForm(true)
                  setErrorMsg(null)
                }}
                disabled={isPending}
                style={{
                  backgroundColor: '#991b1b',
                  color: '#ffffff',
                  border: '1px solid #dc2626',
                  borderRadius: '.375rem',
                  padding: '.5rem 1.25rem',
                  fontSize: '.875rem',
                  fontWeight: 600,
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  opacity: isPending ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.5rem',
                }}
              >
                ✕ Rejeitar Perfil
              </button>
            </div>
          ) : (
            /* Rejection reason form */
            <div
              style={{
                backgroundColor: '#111827',
                border: '1px solid #dc2626',
                borderRadius: '.375rem',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '.75rem',
              }}
            >
              <h4 style={{ color: '#fca5a5', margin: 0, fontSize: '.9rem' }}>
                Rejeitar Perfil — Informe o Motivo Obrigatório
              </h4>

              <div>
                <label
                  htmlFor="profile-moderation-reason"
                  style={{ display: 'block', color: '#d1d5db', fontSize: '.8rem', marginBottom: '.25rem' }}
                >
                  Motivo da rejeição: <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  id="profile-moderation-reason"
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  disabled={isPending}
                  style={{
                    width: '100%',
                    backgroundColor: '#1f2937',
                    color: '#fff',
                    border: '1px solid #4b5563',
                    borderRadius: '.375rem',
                    padding: '.5rem',
                    fontSize: '.85rem',
                  }}
                >
                  <option value="">Selecione um motivo…</option>
                  {PROFILE_REASON_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label} ({opt.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="profile-moderation-notes"
                  style={{ display: 'block', color: '#d1d5db', fontSize: '.8rem', marginBottom: '.25rem' }}
                >
                  Observações detalhadas (opcional):
                </label>
                <textarea
                  id="profile-moderation-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isPending}
                  maxLength={1000}
                  rows={3}
                  placeholder="Instruções para o anunciante ou anotação interna (máx. 1000 caracteres)..."
                  style={{
                    width: '100%',
                    backgroundColor: '#1f2937',
                    color: '#fff',
                    border: '1px solid #4b5563',
                    borderRadius: '.375rem',
                    padding: '.5rem',
                    fontSize: '.85rem',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
                <span style={{ fontSize: '.7rem', color: '#6b7280' }}>
                  {notes.length}/1000 caracteres
                </span>
              </div>

              <div style={{ display: 'flex', gap: '.5rem', marginTop: '.25rem' }}>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isPending || !selectedReason}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '.375rem',
                    padding: '.5rem 1rem',
                    fontSize: '.85rem',
                    fontWeight: 600,
                    cursor: isPending || !selectedReason ? 'not-allowed' : 'pointer',
                    opacity: isPending || !selectedReason ? 0.5 : 1,
                  }}
                >
                  {isPending ? 'Rejeitando…' : 'Confirmar Rejeição'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowRejectForm(false)
                    setErrorMsg(null)
                  }}
                  disabled={isPending}
                  style={{
                    backgroundColor: '#374151',
                    color: '#d1d5db',
                    border: 'none',
                    borderRadius: '.375rem',
                    padding: '.5rem 1rem',
                    fontSize: '.85rem',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
