import { redirect } from 'next/navigation'
import { requireAccount } from '@/modules/auth/dal'
import { getVerificationSafe } from '@/modules/verification/dal'
import { canProceedToProfessionalProfile } from '@/modules/verification/gates'

export const dynamic = 'force-dynamic'

export default async function OnboardingEntryPage() {
  const account = await requireAccount()

  if (account.onboarding_status === 'COMPLETED') {
    redirect('/dashboard')
  }

  if (account.onboarding_step >= 4) {
    const verification = await getVerificationSafe(account.id)
    if (!canProceedToProfessionalProfile(verification)) redirect('/onboarding/verificacao')
    redirect(account.onboarding_step >= 6 ? '/onboarding/revisar' : '/onboarding/fotos')
  }

  if (account.onboarding_step >= 3) {
    redirect('/onboarding/onde-atende')
  }

  if (account.onboarding_step >= 2) {
    redirect('/onboarding/seu-perfil')
  }

  redirect('/onboarding/voce')
}
