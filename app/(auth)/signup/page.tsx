import { SignupForm } from '@/components/auth/signup-form'

export const metadata = {
  title: 'Criar conta — velvet.',
  description: 'Crie sua conta profissional na velvet.',
  robots: 'noindex, nofollow',
}

export default function SignupPage() {
  return <SignupForm />
}
