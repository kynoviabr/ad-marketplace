'use client'

import React from 'react'

export interface SubscriptionStatusProps {
  status: string
  planName: string
  priceDisplay: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  gracePeriodEnd: string | null
  isFreeLaunch: boolean
}

export function SubscriptionStatus({
  status,
  planName,
  priceDisplay,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  gracePeriodEnd,
  isFreeLaunch,
}: SubscriptionStatusProps) {
  const getStatusBadge = () => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return {
          label: 'Ativa',
          backgroundColor: '#064e3b',
          color: '#a7f3d0',
          borderColor: '#10b981',
        }
      case 'PAST_DUE':
        return {
          label: 'Pagamento Pendente',
          backgroundColor: '#78350f',
          color: '#fde68a',
          borderColor: '#f59e0b',
        }
      case 'GRACE_PERIOD':
        return {
          label: 'Período de Tolerância',
          backgroundColor: '#7c2d12',
          color: '#fed7aa',
          borderColor: '#ea580c',
        }
      case 'EXPIRED':
        return {
          label: 'Expirada',
          backgroundColor: '#7f1d1d',
          color: '#fecaca',
          borderColor: '#ef4444',
        }
      case 'INCOMPLETE':
        return {
          label: 'Incompleta',
          backgroundColor: '#374151',
          color: '#d1d5db',
          borderColor: '#6b7280',
        }
      default:
        return {
          label: status,
          backgroundColor: '#374151',
          color: '#d1d5db',
          borderColor: '#6b7280',
        }
    }
  }

  const badge = getStatusBadge()

  const formatDate = (isoString: string | null) => {
    if (!isoString) return '—'
    try {
      return new Date(isoString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return isoString
    }
  }

  return (
    <div
      style={{
        backgroundColor: '#1f2937',
        color: '#ffffff',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        border: '1px solid #374151',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #374151',
          paddingBottom: '1rem',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
            {planName}
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#9ca3af' }}>
            Valor: {priceDisplay}
          </p>
        </div>

        <span
          style={{
            backgroundColor: badge.backgroundColor,
            color: badge.color,
            border: `1px solid ${badge.borderColor}`,
            fontSize: '0.8125rem',
            fontWeight: 600,
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            textTransform: 'uppercase',
            letterSpacing: '0.025em',
          }}
        >
          {badge.label}
        </span>
      </div>

      {isFreeLaunch && (
        <div
          style={{
            backgroundColor: '#1e3a5f',
            border: '1px solid #3b82f6',
            color: '#bfdbfe',
            padding: '0.875rem 1rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>🎁</span>
          <div>
            <strong style={{ color: '#ffffff' }}>Período de Lançamento Gratuito:</strong>
            <p style={{ margin: '0.25rem 0 0 0', color: '#dbeafe', fontSize: '0.8125rem' }}>
              Você está usufruindo de acesso total promocional sem cobranças durante a fase de lançamento da plataforma.
            </p>
          </div>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#111827',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '1px solid #374151',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '0.25rem' }}>
            Vigência do Período Atual
          </span>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: '#f3f4f6' }}>
            {currentPeriodEnd ? `Até ${formatDate(currentPeriodEnd)}` : 'Indeterminado'}
          </span>
        </div>

        {gracePeriodEnd && (
          <div
            style={{
              backgroundColor: '#111827',
              padding: '1rem',
              borderRadius: '0.5rem',
              border: '1px solid #ea580c',
            }}
          >
            <span style={{ fontSize: '0.75rem', color: '#fdba74', display: 'block', marginBottom: '0.25rem' }}>
              Limite de Tolerância (Grace Period)
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#fed7aa' }}>
              {formatDate(gracePeriodEnd)}
            </span>
          </div>
        )}
      </div>

      {cancelAtPeriodEnd && (
        <div
          style={{
            marginTop: '1.25rem',
            backgroundColor: '#451a03',
            border: '1px solid #b45309',
            color: '#fde68a',
            padding: '0.875rem 1rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>⚠️</span>
          <span>
            <strong>Cancelamento programado:</strong> Sua assinatura não será renovada automaticamente e será encerrada ao final do período em{' '}
            {formatDate(currentPeriodEnd)}.
          </span>
        </div>
      )}
    </div>
  )
}
