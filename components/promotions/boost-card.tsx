'use client'

import React, { useState } from 'react'
import type { BoostProductDTO, BoostPriceDTO } from '@/modules/promotions/types'
import { initiateBoostCheckoutAction } from '@/modules/promotions/actions'

interface BoostCardProps {
  product: BoostProductDTO
  profileId: string
  eligibleLocations: Array<{ id: string; name: string }>
  onSuccess?: () => void
}

export function BoostCard({ product, profileId, eligibleLocations, onSuccess }: BoostCardProps) {
  const [selectedPriceId, setSelectedPriceId] = useState<string>(product.prices[0]?.id || '')
  const [selectedLocationId, setSelectedLocationId] = useState<string>(eligibleLocations[0]?.id || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const selectedPrice = product.prices.find((p) => p.id === selectedPriceId) || product.prices[0]

  const formatPrice = (amountMinor: number, currency: string) => {
    return (amountMinor / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency,
    })
  }

  const handlePurchase = async () => {
    if (!selectedPrice) return
    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await initiateBoostCheckoutAction({
        profileId,
        boostProductId: product.id,
        boostPriceId: selectedPrice.id,
        locationId: product.scopeType === 'MARKETPLACE_LOCATION' ? selectedLocationId : undefined,
      })

      if (!res.success) {
        setError(res.error)
      } else {
        setSuccessMsg('Destaque ativado com sucesso!')
        if (onSuccess) onSuccess()
      }
    } catch (e: any) {
      setError(e?.message || 'Erro inesperado ao contratar destaque.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        backgroundColor: '#1f2937',
        borderRadius: '12px',
        border: '1px solid #374151',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#ffffff',
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: product.scopeType === 'CITY' ? '#38bdf8' : '#a78bfa',
              backgroundColor: product.scopeType === 'CITY' ? '#0369a133' : '#6d28d933',
              padding: '4px 10px',
              borderRadius: '9999px',
            }}
          >
            {product.scopeType === 'CITY' ? 'Toda a Cidade' : 'Bairro Específico'}
          </span>
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>{product.durationHours}h de Duração</span>
        </div>

        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{product.name}</h3>
        <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '20px', lineHeight: '1.4' }}>
          {product.description}
        </p>

        {product.scopeType === 'MARKETPLACE_LOCATION' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#d1d5db', marginBottom: '6px' }}>
              Selecione o Bairro:
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: '#111827',
                border: '1px solid #4b5563',
                color: '#ffffff',
                fontSize: '14px',
              }}
            >
              {eligibleLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {product.prices.length > 1 && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#d1d5db', marginBottom: '6px' }}>
              Opção de Preço:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {product.prices.map((pr) => (
                <button
                  key={pr.id}
                  type="button"
                  onClick={() => setSelectedPriceId(pr.id)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: selectedPriceId === pr.id ? '2px solid #ec4899' : '1px solid #4b5563',
                    backgroundColor: selectedPriceId === pr.id ? '#831843' : '#111827',
                    color: '#ffffff',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {formatPrice(pr.amountMinor, pr.currency)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px', borderTop: '1px solid #374151', paddingTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>Valor do Destaque</span>
          <span style={{ fontSize: '22px', fontWeight: 700, color: '#f472b6' }}>
            {selectedPrice ? formatPrice(selectedPrice.amountMinor, selectedPrice.currency) : '—'}
          </span>
        </div>

        {error && (
          <div
            style={{
              padding: '10px',
              borderRadius: '6px',
              backgroundColor: '#7f1d1d33',
              border: '1px solid #dc2626',
              color: '#f87171',
              fontSize: '13px',
              marginBottom: '12px',
            }}
          >
            {error}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: '10px',
              borderRadius: '6px',
              backgroundColor: '#064e3b33',
              border: '1px solid #059669',
              color: '#34d399',
              fontSize: '13px',
              marginBottom: '12px',
            }}
          >
            {successMsg}
          </div>
        )}

        <button
          type="button"
          onClick={handlePurchase}
          disabled={loading || !selectedPrice || (product.scopeType === 'MARKETPLACE_LOCATION' && !selectedLocationId)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: loading ? '#4b5563' : '#ec4899',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '15px',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {loading ? 'Ativando...' : 'Contratar Destaque'}
        </button>
      </div>
    </div>
  )
}
