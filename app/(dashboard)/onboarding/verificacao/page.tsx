import { requireAccount } from '@/modules/auth/dal'
import { getVerificationSafe } from '@/modules/verification/dal'
import { canProceedToProfessionalProfile } from '@/modules/verification/gates'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { VerificationStatusCard } from '@/components/verification/verification-status-card'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Verificação — Onboarding Velvet',
  robots: 'noindex, nofollow',
}

export default async function VerificationOnboardingPage() {
  const account = await requireAccount()
  const verification = await getVerificationSafe(account.id)

  return (
    <OnboardingShell currentStep={4}>
      <main className="onboarding-main onboarding-main--verification">
        <section className="onboarding-intro">
          <p className="onboarding-eyebrow">04 — VERIFICAÇÃO</p>
          <h1>Confirme sua<br />identidade.</h1>
          <p>A verificação confirma sua identidade e maioridade antes da publicação do perfil.</p>
        </section>
        <VerificationStatusCard
          initialVerification={verification}
          initialVerifiedAdult={canProceedToProfessionalProfile(verification)}
        />
      </main>
      <aside className="onboarding-privacy">
        <span>SEUS DADOS PERMANECEM PROTEGIDOS</span>
        <p>A Velvet mostra apenas o estado necessário da verificação, nunca documentos ou dados biométricos.</p>
      </aside>
    </OnboardingShell>
  )
}
