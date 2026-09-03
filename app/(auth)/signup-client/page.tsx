import { ClientSignupForm } from '@/components/auth/client-signup-form'

export const metadata = {
  title: 'Criar conta de cliente — Velvet',
  description: 'Crie sua conta de cliente na Velvet',
  robots: 'noindex, nofollow',
}

export default function ClientSignupPage() {
  return <ClientSignupForm />
}
