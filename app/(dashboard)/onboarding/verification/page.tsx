import { requireAccount } from '@/modules/auth/dal'
import { getVerificationSafe } from '@/modules/verification/dal'
import { VerificationStatusCard } from '@/components/verification/verification-status-card'

export const metadata = {
  title: 'Verificação de Identidade | AD-Marketplace',
}

export default async function VerificationOnboardingPage() {
  const account = await requireAccount()
  const verification = await getVerificationSafe(account.id)

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <VerificationStatusCard initialVerification={verification} />
    </div>
  )
}
