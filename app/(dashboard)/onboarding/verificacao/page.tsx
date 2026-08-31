import { requireAccount } from '@/modules/auth/dal'
import { getVerificationSafe } from '@/modules/verification/dal'
import { canProceedToProfessionalProfile } from '@/modules/verification/gates'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { VerificationStatusCard } from '@/components/verification/verification-status-card'
import { getTranslations } from '@/lib/i18n/server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Verificação — Onboarding Velvet',
  robots: 'noindex, nofollow',
}

export default async function VerificationOnboardingPage() {
  const { t } = await getTranslations()
  const account = await requireAccount()
  const verification = await getVerificationSafe(account.id)

  return (
    <OnboardingShell currentStep={4}>
      <main className="onboarding-main onboarding-main--verification">
        <section className="onboarding-intro">
          <p className="onboarding-eyebrow">{t('onboarding.verificationEyebrow')}</p>
          <h1>{t('onboarding.verificationTitle').split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h1>
          <p>{t('onboarding.verificationDescription')}</p>
        </section>
        <VerificationStatusCard
          initialVerification={verification}
          initialVerifiedAdult={canProceedToProfessionalProfile(verification)}
        />
      </main>
      <aside className="onboarding-privacy">
        <span>{t('onboarding.kycPrivacy')}</span>
        <p>{t('onboarding.kycPrivacyText')}</p>
      </aside>
    </OnboardingShell>
  )
}
