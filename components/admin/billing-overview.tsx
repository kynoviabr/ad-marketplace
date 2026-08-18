'use client'

import React from 'react'

export interface BillingOverviewProps {
  stats: {
    totalActive: number
    totalTrialing: number
    totalPastDue: number
    totalExpired: number
    totalOverrides: number
  }
}

export function BillingOverview({ stats }: BillingOverviewProps) {
  const cards = [
    {
      title: 'Assinaturas Ativas',
      count: stats.totalActive,
      color: '#10b981',
      borderColor: '#059669',
      description: 'Anunciantes com plano ativo e regular',
    },
    {
      title: 'Período de Teste / Trial',
      count: stats.totalTrialing,
      color: '#60a5fa',
      borderColor: '#2563eb',
      description: 'Contas em onboarding ou lançamento',
    },
    {
      title: 'Pagamento Pendente',
      count: stats.totalPastDue,
      color: '#fbbf24',
      borderColor: '#d97706',
      description: 'Cobrança falhou ou em tolerância',
    },
    {
      title: 'Expiradas / Canceladas',
      count: stats.totalExpired,
      color: '#f87171',
      borderColor: '#dc2626',
      description: 'Assinaturas finalizadas',
    },
    {
      title: 'Overrides Ativos',
      count: stats.totalOverrides,
      color: '#c084fc',
      borderColor: '#9333ea',
      description: 'Isenções concedidas manualmente',
    },
  ]

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', marginBottom: '1rem' }}>
        Métricas de Cobrança e Assinaturas
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        {cards.map((card, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: '#1f2937',
              borderRadius: '0.5rem',
              padding: '1.25rem',
              border: `1px solid ${card.borderColor}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#9ca3af' }}>
                  {card.title}
                </span>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: card.color,
                    display: 'inline-block',
                  }}
                />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.25rem' }}>
                {card.count}
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
              {card.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
