'use client'

import Link from 'next/link'

/**
 * Offline Fallback Page for Velvet PWA.
 *
 * Rendered by the Service Worker when a navigation request fails due to lack of network.
 *
 * Privacy Invariants:
 * - Never contains or reveals personalized/authenticated data.
 * - Explains that live availability signals and verified photos require an active connection.
 * - Provides a clear reconnection/retry action.
 */
export default function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <main className="velvet-offline-container">
      <div className="velvet-offline-card">
        <span className="velvet-offline-eyebrow">MODO OFFLINE</span>
        <h1 className="velvet-offline-title">Você está sem conexão</h1>
        <p className="velvet-offline-desc">
          Algumas informações da Velvet, como fotos, sinalização de disponibilidade em tempo real e áreas protegidas, precisam de internet ativa para serem atualizadas com segurança.
        </p>
        <div className="velvet-offline-actions">
          <button
            type="button"
            onClick={handleRetry}
            className="velvet-offline-btn-primary"
          >
            Tentar reconectar
          </button>
          <Link href="/" className="velvet-offline-btn-secondary">
            Ir para o início
          </Link>
        </div>
      </div>
    </main>
  )
}
