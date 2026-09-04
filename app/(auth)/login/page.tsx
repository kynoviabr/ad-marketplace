import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Entrar — Velvet',
  description: 'Acesse seu espaço profissional na Velvet',
  robots: 'noindex, nofollow',
}

interface LoginPageProps {
  searchParams?: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined
  const error = resolvedParams?.error

  return (
    <Suspense fallback={<div className="auth-form" />}>
      <LoginForm key={error || 'normal-login'} errorParam={error} />
    </Suspense>
  )
}
