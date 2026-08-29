import { redirect } from 'next/navigation'
import { requireAccount } from '@/modules/auth/dal'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { PublicPresentationForm } from '@/components/onboarding/public-presentation-form'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Seu perfil — Onboarding Velvet',
  robots: 'noindex, nofollow',
}

export default async function PublicPresentationOnboardingPage() {
  const account = await requireAccount()
  const profile = await getProfileByAccountUserId(account.id)

  if (!profile) redirect('/onboarding/voce')

  return (
    <OnboardingShell currentStep={2}>
      <main className="onboarding-main onboarding-main--profile">
        <section className="onboarding-intro">
          <p className="onboarding-eyebrow">02 — SEU PERFIL</p>
          <h1>Sua presença,<br />do seu jeito.</h1>
          <p>Apresente sua personalidade e escolha quais características deseja mostrar no perfil público.</p>
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
        }} />
      </main>
      <aside className="onboarding-privacy">
        <span>VOCÊ CONTROLA O QUE APARECE</span>
        <p>Características opcionais permanecem ocultas quando você não escolhe exibi-las.</p>
      </aside>
    </OnboardingShell>
  )
}
