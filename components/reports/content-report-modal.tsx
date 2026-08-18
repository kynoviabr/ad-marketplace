'use client'

import { useState } from 'react'
import { submitContentReportAction } from '@/modules/reports/actions'
import type { ReportReasonCategory } from '@/modules/reports/types'

interface ContentReportModalProps {
  profileId?: string
  mediaId?: string
  targetLabel: string
  isOpen: boolean
  onClose: () => void
}

const REPORT_REASONS: { value: ReportReasonCategory; label: string }[] = [
  { value: 'UNDERAGE_SUSPICION', label: 'Suspeita de menor de idade (18+)' },
  { value: 'NON_CONSENSUAL', label: 'Uso indevido de imagem sem consentimento' },
  { value: 'IMPERSONATION_OR_STOLEN', label: 'Perfil falso ou fotos roubadas' },
  { value: 'VIOLENCE_OR_EXPLOITATION', label: 'Violência, coação ou exploração' },
  { value: 'SCAM_OR_FRAUD', label: 'Tentativa de golpe ou fraude' },
  { value: 'MISLEADING_LOCATION', label: 'Localização ou bairro incorreto' },
  { value: 'OTHER', label: 'Outro motivo' },
]

export function ContentReportModal({
  profileId,
  mediaId,
  targetLabel,
  isOpen,
  onClose,
}: ContentReportModalProps) {
  const [reasonCategory, setReasonCategory] = useState<ReportReasonCategory>('UNDERAGE_SUSPICION')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setStatusMessage(null)

    const res = await submitContentReportAction({
      profileId,
      mediaId,
      reasonCategory,
      description,
    })

    setIsSubmitting(false)

    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: res.message || 'Denúncia recebida com sucesso.',
      })
      setTimeout(() => {
        onClose()
      }, 2000)
    } else {
      setStatusMessage({
        type: 'error',
        text: res.error || 'Erro ao enviar denúncia.',
      })
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#1f2937',
          borderRadius: '0.75rem',
          maxWidth: '500px',
          width: '100%',
          padding: '1.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          color: '#f9fafb',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Denunciar Conteúdo</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '1.5rem', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1.25rem' }}>
          Denúncia para: <strong>{targetLabel}</strong>. Sua denúncia é anônima e será tratada com prioridade por nossa equipe de segurança.
        </p>

        {statusMessage && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              backgroundColor: statusMessage.type === 'success' ? '#065f46' : '#991b1b',
              color: '#ffffff',
            }}
          >
            {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
              Motivo da Denúncia *
            </label>
            <select
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value as ReportReasonCategory)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                backgroundColor: '#374151',
                color: '#ffffff',
                borderRadius: '0.375rem',
                border: '1px solid #4b5563',
                fontSize: '0.875rem',
              }}
            >
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
              Detalhes adicionais (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva detalhes que ajudem nossa equipe a identificar a irregularidade..."
              maxLength={1000}
              rows={3}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                backgroundColor: '#374151',
                color: '#ffffff',
                borderRadius: '0.375rem',
                border: '1px solid #4b5563',
                fontSize: '0.875rem',
                resize: 'vertical',
              }}
            />
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', float: 'right' }}>
              {description.length}/1000
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                backgroundColor: '#4b5563',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Denúncia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
