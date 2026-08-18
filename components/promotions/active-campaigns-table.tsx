import React from 'react'
import type { ProfileBoostDTO } from '@/modules/promotions/types'
import { CampaignBadge } from './campaign-badge'

interface ActiveCampaignsTableProps {
  campaigns: ProfileBoostDTO[]
}

export function ActiveCampaignsTable({ campaigns }: ActiveCampaignsTableProps) {
  if (campaigns.length === 0) {
    return (
      <div
        style={{
          padding: '32px',
          textAlign: 'center',
          backgroundColor: '#1f2937',
          borderRadius: '12px',
          border: '1px solid #374151',
          color: '#9ca3af',
        }}
      >
        <p style={{ fontSize: '15px', marginBottom: '8px' }}>Nenhum destaque contratado até o momento.</p>
        <p style={{ fontSize: '13px' }}>
          Escolha uma das opções acima para aumentar a visibilidade do seu anúncio na busca.
        </p>
      </div>
    )
  }

  const formatDateTime = (iso: string) => {
    return new Date(iso).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  const formatPrice = (amountMinor: number, currency: string) => {
    return (amountMinor / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency,
    })
  }

  return (
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
            <th style={{ padding: '14px 16px' }}>Produto</th>
            <th style={{ padding: '14px 16px' }}>Escopo / Local</th>
            <th style={{ padding: '14px 16px' }}>Início</th>
            <th style={{ padding: '14px 16px' }}>Término</th>
            <th style={{ padding: '14px 16px' }}>Valor</th>
            <th style={{ padding: '14px 16px' }}>Status</th>
          </tr>
        </thead>
        <tbody style={{ fontSize: '14px' }}>
          {campaigns.map((c) => (
            <tr key={c.id} style={{ borderBottom: '1px solid #374151' }}>
              <td style={{ padding: '14px 16px', fontWeight: 600 }}>{c.productName}</td>
              <td style={{ padding: '14px 16px', color: '#d1d5db' }}>
                {c.scopeType === 'CITY' ? `Cidade (${c.cityName})` : `Bairro (${c.locationName || c.cityName})`}
              </td>
              <td style={{ padding: '14px 16px', color: '#9ca3af' }}>{formatDateTime(c.startsAt)}</td>
              <td style={{ padding: '14px 16px', color: '#9ca3af' }}>{formatDateTime(c.endsAt)}</td>
              <td style={{ padding: '14px 16px', color: '#f472b6', fontWeight: 600 }}>
                {formatPrice(c.amountMinor, c.currency)}
              </td>
              <td style={{ padding: '14px 16px' }}>
                <CampaignBadge status={c.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
