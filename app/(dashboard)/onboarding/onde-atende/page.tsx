import { redirect } from 'next/navigation'
import { requireAccount } from '@/modules/auth/dal'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { LocationSelectionForm } from '@/components/onboarding/location-selection-form'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { getLocationsByCitySlug, getProfileLocations } from '@/modules/locations/dal'
import { MAX_SERVICE_AREAS } from '@/modules/locations/schemas'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Onde atende — Onboarding Velvet',
  robots: 'noindex, nofollow',
}

export default async function NextOnboardingStepBoundary() {
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
          <p className="onboarding-eyebrow">03 — ONDE ATENDE</p>
          <h1>Escolha onde<br />você atende.</h1>
          <p>Selecione as regiões onde deseja aparecer nas buscas da Velvet. Você poderá alterá-las depois.</p>
          <p className="location-intro-limit">Até {MAX_SERVICE_AREAS} regiões em São Paulo.</p>
        </section>
        <LocationSelectionForm locations={locations} initialSelections={initialSelections} />
      </main>
      <aside className="onboarding-privacy">
        <span>APENAS REGIÕES PÚBLICAS</span>
        <p>A Velvet não solicita endereço, número, coordenadas ou localização residencial nesta etapa.</p>
      </aside>
    </OnboardingShell>
  )
}
