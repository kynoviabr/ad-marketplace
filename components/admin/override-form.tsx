'use client'

import React, { useState } from 'react'
import { grantOverrideAction, revokeOverrideAction } from '@/modules/billing/actions'

export interface BillingOverrideItem {
  id: string
  account_user_id: string
  reason: string
  granted_by?: string
  expires_at: string | null
  revoked_at?: string | null
  created_at: string
}

export interface OverrideFormProps {
  accountUserId: string
  initialOverrides?: BillingOverrideItem[]
}

export function OverrideForm({ accountUserId, initialOverrides = [] }: OverrideFormProps) {
  const [targetUserId, setTargetUserId] = useState(accountUserId)
  const [reason, setReason] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [overrides, setOverrides] = useState<BillingOverrideItem[]>(initialOverrides)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason || reason.trim().length < 5) {
      setFeedback({ type: 'error', message: 'O motivo deve conter pelo menos 5 caracteres.' })
      return
    }

    if (!targetUserId || targetUserId.trim().length === 0) {
      setFeedback({ type: 'error', message: 'O ID do usuário da conta é obrigatório.' })
      return
    }

    try {
      setIsSubmitting(true)
      setFeedback(null)

      const payload = {
        accountUserId: targetUserId.trim(),
        reason: reason.trim(),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      }

      const res = await grantOverrideAction(payload)

      if (!res.success) {
        setFeedback({ type: 'error', message: res.error || 'Erro ao conceder override.' })
        setIsSubmitting(false)
        return
      }

      // Add newly granted override to list
      const newOverride: BillingOverrideItem = {
        id: crypto.randomUUID(),
        account_user_id: targetUserId.trim(),
        reason: reason.trim(),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        created_at: new Date().toISOString(),
      }

      setOverrides((prev) => [newOverride, ...prev])
      setReason('')
      setExpiresAt('')
      setFeedback({ type: 'success', message: 'Override concedido com sucesso!' })
    } catch (err) {
      console.error('[OverrideForm] Error:', err instanceof Error ? err.message : err)
      setFeedback({ type: 'error', message: 'Erro inesperado ao conceder override.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRevoke = async (overrideId: string) => {
    try {
      setRevokingId(overrideId)
      setFeedback(null)

      const res = await revokeOverrideAction({ overrideId })

      if (!res.success) {
        setFeedback({ type: 'error', message: res.error || 'Erro ao revogar override.' })
        setRevokingId(null)
        return
      }

      setOverrides((prev) => prev.filter((o) => o.id !== overrideId))
      setFeedback({ type: 'success', message: 'Override revogado com sucesso.' })
    } catch (err) {
      console.error('[OverrideForm] Revoke error:', err instanceof Error ? err.message : err)
      setFeedback({ type: 'error', message: 'Erro inesperado ao revogar override.' })
    } finally {
      setRevokingId(null)
    }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Sem expiração (Permanente)'
    try {
      return new Date(iso).toLocaleString('pt-BR')
    } catch {
      return iso
    }
  }

  return (
    <div
      style={{
        backgroundColor: '#1f2937',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        border: '1px solid #374151',
        color: '#ffffff',
      }}
    >
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: '#ffffff' }}>
        Gerenciamento de Override de Billing
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1.5rem' }}>
        Conceda isenções manuais para permitir publicação e recursos sem necessidade de assinatura ativa paga.
      </p>

      {feedback && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.375rem',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
            backgroundColor: feedback.type === 'success' ? '#064e3b' : '#7f1d1d',
            color: feedback.type === 'success' ? '#a7f3d0' : '#fecaca',
            border: `1px solid ${feedback.type === 'success' ? '#059669' : '#dc2626'}`,
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* Grant Override Form */}
      <form onSubmit={handleGrant} style={{ marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', color: '#d1d5db' }}>
            ID do Anunciante (Account User ID) *
          </label>
          <input
            type="text"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            required
            placeholder="00000000-0000-0000-0000-000000000000"
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem',
              backgroundColor: '#111827',
              border: '1px solid #4b5563',
              borderRadius: '0.375rem',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontFamily: 'monospace',
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', color: '#d1d5db' }}>
            Motivo da Isenção / Override *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            placeholder="Explique o motivo da concessão (mínimo 5 caracteres)..."
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem',
              backgroundColor: '#111827',
              border: '1px solid #4b5563',
              borderRadius: '0.375rem',
              color: '#ffffff',
              fontSize: '0.875rem',
              resize: 'vertical',
            }}
          />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', color: '#d1d5db' }}>
            Data e Hora de Expiração (Opcional)
          </label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem',
              backgroundColor: '#111827',
              border: '1px solid #4b5563',
              borderRadius: '0.375rem',
              color: '#ffffff',
              fontSize: '0.875rem',
            }}
          />
          <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginTop: '0.25rem' }}>
            Deixe em branco para override por tempo indeterminado.
          </span>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: '0.625rem 1.25rem',
            backgroundColor: isSubmitting ? '#4b5563' : '#9333ea',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.875rem',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {isSubmitting ? 'Concedendo...' : 'Conceder Override'}
        </button>
      </form>

      {/* Active Overrides List */}
      <div style={{ borderTop: '1px solid #374151', paddingTop: '1.5rem' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f3f4f6', marginBottom: '0.75rem' }}>
          Overrides Ativos ({overrides.length})
        </h4>

        {overrides.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: 0 }}>
            Nenhum override ativo registrado.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {overrides.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: '#111827',
                  borderRadius: '0.375rem',
                  padding: '1rem',
                  border: '1px solid #374151',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.25rem' }}>
                    {item.reason}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    Expira em: <strong style={{ color: '#d1d5db' }}>{formatDate(item.expires_at)}</strong> • Concedido em:{' '}
                    {formatDate(item.created_at)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRevoke(item.id)}
                  disabled={revokingId === item.id}
                  style={{
                    padding: '0.375rem 0.75rem',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '0.25rem',
                    border: 'none',
                    cursor: revokingId === item.id ? 'not-allowed' : 'pointer',
                    opacity: revokingId === item.id ? 0.6 : 1,
                  }}
                >
                  {revokingId === item.id ? 'Revogando...' : 'Revogar'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
