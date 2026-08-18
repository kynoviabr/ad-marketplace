import { logoutAction } from '@/modules/auth/actions'

export const metadata = {
  title: 'Complete seu cadastro — AD-Marketplace',
  robots: 'noindex, nofollow',
}

/**
 * Safe incomplete state recovery page.
 *
 * Shown when a user is authenticated but their account_users record
 * has NULL terms/privacy fields (admin client write failed after signUp).
 *
 * In FASE 01, the user is instructed to contact support or sign up again.
 * Future phases may implement an in-app re-acceptance flow.
 */
export default function CompleteSignupPage() {
  return (
    <main className="auth-layout">
      <div className="auth-container">
        <div className="auth-form">
          <h1 className="auth-title">Cadastro incompleto</h1>
          <p className="auth-subtitle">
            Seu cadastro não foi concluído corretamente.
            Por favor, saia e crie uma nova conta, ou entre em contato com o suporte.
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
