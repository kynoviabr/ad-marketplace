import Link from 'next/link'

export const metadata = {
  title: 'Confirme seu e-mail — AD-Marketplace',
  robots: 'noindex, nofollow',
}

export default function VerifyEmailPage() {
  return (
    <div className="auth-form">
      <h1 className="auth-title">Verifique seu e-mail</h1>
      <p className="auth-subtitle">
        Enviamos um link de confirmação para o seu e-mail.
        <br />
        Clique no link para ativar sua conta.
      </p>
      <p className="auth-note">
        Não recebeu? Verifique a caixa de spam ou{' '}
        <Link href="/signup">tente novamente</Link>.
      </p>
      <p className="auth-footer">
        <Link href="/login">Voltar para o login</Link>
      </p>
    </div>
  )
}
