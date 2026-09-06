import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ProfessionalDashboardHeader } from '@/components/dashboard/professional-dashboard-header'
import { AvailabilityManager } from '@/components/agenda/availability-manager'
import { requireAccount } from '@/modules/auth/dal'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { getProfessionalAvailabilityDashboardDTO } from '@/modules/agenda/dal'
import { getRequestLocale, getTranslations } from '@/lib/i18n/server'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations()
  return {
    title: `${t('dashboard.myAvailability')} | velvet.`,
    robots: { index: false, follow: false },
  }
}

export default async function AvailabilityDashboardPage() {
  const account = await requireAccount()

  // Authorization: Advertisers only, completed onboarding only
  if (account.role === 'CLIENT') {
    redirect('/cliente')
  }
  if (account.onboarding_status !== 'COMPLETED') {
    redirect('/onboarding')
  }

  const profile = await getProfileByAccountUserId(account.id)
  if (!profile) {
    redirect('/onboarding')
  }

  const locale = await getRequestLocale()
  const isPt = locale === 'pt-BR'
  const data = await getProfessionalAvailabilityDashboardDTO(profile.id)

  return (
    <div className="velvet-dashboard velvet-agenda">
      <ProfessionalDashboardHeader activeHref="/dashboard/availability" />
      <main>
        <section className="velvet-dashboard-intro">
          <p className="dashboard-eyebrow">{isPt ? 'SEU ESTÚDIO' : 'YOUR STUDIO'}</p>
          <h1>{isPt ? 'Minha disponibilidade.' : 'My availability.'}</h1>
          <p>
            {isPt
              ? 'Defina seus horários habituais, pausas e bloqueios pontuais na sua presença Velvet.'
              : 'Set your regular hours, breaks, and date blocks for your Velvet presence.'}
          </p>
        </section>

        <AvailabilityManager initialData={data} locale={locale} />
      </main>
    </div>
  )
}
