'use client'

import React from 'react'

export interface PlanCardProps {
  planName: string
  planCode: string
  priceDisplay: string
  isPromotional: boolean
  onSelect: () => void
  description?: string | null
  features?: string[]
  disabled?: boolean
  buttonLabel?: string
}

export function PlanCard({
  planName,
  planCode,
  priceDisplay,
  isPromotional,
  onSelect,
  description,
  features,
  disabled = false,
  buttonLabel = 'Assinar',
}: PlanCardProps) {
  return (
    <div
      style={{
        backgroundColor: '#1f2937',
        color: '#ffffff',
        border: isPromotional ? '2px solid #f59e0b' : '1px solid #374151',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }}
    >
      {isPromotional && (
        <div
          style={{
            position: 'absolute',
            top: '-0.75rem',
            right: '1rem',
            backgroundColor: '#f59e0b',
            color: '#111827',
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Destaque Promocional
        </div>
      )}

      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '0.75rem',
            gap: '0.5rem',
          }}
        >
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            {planName}
          </h3>
          <span
            style={{
              fontSize: '0.75rem',
              color: '#9ca3af',
              backgroundColor: '#374151',
              padding: '0.2rem 0.5rem',
              borderRadius: '0.25rem',
              fontWeight: 500,
              fontFamily: 'monospace',
            }}
          >
            {planCode}
          </span>
        </div>

        {description && (
          <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1.25rem', lineHeight: '1.4' }}>
            {description}
          </p>
        )}

        <div style={{ margin: '1rem 0 1.5rem 0' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
            {priceDisplay}
          </div>
        </div>

        {features && features.length > 0 && (
          <div style={{ borderTop: '1px solid #374151', paddingTop: '1rem', marginBottom: '1.5rem' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {features.map((feature, idx) => (
                <li
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#d1d5db',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          backgroundColor: disabled ? '#4b5563' : '#3b82f6',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '0.95rem',
          borderRadius: '0.5rem',
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
          marginTop: '1rem',
        }}
      >
        {buttonLabel}
      </button>
    </div>
  )
}
