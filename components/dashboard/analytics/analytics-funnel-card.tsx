import type { ProfessionalAnalyticsOverviewDTO } from '@/modules/analytics/types'

interface AnalyticsFunnelCardProps {
  overview: ProfessionalAnalyticsOverviewDTO
  locale: string
}

export function AnalyticsFunnelCard({ overview, locale }: AnalyticsFunnelCardProps) {
  const isPt = locale === 'pt-BR'
  const { funnel } = overview

  const formatInt = (val: number) => Math.round(val || 0).toLocaleString(locale)
  const formatRate = (val: number) => (val || 0).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  const isAsymmetric = funnel.rates.viewToContactRate > 100

  return (
    <section className="analytics-funnel-section" aria-labelledby="analytics-funnel-title">
      <div className="analytics-section-heading">
        <div>
          <p className="dashboard-eyebrow">{isPt ? 'JORNADA DE INTERESSE' : 'CONVERSION FUNNEL'}</p>
          <h2 id="analytics-funnel-title">
            {isPt ? 'Da exibição à intenção de contato.' : 'From exposure to contact intent.'}
          </h2>
        </div>
        <p>
          {isPt
            ? 'Acompanhe como os visitantes navegam desde a descoberta na busca até a iniciativa de conversa no WhatsApp.'
            : 'Track how visitors progress from discovery in search results to initiating a WhatsApp conversation.'}
        </p>
      </div>

      <div className="analytics-funnel-container">
        {/* Stage 1: Impressões */}
        <div className="analytics-funnel-stage">
          <div className="analytics-funnel-stage-header">
            <span className="analytics-funnel-step">01</span>
            <span className="analytics-funnel-label">{isPt ? 'Exibições na Busca' : 'Search Impressions'}</span>
          </div>
          <strong className="analytics-funnel-number">{formatInt(funnel.impressions.total)}</strong>
          <p className="analytics-funnel-desc">
            {isPt ? 'Cartões vistos por ≥ 500ms nos resultados' : 'Cards viewed for ≥ 500ms in results'}
          </p>
          <div className="analytics-funnel-subtags">
            <span>{formatInt(funnel.impressions.organic)} {isPt ? 'orgânicas' : 'organic'}</span>
            {funnel.impressions.sponsored > 0 && (
              <span> • {formatInt(funnel.impressions.sponsored)} {isPt ? 'destaque' : 'sponsored'}</span>
            )}
          </div>
        </div>

        {/* Transition 1: Impressões -> Visitas */}
        <div className="analytics-funnel-connector">
          <div className="analytics-funnel-arrow" aria-hidden="true">→</div>
          <div className="analytics-funnel-rate-tag">
            <span className="analytics-funnel-rate-val">{formatRate(funnel.rates.impressionToViewRate)}%</span>
            <span className="analytics-funnel-rate-lbl">{isPt ? 'abertura' : 'open rate'}</span>
          </div>
        </div>

        {/* Stage 2: Visitas */}
        <div className="analytics-funnel-stage">
          <div className="analytics-funnel-stage-header">
            <span className="analytics-funnel-step">02</span>
            <span className="analytics-funnel-label">{isPt ? 'Visitas ao Perfil' : 'Profile Visits'}</span>
          </div>
          <strong className="analytics-funnel-number">{formatInt(funnel.views.total)}</strong>
          <p className="analytics-funnel-desc">
            {isPt ? 'Sessões únicas que abriram sua página' : 'Unique sessions opening your profile'}
          </p>
          <div className="analytics-funnel-subtags">
            <span>{formatInt(funnel.views.organic)} {isPt ? 'orgânicas' : 'organic'}</span>
            {funnel.views.sponsored > 0 && (
              <span> • {formatInt(funnel.views.sponsored)} {isPt ? 'destaque' : 'sponsored'}</span>
            )}
          </div>
        </div>

        {/* Transition 2: Visitas -> Contato */}
        <div className="analytics-funnel-connector">
          <div className="analytics-funnel-arrow" aria-hidden="true">→</div>
          <div className="analytics-funnel-rate-tag">
            <span className="analytics-funnel-rate-val">{formatRate(funnel.rates.viewToContactRate)}%</span>
            <span className="analytics-funnel-rate-lbl">{isPt ? 'contato' : 'contact rate'}</span>
          </div>
        </div>

        {/* Stage 3: Contatos */}
        <div className="analytics-funnel-stage">
          <div className="analytics-funnel-stage-header">
            <span className="analytics-funnel-step">03</span>
            <span className="analytics-funnel-label">{isPt ? 'Cliques no WhatsApp' : 'WhatsApp Clicks'}</span>
          </div>
          <strong className="analytics-funnel-number">{formatInt(funnel.contacts.whatsapp)}</strong>
          <p className="analytics-funnel-desc">
            {isPt ? 'Intenções diretas de conversa iniciadas' : 'Direct conversation intentions started'}
          </p>
          <div className="analytics-funnel-subtags">
            <span>{formatInt(funnel.contacts.whatsapp)} {isPt ? 'via WhatsApp' : 'via WhatsApp'}</span>
            {funnel.contacts.phone > 0 && (
              <span> • {formatInt(funnel.contacts.phone)} {isPt ? 'telefone' : 'phone'}</span>
            )}
          </div>
        </div>
      </div>

      {/* Asymmetry & Semantics Explanatory Box */}
      <div className={`analytics-funnel-notice ${isAsymmetric ? 'analytics-funnel-notice--asymmetric' : ''}`}>
        <p>
          <strong>{isPt ? 'Nota sobre o funil:' : 'Funnel note:'}</strong>{' '}
          {isPt
            ? 'As visitas representam sessões únicas diárias, enquanto os cliques no WhatsApp refletem cada clique no botão de contato. Por isso, um visitante que clicar mais de uma vez na mesma visita é registrado em cada clique.'
            : 'Visits represent unique daily sessions, while WhatsApp clicks reflect raw button interactions. A visitor clicking more than once during the same session is counted for each click.'}
          {isAsymmetric && (
            <span className="analytics-asymmetry-alert">
              {' '}{isPt
                ? `A taxa de contato de ${formatRate(funnel.rates.viewToContactRate)}% reflete múltiplos cliques em visitas individuais.`
                : `The contact rate of ${formatRate(funnel.rates.viewToContactRate)}% reflects repeat clicks across individual visits.`}
            </span>
          )}
        </p>
      </div>
    </section>
  )
}
