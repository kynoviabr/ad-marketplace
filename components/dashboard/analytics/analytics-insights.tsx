import Link from 'next/link'
import type { ProfessionalAnalyticsInsight, InsightActionType } from '@/modules/analytics/types'
import { analyticsPtBR, analyticsEn } from '@/lib/i18n/messages/analytics'

interface AnalyticsInsightsProps {
  insights: ProfessionalAnalyticsInsight[]
  locale: string
}

function resolveMessage(
  key: string,
  params: Record<string, string | number> | undefined,
  isPt: boolean
): string {
  const catalog = isPt ? analyticsPtBR : analyticsEn
  let template = (catalog as Record<string, string>)[key] || key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      template = template.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return template
}

function getActionLabel(actionType: InsightActionType, isPt: boolean): string {
  switch (actionType) {
    case 'REVIEW_PROFILE_PRESENTATION':
      return isPt ? 'Revisar fotos do perfil' : 'Review profile photos'
    case 'REVIEW_CONTACT_INFO':
      return isPt ? 'Revisar dados de contato' : 'Review contact info'
    case 'MAINTAIN_SERVICE_AREA':
      return isPt ? 'Gerenciar regiões' : 'Manage service areas'
    case 'BE_RESPONSIVE':
      return isPt ? 'Acompanhar horários' : 'Keep timely response'
    case 'EXPLORE_PROMOTIONS':
      return isPt ? 'Ver opções de destaque' : 'Explore boost options'
    default:
      return isPt ? 'Ver detalhes' : 'View details'
  }
}

export function AnalyticsInsights({ insights, locale }: AnalyticsInsightsProps) {
  const isPt = locale === 'pt-BR'

  if (!insights || insights.length === 0) {
    return null
  }

  return (
    <section className="analytics-insights-section" aria-labelledby="analytics-insights-title">
      <div className="analytics-section-heading">
        <div>
          <p className="dashboard-eyebrow">
            {isPt ? 'DIAGNÓSTICO E DECISÃO' : 'DIAGNOSTICS & DECISION'}
          </p>
          <h2 id="analytics-insights-title">
            {isPt ? 'Insights do seu perfil.' : 'Profile insights.'}
          </h2>
        </div>
        <p>
          {isPt
            ? 'Observações determinísticas e recomendações práticas baseadas no seu desempenho recente.'
            : 'Deterministic observations and actionable recommendations based on your recent activity.'}
        </p>
      </div>

      <div className="analytics-insights-grid">
        {insights.map((insight) => {
          const title = resolveMessage(insight.titleKey, insight.params, isPt)
          const body = resolveMessage(insight.bodyKey, insight.params, isPt)
          const directionClass =
            insight.direction === 'POSITIVE'
              ? 'analytics-insight-card--positive'
              : insight.direction === 'NEGATIVE'
              ? 'analytics-insight-card--negative'
              : 'analytics-insight-card--neutral'

          const badgeLabel =
            insight.direction === 'POSITIVE'
              ? isPt ? '↑ Crescimento' : '↑ Positive'
              : insight.direction === 'NEGATIVE'
              ? isPt ? '↓ Atenção' : '↓ Attention'
              : isPt ? '● Diagnóstico' : '● Diagnostic'

          return (
            <article key={insight.id} className={`analytics-insight-card ${directionClass}`}>
              <div className="analytics-insight-header">
                <span className="analytics-insight-badge">
                  {badgeLabel}
                </span>
                <span className="analytics-insight-category">
                  {insight.category.replace('_', ' ')}
                </span>
              </div>

              <h3 className="analytics-insight-title">{title}</h3>
              <p className="analytics-insight-body">{body}</p>

              {insight.actionType !== 'NONE' && insight.actionHref && (
                <div className="analytics-insight-action">
                  <Link href={insight.actionHref} className="analytics-insight-link">
                    {getActionLabel(insight.actionType, isPt)}{' '}
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
