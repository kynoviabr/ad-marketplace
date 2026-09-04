'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { adminApproveMediaAction, adminRejectMediaAction } from '@/modules/admin/actions'
import type { AdminMediaType } from '@/modules/admin/types'
import type { MediaStatus } from '@/modules/media/types'
import type { ModerationReasonCode } from '@/modules/moderation/types'

interface Props {
  mediaId: string
  mediaType: AdminMediaType
  currentStatus: MediaStatus
  onSuccessUrl?: string
}

const REASON_OPTIONS: Array<{ code: ModerationReasonCode; label: string }> = [
  { code: 'UNDERAGE_SUSPICION', label: 'Suspeita de menor de idade' },
  { code: 'EXPLICIT_ILLEGAL_CONTENT', label: 'Conteúdo ilícito ou explícito não permitido' },
  { code: 'LOW_QUALITY_OR_BLURRY', label: 'Baixa qualidade ou imagem borrada' },
  { code: 'WATERMARK_OR_PROMOTIONAL', label: 'Marca d\'água ou conteúdo promocional' },
  { code: 'NON_HUMAN_OR_MISMATCH', label: 'Não humano ou incompatível com o perfil' },
  { code: 'VIOLENCE_OR_COERCION', label: 'Violência ou coerção' },
  { code: 'OTHER_POLICY_VIOLATION', label: 'Outra violação de diretrizes' },
]

export function AdminMediaModerationControls({
  mediaId,
  mediaType,
  currentStatus,
  onSuccessUrl,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [selectedReason, setSelectedReason] = useState<ModerationReasonCode | ''>('')
  const [notes, setNotes] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const isPendingReview = currentStatus === 'PENDING_MODERATION'

  const handleApprove = () => {
    if (!confirm('Confirmar aprovação desta mídia? Ela ficará visível publicamente de acordo com as regras de publicação.')) {
      return
    }

    setErrorMsg(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const res = await adminApproveMediaAction(mediaId, mediaType)
      if (!res.success) {
        setErrorMsg(res.message || res.error || 'Erro ao aprovar mídia.')
      } else {
        setSuccessMsg(res.message || 'Mídia aprovada com sucesso.')
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
      const res = await adminRejectMediaAction({
        mediaId,
        mediaType,
        reasonCode: selectedReason,
        notes: notes.trim() || undefined,
      })

      if (!res.success) {
        setErrorMsg(res.message || res.error || 'Erro ao rejeitar mídia.')
      } else {
        setSuccessMsg(res.message || 'Mídia rejeitada com sucesso.')
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
        marginTop: '1rem',
      }}
    >
      <h3 style={{ color: '#fff', fontSize: '1rem', margin: '0 0 .75rem', fontWeight: 600 }}>
        Ações de Moderação Operacional
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

      {/* When already moderated */}
      {!isPendingReview ? (
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
          🔒 Esta mídia está no status <strong style={{ color: '#fff' }}>{currentStatus}</strong>.
          Ações de moderação estão desabilitadas para evitar sobreposição ou inconsistência operacional.
        </div>
      ) : (
        /* Action buttons for PENDING items */
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
                {isPending ? 'Processando…' : '✓ Aprovar Mídia'}
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
                ✕ Rejeitar Mídia
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
                Rejeitar Mídia — Selecione o Motivo Obrigatório
              </h4>

              <div>
                <label
                  htmlFor="moderation-reason"
                  style={{ display: 'block', color: '#d1d5db', fontSize: '.8rem', marginBottom: '.25rem' }}
                >
                  Motivo da rejeição: <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  id="moderation-reason"
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value as ModerationReasonCode)}
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
                  {REASON_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label} ({opt.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="moderation-notes"
                  style={{ display: 'block', color: '#d1d5db', fontSize: '.8rem', marginBottom: '.25rem' }}
                >
                  Observações adicionais (opcional):
                </label>
                <textarea
                  id="moderation-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isPending}
                  maxLength={1000}
                  rows={3}
                  placeholder="Contexto interno sobre a rejeição (máx. 1000 caracteres)..."
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
