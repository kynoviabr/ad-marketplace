import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ProfessionalDashboardHeader } from '@/components/dashboard/professional-dashboard-header'
import { ConciergeFaqManager, ConciergeSettingsForm, ConciergeTestChat } from '@/components/concierge'
import { requireAccount } from '@/modules/auth/dal'
import { getConciergeFaqs, getConciergeSettings } from '@/modules/concierge/dal'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { getRequestLocale, getTranslations } from '@/lib/i18n/server'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations()
  return {
    title: `${t('dashboard.concierge')} | velvet.`,
    robots: { index: false, follow: false },
  }
}

export default async function ConciergeDashboardPage() {
  const account = await requireAccount()

  // Advertisers only, completed onboarding only
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

  const settings = await getConciergeSettings(profile.id)
  const faqs = await getConciergeFaqs(profile.id)

  return (
    <div className="velvet-dashboard velvet-concierge-dashboard">
      <ProfessionalDashboardHeader activeHref="/dashboard/concierge" />

      <main className="velvet-dashboard-main">
        <section className="velvet-dashboard-intro">
          <p className="dashboard-eyebrow">
            {isPt ? 'ATENDIMENTO INTELIGENTE' : 'SMART RECEPTION'}
          </p>
          <h1>{isPt ? 'Concierge IA.' : 'AI Concierge.'}</h1>
          <p>
            {isPt
              ? 'Configure seu assistente virtual para responder dúvidas públicas, orientar contatos e qualificar intenções com máxima discrição.'
              : 'Configure your virtual assistant to answer public inquiries, guide visitors, and qualify contact intent with utmost discretion.'}
          </p>
        </section>

        <div className="velvet-concierge-layout">
          <div className="velvet-concierge-column main-col">
            <ConciergeSettingsForm
              profileId={profile.id}
              initialSettings={settings}
              locale={locale}
            />

            <ConciergeFaqManager
              profileId={profile.id}
              initialFaqs={faqs}
              locale={locale}
            />
          </div>

          <div className="velvet-concierge-column side-col">
            <ConciergeTestChat
              profileId={profile.id}
              assistantDisplayName={settings.assistant_display_name}
              locale={locale}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
