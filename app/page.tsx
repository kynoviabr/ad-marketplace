import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AD-Marketplace — Development Environment',
  description: 'Foundation bootstrap — development only',
}

export default function HomePage() {
  return (
    <main id="main-content">
      <div className="status-card">
        <h1>AD-Marketplace</h1>
        <p className="environment-label">Development Environment</p>
        <div className="status-row">
          <span className="status-indicator" aria-label="Status: OK" />
          <span>Application status: <strong>OK</strong></span>
        </div>
        <p className="phase-label">FASE 00 — Foundation / Bootstrap</p>
      </div>
    </main>
  )
}
