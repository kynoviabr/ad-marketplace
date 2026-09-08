import { redirect } from 'next/navigation'

export const metadata = {
  robots: 'noindex, nofollow',
}

export default async function OnboardingMediaRedirectPage() {
  redirect('/onboarding/fotos')
}
