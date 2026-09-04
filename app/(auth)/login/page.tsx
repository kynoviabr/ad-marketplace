import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'

export const metadata = {
  title: 'Entrar — Velvet',
  description: 'Acesse seu espaço profissional na Velvet',
  robots: 'noindex, nofollow',
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-form" />}>
      <LoginForm />
    </Suspense>
  )
}
