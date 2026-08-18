import React from 'react'
import type { BoostCampaignStatus } from '@/modules/promotions/types'

interface CampaignBadgeProps {
  status: BoostCampaignStatus
}

export function CampaignBadge({ status }: CampaignBadgeProps) {
  const styles: Record<BoostCampaignStatus, { bg: string; text: string; label: string }> = {
    ACTIVE: { bg: '#064e3b', text: '#34d399', label: 'Ativo' },
    SCHEDULED: { bg: '#1e3a8a', text: '#60a5fa', label: 'Programado' },
    PENDING_PAYMENT: { bg: '#78350f', text: '#fbbf24', label: 'Aguardando Pagamento' },
    COMPLETED: { bg: '#374151', text: '#9ca3af', label: 'Concluído' },
    CANCELED: { bg: '#7f1d1d', text: '#f87171', label: 'Cancelado' },
    FAILED: { bg: '#7f1d1d', text: '#f87171', label: 'Falhou' },
  }

  const s = styles[status] || { bg: '#374151', text: '#9ca3af', label: status }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: s.bg,
        color: s.text,
      }}
    >
      {s.label}
    </span>
  )
}
