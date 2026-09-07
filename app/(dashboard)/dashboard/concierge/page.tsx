import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ProfessionalDashboardHeader } from '@/components/dashboard/professional-dashboard-header'
import {
  ConciergeFaqManager,
  ConciergeInquiriesInbox,
  ConciergeSettingsForm,
  ConciergeTestChat,
} from '@/components/concierge'
import { requireAccount } from '@/modules/auth/dal'
import { getAvailabilitySettings, getWeeklyAvailability } from '@/modules/agenda/dal'
import {
  getConciergeFaqs,
  getConciergeSettings,
  getProfessionalInquiries,
} from '@/modules/concierge/dal'
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

  const [settings, faqs, inquiries, availabilitySettings, weeklyRules] = await Promise.all([
    getConciergeSettings(profile.id),
    getConciergeFaqs(profile.id),
    getProfessionalInquiries(profile.id, { isTest: false }),
    getAvailabilitySettings(profile.id),
    getWeeklyAvailability(profile.id),
  ])

  const hasAgendaConnected = availabilitySettings.enabled && weeklyRules.length > 0

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
              ? 'Configure seu assistente virtual para responder dúvidas públicas, orientar contatos e consultar sua agenda oficial com máxima discrição.'
              : 'Configure your virtual assistant to answer public inquiries, guide visitors, and query your canonical schedule with utmost discretion.'}
          </p>
        </section>

        <section className="velvet-concierge-status-bar" aria-label="Status do Concierge">
          <div className="status-stat-card">
            <span className="status-stat-label">
              {isPt ? 'Status do Assistente' : 'Assistant Status'}
            </span>
            <div className="status-stat-value">
              <span className={`status-indicator ${settings.enabled ? 'active' : 'inactive'}`} />
              <strong>
                {settings.enabled ? (isPt ? 'Ativo' : 'Active') : isPt ? 'Pausado' : 'Paused'}
              </strong>
            </div>
          </div>

          <div className="status-stat-card">
            <span className="status-stat-label">
              {isPt ? 'Integração de Agenda' : 'Agenda Integration'}
            </span>
            <div className="status-stat-value">
              <span className={`status-indicator ${hasAgendaConnected ? 'active' : 'inactive'}`} />
              <strong>
                {hasAgendaConnected
                  ? isPt
                    ? 'Conectada'
                    : 'Connected'
                  : isPt
                    ? 'Não configurada'
                    : 'Not configured'}
              </strong>
            </div>
            <small className="status-stat-hint">
              {hasAgendaConnected
                ? isPt
                  ? `${weeklyRules.length} regras ativas`
                  : `${weeklyRules.length} active rules`
                : isPt
                  ? 'Configure horários na Agenda'
                  : 'Configure hours in Agenda'}
            </small>
          </div>

          <div className="status-stat-card">
            <span className="status-stat-label">
              {isPt ? 'Atendimentos Recebidos' : 'Inquiries Received'}
            </span>
            <div className="status-stat-value">
              <strong>{inquiries.length}</strong>
            </div>
            <small className="status-stat-hint">
              {inquiries.filter((i) => i.status === 'HANDOFF_REQUESTED').length > 0
                ? isPt
                  ? `${inquiries.filter((i) => i.status === 'HANDOFF_REQUESTED').length} aguardando contato`
                  : `${inquiries.filter((i) => i.status === 'HANDOFF_REQUESTED').length} waiting contact`
                : isPt
                  ? 'Nenhum pendente'
                  : 'None pending'}
            </small>
          </div>
        </section>

        {/* Section 25, 26, 27: Professional Inquiries Inbox */}
        <div className="velvet-concierge-inquiries-wrap">
          <ConciergeInquiriesInbox
            profileId={profile.id}
            initialInquiries={inquiries}
            locale={locale}
          />
        </div>

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

