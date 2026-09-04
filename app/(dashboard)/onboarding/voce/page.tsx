import { requireAccount } from '@/modules/auth/dal'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { InitialProfileForm } from '@/components/onboarding/initial-profile-form'
import { getTranslations } from '@/lib/i18n/server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Você — Onboarding velvet.',
  robots: 'noindex, nofollow',
}

export default async function InitialProfessionalOnboardingPage() {
  const { t } = await getTranslations()
  const account = await requireAccount()
  const profile = await getProfileByAccountUserId(account.id)

  return (
    <OnboardingShell currentStep={1}>
      <main className="onboarding-main">
        <section className="onboarding-intro">
          <p className="onboarding-eyebrow">{t('onboarding.youEyebrow')}</p>
          <h1>{t('onboarding.youTitle').split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h1>
          <p>
            Conte como quer ser apresentada. Seus dados legais permanecem separados e serão
            tratados somente na etapa de verificação.
          </p>
        </section>
        <InitialProfileForm
          initialStageName={profile?.stage_name ?? ''}
          initialWhatsappPhone={profile?.whatsapp_phone ?? ''}
        />
      </main>
      <aside className="onboarding-privacy">
        <span>{t('onboarding.publicIdentityPrivacy')}</span>
        <p>{t('onboarding.publicIdentityPrivacyText')}</p>
      </aside>
    </OnboardingShell>
  )
}
