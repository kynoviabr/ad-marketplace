'use client'

import React, { useState } from 'react'
import { CampaignBadge } from '@/components/promotions/campaign-badge'
import { cancelBoostCampaignAction } from '@/modules/promotions/actions'

interface AdminBoostsOverviewProps {
  campaigns: any[]
}

export function AdminBoostsOverview({ campaigns: initialCampaigns }: AdminBoostsOverviewProps) {
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeCount = campaigns.filter((c) => c.status === 'ACTIVE').length
  const scheduledCount = campaigns.filter((c) => c.status === 'SCHEDULED').length
  const completedCount = campaigns.filter((c) => c.status === 'COMPLETED').length
  const canceledCount = campaigns.filter((c) => c.status === 'CANCELED').length

  const handleCancelSubmit = async (campaignId: string) => {
    if (!cancelReason || cancelReason.length < 3) {
      setError('Informe um motivo com pelo menos 3 caracteres.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await cancelBoostCampaignAction({
        campaignId,
        reason: cancelReason,
      })

      if (!res.success) {
        setError(res.error)
      } else {
        setCampaigns((prev) =>
          prev.map((c) =>
            c.id === campaignId
              ? { ...c, status: 'CANCELED', cancellation_reason: cancelReason, canceled_at: new Date().toISOString() }
              : c
          )
        )
        setCancelingId(null)
        setCancelReason('')
      }
    } catch (e: any) {
      setError(e?.message || 'Erro ao cancelar destaque.')
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (iso: string) => {
    return new Date(iso).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  return (
    <div>
      {/* Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div style={{ backgroundColor: '#1f2937', padding: '20px', borderRadius: '12px', border: '1px solid #374151' }}>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>Destaques Ativos</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: '#34d399' }}>{activeCount}</p>
        </div>
        <div style={{ backgroundColor: '#1f2937', padding: '20px', borderRadius: '12px', border: '1px solid #374151' }}>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>Programados</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: '#60a5fa' }}>{scheduledCount}</p>
        </div>
        <div style={{ backgroundColor: '#1f2937', padding: '20px', borderRadius: '12px', border: '1px solid #374151' }}>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>Concluídos</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: '#9ca3af' }}>{completedCount}</p>
        </div>
        <div style={{ backgroundColor: '#1f2937', padding: '20px', borderRadius: '12px', border: '1px solid #374151' }}>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>Cancelados</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: '#f87171' }}>{canceledCount}</p>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#7f1d1d33',
            border: '1px solid #dc2626',
            borderRadius: '8px',
            color: '#f87171',
            marginBottom: '20px',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      {/* Campaigns Table */}
      <div
        style={{
          backgroundColor: '#1f2937',
          borderRadius: '12px',
          border: '1px solid #374151',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#ffffff' }}>
          <thead>
            <tr style={{ backgroundColor: '#111827', borderBottom: '1px solid #374151', fontSize: '13px', color: '#9ca3af' }}>
              <th style={{ padding: '14px 16px' }}>Anunciante</th>
              <th style={{ padding: '14px 16px' }}>Produto</th>
              <th style={{ padding: '14px 16px' }}>Escopo / Local</th>
              <th style={{ padding: '14px 16px' }}>Período</th>
              <th style={{ padding: '14px 16px' }}>Valor</th>
              <th style={{ padding: '14px 16px' }}>Status</th>
              <th style={{ padding: '14px 16px', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '14px' }}>
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>
                  Nenhum destaque registrado no sistema.
                </td>
              </tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #374151' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{c.profile?.stage_name || 'Perfil'}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>@{c.profile?.slug}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>{c.product?.name}</td>
                  <td style={{ padding: '14px 16px', color: '#d1d5db' }}>
                    {c.scope_type === 'CITY' ? `Cidade (${c.city?.name})` : `Bairro (${c.location?.name || c.city?.name})`}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', color: '#9ca3af' }}>
                    <div>De: {formatDateTime(c.starts_at)}</div>
                    <div>Até: {formatDateTime(c.ends_at)}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#f472b6', fontWeight: 600 }}>
                    {(c.price?.amount_minor / 100).toLocaleString('pt-BR', { style: 'currency', currency: c.price?.currency || 'BRL' })}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <CampaignBadge status={c.status} />
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    {(c.status === 'ACTIVE' || c.status === 'SCHEDULED') && (
                      <div>
                        {cancelingId === c.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                            <input
                              type="text"
                              placeholder="Motivo do cancelamento..."
                              value={cancelReason}
                              onChange={(e) => setCancelReason(e.target.value)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '4px',
                                backgroundColor: '#111827',
                                border: '1px solid #4b5563',
                                color: '#ffffff',
                                fontSize: '12px',
                                width: '180px',
                              }}
                            />
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleCancelSubmit(c.id)}
                                disabled={loading}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: '#dc2626',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                }}
                              >
                                {loading ? '...' : 'Confirmar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelingId(null)
                                  setCancelReason('')
                                }}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: '#374151',
                                  color: '#d1d5db',
                                  border: 'none',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                }}
                              >
                                Voltar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCancelingId(c.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              backgroundColor: '#7f1d1d33',
                              border: '1px solid #dc2626',
                              color: '#f87171',
                              fontSize: '13px',
                              cursor: 'pointer',
                            }}
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
