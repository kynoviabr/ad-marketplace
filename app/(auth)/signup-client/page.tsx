import { ClientSignupForm } from '@/components/auth/client-signup-form'

export const metadata = {
  title: 'Criar conta de cliente — velvet.',
  description: 'Crie sua conta de cliente na velvet.',
  robots: 'noindex, nofollow',
}

export default function ClientSignupPage() {
  return <ClientSignupForm />
}
