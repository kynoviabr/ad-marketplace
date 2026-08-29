import { SignupForm } from '@/components/auth/signup-form'

export const metadata = {
  title: 'Criar conta — Velvet',
  description: 'Crie sua conta profissional na Velvet',
  robots: 'noindex, nofollow',
}

export default function SignupPage() {
  return <SignupForm />
}
