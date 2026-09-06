import type { ProfessionalAnalyticsOverviewDTO, MetricComparison } from '@/modules/analytics/types'

interface AnalyticsKpiGridProps {
  overview: ProfessionalAnalyticsOverviewDTO
  locale: string
}

function ComparisonBadge({
  comparison,
  locale,
}: {
  comparison: MetricComparison
  locale: string
}) {
  const isPt = locale === 'pt-BR'

  if (comparison.isNewBaseline) {
    if (comparison.current === 0) {
      return (
        <span className="analytics-kpi-delta analytics-kpi-delta--neutral" aria-label={isPt ? 'Sem atividade registrada' : 'No activity recorded'}>
          {isPt ? 'Sem dados anteriores' : 'No prior data'}
        </span>
      )
    }
    return (
      <span className="analytics-kpi-delta analytics-kpi-delta--new" aria-label={isPt ? 'Nova atividade neste período' : 'New activity in this period'}>
        {isPt ? 'Nova atividade' : 'New activity'}
      </span>
    )
  }

  if (comparison.percentageChange === null || comparison.percentageChange === 0) {
    return (
      <span className="analytics-kpi-delta analytics-kpi-delta--neutral" aria-label={isPt ? 'Sem alteração em relação ao período anterior' : 'No change from previous period'}>
        {isPt ? 'Sem alteração' : 'No change'}
      </span>
    )
  }

  const isPositive = comparison.percentageChange > 0
  const sign = isPositive ? '+' : '−'
  const absVal = Math.abs(comparison.percentageChange).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  return (
    <span
      className={`analytics-kpi-delta ${isPositive ? 'analytics-kpi-delta--positive' : 'analytics-kpi-delta--negative'}`}
      aria-label={`${isPositive ? (isPt ? 'Aumento de' : 'Increase of') : (isPt ? 'Queda de' : 'Decrease of')} ${absVal}% ${isPt ? 'em relação ao período anterior' : 'from previous period'}`}
    >
      <span aria-hidden="true">{isPositive ? '↑' : '↓'}</span> {sign}{absVal}%
    </span>
  )
}

export function AnalyticsKpiGrid({ overview, locale }: AnalyticsKpiGridProps) {
  const isPt = locale === 'pt-BR'
  const { funnel, comparison, periodDays } = overview

  const formatInt = (val: number) => Math.round(val || 0).toLocaleString(locale)
  const formatRate = (val: number) => (val || 0).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  return (
    <section className="analytics-kpis" aria-labelledby="analytics-kpis-title">
      <div className="analytics-kpis-header">
        <h2 id="analytics-kpis-title" className="sr-only">
          {isPt ? 'Principais Indicadores de Performance' : 'Key Performance Indicators'}
        </h2>
        <p className="analytics-kpis-subtitle">
          {isPt
            ? `Resultados dos últimos ${periodDays} dias e comparação com o período anterior:`
            : `Results for the last ${periodDays} days and comparison with the previous period:`}
        </p>
      </div>

      <dl className="analytics-kpis-grid">
        {/* KPI 1: Impressões */}
        <div className="analytics-kpi-card">
          <dt>{isPt ? 'Impressões' : 'Impressions'}</dt>
          <dd>{formatInt(funnel.impressions.total)}</dd>
          <div className="analytics-kpi-meta">
            <ComparisonBadge comparison={comparison.impressions} locale={locale} />
            <p>{isPt ? 'Exibições qualificadas nos resultados de busca.' : 'Qualified search result card exposures.'}</p>
          </div>
        </div>

        {/* KPI 2: Visitas ao Perfil */}
        <div className="analytics-kpi-card">
          <dt>{isPt ? 'Visitas ao perfil' : 'Profile visits'}</dt>
          <dd>{formatInt(funnel.views.total)}</dd>
          <div className="analytics-kpi-meta">
            <ComparisonBadge comparison={comparison.views} locale={locale} />
            <p>{isPt ? 'Visualizações do perfil: visitas diárias únicas à página completa.' : 'Unique daily sessions that opened your profile.'}</p>
          </div>
        </div>

        {/* KPI 3: Cliques no WhatsApp */}
        <div className="analytics-kpi-card">
          <dt>{isPt ? 'Cliques no WhatsApp' : 'WhatsApp clicks'}</dt>
          <dd>{formatInt(funnel.contacts.whatsapp)}</dd>
          <div className="analytics-kpi-meta">
            <ComparisonBadge comparison={comparison.whatsappClicks} locale={locale} />
            <p>{isPt ? 'Intenções diretas de conversa pelo botão de contato.' : 'Direct contact intentions via the WhatsApp CTA button.'}</p>
          </div>
        </div>

        {/* KPI 4: Taxa de Abertura */}
        <div className="analytics-kpi-card">
          <dt>{isPt ? 'Taxa de abertura' : 'Open rate'}</dt>
          <dd>{formatRate(funnel.rates.impressionToViewRate)}%</dd>
          <div className="analytics-kpi-meta">
            <span className="analytics-kpi-formula">{isPt ? 'Visitas ÷ Impressões' : 'Visits ÷ Impressions'}</span>
            <p>{isPt ? 'Proporção de buscas que resultaram na abertura do perfil.' : 'Share of impressions converting into page visits.'}</p>
          </div>
        </div>

        {/* KPI 5: Taxa de Contato */}
        <div className="analytics-kpi-card">
          <dt>{isPt ? 'Taxa de contato' : 'Contact rate'}</dt>
          <dd>{formatRate(funnel.rates.viewToContactRate)}%</dd>
          <div className="analytics-kpi-meta">
            <span className="analytics-kpi-formula">{isPt ? 'Cliques ÷ Visitas' : 'Clicks ÷ Visits'}</span>
            <p>{isPt ? 'Proporção de visitas que clicaram para conversar.' : 'Share of visits clicking to start a conversation.'}</p>
          </div>
        </div>

        {/* KPI 6: Conversão Geral do Funil */}
        <div className="analytics-kpi-card">
          <dt>{isPt ? 'Conversão do funil' : 'Funnel conversion'}</dt>
          <dd>{formatRate(funnel.rates.overallConversionRate)}%</dd>
          <div className="analytics-kpi-meta">
            <span className="analytics-kpi-formula">{isPt ? 'cliques no WhatsApp ÷ impressões' : 'Clicks ÷ Impressions'}</span>
            <p>{isPt ? 'CTR de contato: proporção de impressões que geraram clique de conversa.' : 'Overall efficiency from exposure to contact intent.'}</p>
          </div>
        </div>
      </dl>
    </section>
  )
}
