/**
 * (auth) route group layout
 * Wraps all auth pages: /signup, /login, /forgot-password, /reset-password, /verify-email
 *
 * Route groups use parentheses — (auth) — so they do NOT appear in the URL.
 */

import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-layout">
      <Link href="/" className="velvet-wordmark auth-wordmark" aria-label="Velvet, início">
        velvet<span>.</span>
      </Link>
      <aside className="auth-editorial" aria-hidden="true">
        <p>PARA PROFISSIONAIS</p>
        <strong>Seu espaço.<br />Sua imagem.<br />Suas escolhas.</strong>
        <span>VELVET / SÃO PAULO</span>
      </aside>
      <div className="auth-container">{children}</div>
    </main>
  )
}
