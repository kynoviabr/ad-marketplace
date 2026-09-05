'use client'

import React, { useState } from 'react'
import { initiateCheckoutAction } from '@/modules/billing/actions'

export interface CheckoutButtonProps {
  planId: string
  priceId: string
  label: string
  disabled: boolean
}

export function CheckoutButton({
  planId,
  priceId,
  label,
  disabled,
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
        className="billing-checkout-button"
      >
        {loading ? (
          <>
            <span className="billing-checkout-spinner" />
            <span>Iniciando checkout...</span>
          </>
        ) : (
          label
        )}
      </button>

      {errorMessage && (
        <p className="billing-checkout-error" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
