/* eslint-disable @next/next/no-img-element */
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { moderateMediaAction } from '@/modules/moderation/actions'
import type { PendingMediaQueueItem, ModerationReasonCode } from '@/modules/moderation/types'

interface ModerationQueueTableProps {
  initialItems: PendingMediaQueueItem[]
}

export function ModerationQueueTable({ initialItems }: ModerationQueueTableProps) {
  const [items, setItems] = useState(initialItems)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [rejectModalMedia, setRejectModalMedia] = useState<PendingMediaQueueItem | null>(null)
  const [quarantineModalMedia, setQuarantineModalMedia] = useState<PendingMediaQueueItem | null>(null)
  const [reasonCode, setReasonCode] = useState<ModerationReasonCode>('LOW_QUALITY_OR_BLURRY')
  const [notes, setNotes] = useState('')

  const handleApprove = async (mediaId: string) => {
    setActionInProgress(mediaId)
    const res = await moderateMediaAction({
      mediaId,
      decision: 'APPROVE',
    })
    setActionInProgress(null)

    if (res.success) {
      setItems((prev) => prev.filter((i) => i.id !== mediaId))
    } else {
      alert(res.error || 'Erro ao aprovar foto')
    }
  }

  const handleRejectConfirm = async () => {
    if (!rejectModalMedia) return
    setActionInProgress(rejectModalMedia.id)
    const res = await moderateMediaAction({
      mediaId: rejectModalMedia.id,
      decision: 'REJECT',
      reasonCode,
      notes,
    })
    setActionInProgress(null)

    if (res.success) {
      setItems((prev) => prev.filter((i) => i.id !== rejectModalMedia.id))
      setRejectModalMedia(null)
      setNotes('')
    } else {
      alert(res.error || 'Erro ao rejeitar foto')
    }
  }

  const handleQuarantineConfirm = async () => {
    if (!quarantineModalMedia) return
    setActionInProgress(quarantineModalMedia.id)
    const res = await moderateMediaAction({
      mediaId: quarantineModalMedia.id,
      decision: 'QUARANTINE',
      reasonCode,
      notes,
    })
    setActionInProgress(null)

    if (res.success) {
      setItems((prev) => prev.filter((i) => i.id !== quarantineModalMedia.id))
      setQuarantineModalMedia(null)
      setNotes('')
    } else {
      alert(res.error || 'Erro ao quarentenar foto')
    }
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#1f2937', borderRadius: '0.5rem', color: '#9ca3af' }}>
        <p style={{ fontSize: '1.125rem', fontWeight: 500, color: '#f3f4f6' }}>Fila de Moderação Vazia</p>
        <p style={{ fontSize: '0.875rem' }}>Não há fotos pendentes de aprovação no momento.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              backgroundColor: '#1f2937',
              borderRadius: '0.5rem',
              overflow: 'hidden',
              border: item.is_primary ? '2px solid #3b82f6' : '1px solid #374151',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ position: 'relative', height: '280px', backgroundColor: '#111827' }}>
              {item.preview_url ? (
                <img
                  src={item.preview_url}
                  alt={item.stage_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280' }}>
                  Sem preview
                </div>
              )}
              {item.is_primary && (
                <span
                  style={{
                    position: 'absolute',
                    top: '0.5rem',
                    left: '0.5rem',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                  }}
                >
                  Foto Principal
                </span>
              )}
            </div>

            <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.25rem' }}>
                  {item.stage_name}
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '1rem' }}>
                  <span>{item.public_age ? `${item.public_age} anos` : 'Idade ñ inf.'}</span>
                  <span>•</span>
                  <span style={{ color: item.identity_verified && item.age_verified ? '#10b981' : '#f59e0b', fontWeight: 500 }}>
                    Identidade {item.identity_verified ? 'verificada' : 'pendente'} · Maioridade {item.age_verified ? 'confirmada' : 'pendente'}
                  </span>
                </div>
              </div>

              <Link href={`/admin/profiles?profile=${item.profile_id}`} style={{ display: 'inline-block', marginTop: '0.75rem', color: '#93c5fd', fontSize: '0.75rem' }}>
                Ver moderação dos textos
              </Link>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleApprove(item.id)}
                  disabled={actionInProgress === item.id}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Aprovar
                </button>
                <button
                  onClick={() => {
                    setRejectModalMedia(item)
                    setReasonCode('LOW_QUALITY_OR_BLURRY')
                  }}
                  disabled={actionInProgress === item.id}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Rejeitar
                </button>
                <button
                  onClick={() => {
                    setQuarantineModalMedia(item)
                    setReasonCode('UNDERAGE_SUSPICION')
                  }}
                  disabled={actionInProgress === item.id}
                  style={{
                    padding: '0.5rem',
                    backgroundColor: '#b45309',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                  title="Quarentena de Segurança"
                >
                  ⚠️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reject Modal */}
      {rejectModalMedia && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: '#1f2937', padding: '1.5rem', borderRadius: '0.5rem', maxWidth: '450px', width: '100%', color: '#f3f4f6' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Rejeitar Foto de {rejectModalMedia.stage_name}</h3>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Motivo da Rejeição *</label>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value as ModerationReasonCode)}
                style={{ width: '100%', padding: '0.5rem', backgroundColor: '#374151', color: '#fff', borderRadius: '0.375rem', border: '1px solid #4b5563' }}
              >
                <option value="LOW_QUALITY_OR_BLURRY">Qualidade baixa / desfocada</option>
                <option value="WATERMARK_OR_PROMOTIONAL">Marca d&apos;água ou texto promocional</option>
                <option value="NON_HUMAN_OR_MISMATCH">Não retrata a anunciante / banco de imagens</option>
                <option value="EXPLICIT_ILLEGAL_CONTENT">Conteúdo ilícito</option>
                <option value="OTHER_POLICY_VIOLATION">Outra violação de diretrizes</option>
              </select>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Observação interna (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                style={{ width: '100%', padding: '0.5rem', backgroundColor: '#374151', color: '#fff', borderRadius: '0.375rem', border: '1px solid #4b5563' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => setRejectModalMedia(null)} style={{ padding: '0.5rem 1rem', backgroundColor: '#4b5563', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleRejectConfirm} style={{ padding: '0.5rem 1rem', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '0.375rem', fontWeight: 600, cursor: 'pointer' }}>Confirmar Rejeição</button>
            </div>
          </div>
        </div>
      )}

      {/* Quarantine Modal */}
      {quarantineModalMedia && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: '#1f2937', padding: '1.5rem', borderRadius: '0.5rem', maxWidth: '450px', width: '100%', color: '#f3f4f6' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: '#f59e0b' }}>⚠️ Quarentena de Segurança</h3>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1rem' }}>
              Mover para quarentena oculta o conteúdo imediatamente. Se o motivo for <strong>Suspeita de Menoridade</strong>, o perfil será marcado como FLAGGED e bloqueado de publicação.
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Motivo de Segurança *</label>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value as ModerationReasonCode)}
                style={{ width: '100%', padding: '0.5rem', backgroundColor: '#374151', color: '#fff', borderRadius: '0.375rem', border: '1px solid #4b5563' }}
              >
                <option value="UNDERAGE_SUSPICION">Suspeita de Menoridade (18+)</option>
                <option value="VIOLENCE_OR_COERCION">Violência / Coerção / Exploração</option>
                <option value="EXPLICIT_ILLEGAL_CONTENT">Conteúdo Ilícito Grave</option>
              </select>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Notas do Moderador (obrigatório)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Descreva a razão técnica para a quarentena..."
                style={{ width: '100%', padding: '0.5rem', backgroundColor: '#374151', color: '#fff', borderRadius: '0.375rem', border: '1px solid #4b5563' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => setQuarantineModalMedia(null)} style={{ padding: '0.5rem 1rem', backgroundColor: '#4b5563', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleQuarantineConfirm} style={{ padding: '0.5rem 1rem', backgroundColor: '#b45309', color: '#fff', border: 'none', borderRadius: '0.375rem', fontWeight: 600, cursor: 'pointer' }}>Aplicar Quarentena</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
