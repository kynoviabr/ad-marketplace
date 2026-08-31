import { redirect } from 'next/navigation'
import { requireAccount } from '@/modules/auth/dal'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { LocationSelectionForm } from '@/components/onboarding/location-selection-form'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { getLocationsByCitySlug, getProfileLocations } from '@/modules/locations/dal'
import { MAX_SERVICE_AREAS } from '@/modules/locations/schemas'
import { getTranslations } from '@/lib/i18n/server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Onde atende — Onboarding Velvet',
  robots: 'noindex, nofollow',
}

export default async function NextOnboardingStepBoundary() {
  const { t } = await getTranslations()
  const account = await requireAccount()
  const profile = await getProfileByAccountUserId(account.id)
  if (!profile) redirect('/onboarding/voce')

  const [locations, initialSelections] = await Promise.all([
    getLocationsByCitySlug('sao-paulo'),
    getProfileLocations(profile.id),
  ])

  return (
    <OnboardingShell currentStep={3}>
      <main className="onboarding-main onboarding-main--locations">
        <section className="onboarding-intro">
          <p className="onboarding-eyebrow">{t('onboarding.locationsEyebrow')}</p>
          <h1>{t('onboarding.locationsTitle').split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h1>
          <p>{t('onboarding.locationsDescription')}</p>
          <p className="location-intro-limit">{t('onboarding.locationsLimit', { count: MAX_SERVICE_AREAS })}</p>
        </section>
        <LocationSelectionForm locations={locations} initialSelections={initialSelections} />
      </main>
      <aside className="onboarding-privacy">
        <span>{t('onboarding.regionsPrivacy')}</span>
        <p>{t('onboarding.regionsPrivacyText')}</p>
      </aside>
    </OnboardingShell>
  )
}
