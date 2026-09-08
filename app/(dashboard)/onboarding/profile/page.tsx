import { redirect } from 'next/navigation'

export const metadata = {
  robots: 'noindex, nofollow',
}

export default async function OnboardingProfileRedirectPage() {
  redirect('/onboarding/seu-perfil')
}
