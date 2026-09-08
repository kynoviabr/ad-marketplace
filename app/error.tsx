'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[velvet:error-boundary]', error)
    }
  }, [error])

  return (
    <div className="velvet-public-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FAF8F5', color: '#211B19' }}>
      <header style={{ padding: '24px 32px', borderBottom: '1px solid rgba(59, 32, 63, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontFamily: 'var(--font-serif, serif)', fontSize: '28px', fontWeight: 500, letterSpacing: '-1.5px', color: '#211B19', textDecoration: 'none' }}>
          velvet<span style={{ color: '#71357D' }}>.</span>
        </Link>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 24px' }}>
        <div style={{ maxWidth: '520px', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#71357D', fontWeight: 700, marginBottom: '16px' }}>
            AVISO
          </p>
          <h1 style={{ fontFamily: 'var(--font-serif, serif)', fontSize: 'clamp(32px, 5vw, 44px)', fontWeight: 400, lineHeight: 1.15, letterSpacing: '-0.03em', color: '#211B19', marginBottom: '16px' }}>
            Algo inesperado aconteceu.
          </h1>
          <p style={{ fontSize: '15px', lineHeight: 1.6, color: '#6B625E', marginBottom: '32px' }}>
            Não foi possível completar esta ação no momento. Suas informações permanecem seguras e nenhuma alteração indevida foi realizada.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '44px',
                padding: '0 24px',
                backgroundColor: '#3B203F',
                color: '#FAF8F5',
                border: 'none',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.04em',
                cursor: 'pointer',
              }}
            >
              Tentar novamente
            </button>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '44px',
                padding: '0 24px',
                backgroundColor: 'transparent',
                color: '#211B19',
                border: '1px solid rgba(59, 32, 63, 0.24)',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textDecoration: 'none',
              }}
            >
              Voltar ao início
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
