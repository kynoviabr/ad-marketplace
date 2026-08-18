import { logoutAction } from '@/modules/auth/actions'

export const metadata = {
  title: 'Conta suspensa — AD-Marketplace',
  robots: 'noindex, nofollow',
}

export default function SuspendedPage() {
  return (
    <main className="auth-layout">
      <div className="auth-container">
        <div className="auth-form">
          <h1 className="auth-title">Conta suspensa</h1>
          <p className="auth-subtitle">
            Sua conta foi temporariamente suspensa.
            Entre em contato com o suporte para mais informações.
          </p>
          <form action={logoutAction}>
            <button type="submit" className="btn btn--ghost">
              Sair
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
