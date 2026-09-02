import { redirect } from 'next/navigation'
import { requireAccount } from '@/modules/auth/dal'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { PublicPresentationForm } from '@/components/onboarding/public-presentation-form'
import { getTranslations } from '@/lib/i18n/server'
import { getProfileOfferingStatuses } from '@/modules/offerings/dal'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Seu perfil — Onboarding Velvet',
  robots: 'noindex, nofollow',
}

export default async function PublicPresentationOnboardingPage() {
  const { t } = await getTranslations()
  const account = await requireAccount()
  const profile = await getProfileByAccountUserId(account.id)

  if (!profile) redirect('/onboarding/voce')
  const offerings = await getProfileOfferingStatuses(profile.id)

  return (
    <OnboardingShell currentStep={2}>
      <main className="onboarding-main onboarding-main--profile">
        <section className="onboarding-intro">
          <p className="onboarding-eyebrow">{t('onboarding.profileEyebrow')}</p>
          <h1>{t('onboarding.profileTitle').split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h1>
          <p>{t('onboarding.profileDescription')}</p>
        </section>
        <PublicPresentationForm initial={{
          headline: profile.headline ?? '',
          bio: profile.bio ?? '',
          publicAge: profile.public_age,
          heightCm: profile.height_cm,
          weightKg: profile.weight_kg,
          eyeColor: profile.eye_color,
          hairColor: profile.hair_color,
          hairLength: profile.hair_length,
          bodyType: profile.body_type,
          showAge: profile.show_age,
          showHeight: profile.show_height,
          showWeight: profile.show_weight,
        }} initialOfferings={offerings} />
      </main>
      <aside className="onboarding-privacy">
        <span>{t('onboarding.optionalPrivacy')}</span>
        <p>{t('onboarding.optionalPrivacyText')}</p>
      </aside>
    </OnboardingShell>
  )
}
