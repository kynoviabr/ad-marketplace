import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Verificação de Identidade | AD-Marketplace',
}

export default async function VerificationOnboardingPage() {
  redirect('/onboarding/verificacao')
}
