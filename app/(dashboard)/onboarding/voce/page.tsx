import { requireAccount } from '@/modules/auth/dal'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { InitialProfileForm } from '@/components/onboarding/initial-profile-form'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Você — Onboarding Velvet',
  robots: 'noindex, nofollow',
}

export default async function InitialProfessionalOnboardingPage() {
  const account = await requireAccount()
  const profile = await getProfileByAccountUserId(account.id)

  return (
    <OnboardingShell currentStep={1}>
      <main className="onboarding-main">
        <section className="onboarding-intro">
          <p className="onboarding-eyebrow">01 — VOCÊ</p>
          <h1>Vamos começar<br />por você.</h1>
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
        <span>IDENTIDADE PÚBLICA ≠ IDENTIDADE LEGAL</span>
        <p>A Velvet mantém sua apresentação profissional separada dos dados usados na verificação.</p>
      </aside>
    </OnboardingShell>
  )
}
