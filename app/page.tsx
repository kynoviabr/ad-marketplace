import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'AD-Marketplace — Development Environment',
  description: 'Foundation bootstrap — development only',
  robots: 'noindex, nofollow',
}

export default function HomePage() {
  return (
    <main id="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="status-card">
        <h1>AD-Marketplace</h1>
        <p className="environment-label">Development Environment</p>
        <div className="status-row">
          <span className="status-indicator" aria-label="Status: OK" />
          <span>Application status: <strong>OK</strong></span>
        </div>
        <p className="phase-label">FASE 01 — Authentication &amp; Account</p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <Link href="/login" className="btn btn--primary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            Login
          </Link>
          <Link href="/signup" className="btn btn--ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            Criar conta
          </Link>
        </div>
      </div>
    </main>
  )
}
