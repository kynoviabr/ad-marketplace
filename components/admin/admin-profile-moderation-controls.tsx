'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  adminApproveProfileAction,
  adminRejectProfileAction,
  adminSuspendProfileAction,
  adminReactivateProfileAction,
} from '@/modules/admin/actions'
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

const SUSPENSION_REASON_OPTIONS = [
  { code: 'TERMS_VIOLATION', label: 'Violação dos Termos de Uso' },
  { code: 'SUSPICIOUS_ACTIVITY', label: 'Atividade suspeita ou sob investigação' },
  { code: 'CUSTOMER_COMPLAINTS', label: 'Denúncias reiteradas de clientes' },
  { code: 'COMMERCIAL_MISCONDUCT', label: 'Conduta comercial irregular' },
  { code: 'LEGAL_REQUEST', label: 'Solicitação judicial ou notificação legal' },
  { code: 'OTHER_SAFETY_REASON', label: 'Outro motivo operacional ou de segurança' },
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

  const [showSuspendForm, setShowSuspendForm] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendNotes, setSuspendNotes] = useState('')

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

  const handleSuspend = () => {
    if (!suspendReason) {
      setErrorMsg('Selecione um motivo obrigatório para a suspensão.')
      return
    }

    if (
      !confirm(
        `Confirmar suspensão do perfil de "${stageName}"? O perfil sairá imediatamente do ar e deixará de ser visível publicamente.`
      )
    ) {
      return
    }

    setErrorMsg(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const res = await adminSuspendProfileAction({
        profileId,
        reasonCode: suspendReason,
        notes: suspendNotes.trim() || undefined,
      })

      if (!res.success) {
        setErrorMsg(res.message || res.error || 'Erro ao suspender perfil.')
      } else {
        setSuccessMsg(res.message || 'Perfil suspenso com sucesso.')
        setShowSuspendForm(false)
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
        `Confirmar reativação do perfil de "${stageName}"? Todos os critérios de publicação (verificação KYC, fotos aprovadas, localização e plano) serão revalidados.`
      )
    ) {
      return
    }

    setErrorMsg(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const res = await adminReactivateProfileAction({ profileId })
      if (!res.success) {
        setErrorMsg(`A reativação falhou: ${res.message || res.error || 'Critérios de publicação não atendidos.'}`)
      } else {
        setSuccessMsg(res.message || 'Perfil reativado com sucesso.')
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

      {/* Non-reviewable / Active / Suspended / Terminal States */}
      {!isReviewable ? (
        <div>
          <div
            style={{
              color: '#9ca3af',
              fontSize: '.85rem',
              padding: '.75rem',
              backgroundColor: '#111827',
              borderRadius: '.375rem',
              border: '1px dashed #4b5563',
              marginBottom: profileStatus === 'ACTIVE' || profileStatus === 'SUSPENDED' ? '1rem' : '0',
            }}
          >
            {profileStatus === 'ACTIVE' && publicationState === 'PUBLIC' ? (
              <span>✓ Este perfil já foi aprovado e está ativo no marketplace.</span>
            ) : profileStatus === 'ACTIVE' ? (
              <span>✓ Perfil com status ativo (Estado de publicação: {publicationState}).</span>
            ) : contentModerationStatus === 'REJECTED' || publicationState === 'BLOCKED' ? (
              <span>🔒 Este perfil foi rejeitado pela moderação. Ações desabilitadas.</span>
            ) : profileStatus === 'SUSPENDED' ? (
              <span>🔒 Este perfil está suspenso administrativamente e fora do ar.</span>
            ) : profileStatus === 'DRAFT' ? (
              <span>Rascunho não submetido para revisão operacional.</span>
            ) : (
              <span>
                Status atual: <strong>{profileStatus}</strong> (Moderação: {contentModerationStatus || 'PENDING'}). Ações desabilitadas.
              </span>
            )}
          </div>

          {/* ACTIVE: show "Suspender perfil" button and form */}
          {profileStatus === 'ACTIVE' && (
            <div>
              {!showSuspendForm ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowSuspendForm(true)
                    setErrorMsg(null)
                  }}
                  disabled={isPending}
                  style={{
                    backgroundColor: '#7f1d1d',
                    color: '#ffffff',
                    border: '1px solid #b91c1c',
                    borderRadius: '.375rem',
                    padding: '.5rem 1.25rem',
                    fontSize: '.875rem',
                    fontWeight: 600,
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    opacity: isPending ? 0.6 : 1,
                  }}
                >
                  🚫 Suspender perfil
                </button>
              ) : (
                <div
                  style={{
                    backgroundColor: '#111827',
                    border: '1px solid #b91c1c',
                    borderRadius: '.375rem',
                    padding: '1rem',
                  }}
                >
                  <h4 style={{ color: '#fecaca', fontSize: '.9rem', margin: '0 0 .75rem', fontWeight: 600 }}>
                    Suspensão Administrativa do Perfil
                  </h4>
                  <div style={{ marginBottom: '.75rem' }}>
                    <label style={{ display: 'block', color: '#d1d5db', fontSize: '.8rem', marginBottom: '.25rem' }}>
                      Motivo da suspensão *
                    </label>
                    <select
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                      disabled={isPending}
                      style={{
                        width: '100%',
                        padding: '.5rem',
                        backgroundColor: '#1f2937',
                        color: '#fff',
                        border: '1px solid #4b5563',
                        borderRadius: '.375rem',
                        fontSize: '.85rem',
                      }}
                    >
                      <option value="">Selecione um motivo...</option>
                      {SUSPENSION_REASON_OPTIONS.map((opt) => (
                        <option key={opt.code} value={opt.code}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '.75rem' }}>
                    <label style={{ display: 'block', color: '#d1d5db', fontSize: '.8rem', marginBottom: '.25rem' }}>
                      Observações internas (opcional)
                    </label>
                    <textarea
                      value={suspendNotes}
                      onChange={(e) => setSuspendNotes(e.target.value)}
                      disabled={isPending}
                      maxLength={1000}
                      rows={3}
                      placeholder="Detalhes adicionais sobre a suspensão..."
                      style={{
                        width: '100%',
                        padding: '.5rem',
                        backgroundColor: '#1f2937',
                        color: '#fff',
                        border: '1px solid #4b5563',
                        borderRadius: '.375rem',
                        fontSize: '.85rem',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <button
                      type="button"
                      onClick={handleSuspend}
                      disabled={isPending || !suspendReason}
                      style={{
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '.375rem',
                        padding: '.5rem 1rem',
                        fontSize: '.85rem',
                        fontWeight: 600,
                        cursor: isPending || !suspendReason ? 'not-allowed' : 'pointer',
                        opacity: isPending || !suspendReason ? 0.6 : 1,
                      }}
                    >
                      {isPending ? 'Processando…' : 'Confirmar Suspensão'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSuspendForm(false)
                        setSuspendReason('')
                        setSuspendNotes('')
                        setErrorMsg(null)
                      }}
                      disabled={isPending}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#9ca3af',
                        border: '1px solid #4b5563',
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

          {/* SUSPENDED: show "Reativar perfil" button */}
          {profileStatus === 'SUSPENDED' && (
            <button
              type="button"
              onClick={handleReactivate}
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
              {isPending ? 'Revalidando critérios…' : '↻ Reativar perfil'}
            </button>
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
