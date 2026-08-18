'use client'

import React, { useState } from 'react'
import { initiateCheckoutAction } from '@/modules/billing/actions'

export interface CheckoutButtonProps {
  planId: string
  priceId: string
  label: string
  disabled: boolean
  successUrl?: string
  cancelUrl?: string
}

export function CheckoutButton({
  planId,
  priceId,
  label,
  disabled,
  successUrl,
  cancelUrl,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleCheckout = async () => {
    if (disabled || loading) return

    try {
      setLoading(true)
      setErrorMessage(null)

      const result = await initiateCheckoutAction({
        planId,
        priceId,
        successUrl,
        cancelUrl,
      })

      if (!result.success) {
        setErrorMessage(result.error || 'Erro ao iniciar checkout.')
        setLoading(false)
        return
      }

      if (result.data?.checkoutUrl) {
        window.location.href = result.data.checkoutUrl
      } else {
        setErrorMessage('URL de checkout não fornecida.')
        setLoading(false)
      }
    } catch (err) {
      console.error('[CheckoutButton] Error:', err instanceof Error ? err.message : err)
      setErrorMessage('Ocorreu um erro ao processar seu pagamento. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCheckout}
        disabled={disabled || loading}
        style={{
          width: '100%',
          padding: '0.75rem 1.25rem',
          backgroundColor: disabled || loading ? '#4b5563' : '#2563eb',
          color: '#ffffff',
          fontSize: '0.95rem',
          fontWeight: 600,
          borderRadius: '0.5rem',
          border: 'none',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          transition: 'background-color 0.2s, opacity 0.2s',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {loading ? (
          <>
            <span
              style={{
                display: 'inline-block',
                width: '1rem',
                height: '1rem',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTopColor: '#ffffff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span>Iniciando checkout...</span>
          </>
        ) : (
          label
        )}
      </button>

      {errorMessage && (
        <p
          style={{
            color: '#ef4444',
            fontSize: '0.8125rem',
            marginTop: '0.5rem',
            textAlign: 'center',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            padding: '0.375rem 0.5rem',
            borderRadius: '0.25rem',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          {errorMessage}
        </p>
      )}
    </div>
  )
}
