interface AnalyticsAudienceBadgeProps {
  audienceMode: 'PUBLIC' | 'VIP_ONLY'
  locale: string
}

export function AnalyticsAudienceBadge({ audienceMode, locale }: AnalyticsAudienceBadgeProps) {
  const isPt = locale === 'pt-BR'
  const isVip = audienceMode === 'VIP_ONLY'

  const modeLabel = isVip
    ? (isPt ? 'Somente VIP' : 'VIP Only')
    : (isPt ? 'Público' : 'Public')

  return (
    <div className="analytics-audience-context">
      <div className="analytics-audience-badge-wrapper">
        <span className="dashboard-eyebrow">{isPt ? 'VISIBILIDADE ATUAL' : 'CURRENT VISIBILITY'}</span>
        <span className={`analytics-audience-pill ${isVip ? 'analytics-audience-pill--vip' : 'analytics-audience-pill--public'}`}>
          {modeLabel}
        </span>
      </div>
      <p className="analytics-audience-note">
        {isPt
          ? 'Configuração atual do seu perfil. O histórico analítico acima contabiliza os acessos gerais recebidos durante o período.'
          : 'Your current profile visibility configuration. The historical metrics above reflect total traffic received during the period.'}
      </p>
    </div>
  )
}
