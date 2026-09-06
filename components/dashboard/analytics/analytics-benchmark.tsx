import type { ProfessionalBenchmarkDTO, ComparisonBand } from '@/modules/analytics/types'

interface AnalyticsBenchmarkProps {
  benchmark: ProfessionalBenchmarkDTO
  locale: string
}

function renderBandBadge(band: ComparisonBand, isPt: boolean) {
  switch (band) {
    case 'ABOVE_COHORT':
      return (
        <span
          className="analytics-benchmark-badge analytics-benchmark-badge--above"
          aria-label={isPt ? 'Desempenho acima da mediana do grupo' : 'Performance above cohort median'}
        >
          <span aria-hidden="true">↑</span> {isPt ? 'Acima da mediana' : 'Above median'}
        </span>
      )
    case 'BELOW_COHORT':
      return (
        <span
          className="analytics-benchmark-badge analytics-benchmark-badge--below"
          aria-label={isPt ? 'Desempenho abaixo da mediana do grupo' : 'Performance below cohort median'}
        >
          <span aria-hidden="true">↓</span> {isPt ? 'Abaixo da mediana' : 'Below median'}
        </span>
      )
    case 'NEAR_COHORT':
      return (
        <span
          className="analytics-benchmark-badge analytics-benchmark-badge--near"
          aria-label={isPt ? 'Desempenho alinhado à mediana do grupo' : 'Performance aligned with cohort median'}
        >
          <span aria-hidden="true">≈</span> {isPt ? 'Próximo à mediana' : 'Near median'}
        </span>
      )
    default:
      return (
        <span className="analytics-benchmark-badge analytics-benchmark-badge--neutral">
          {isPt ? 'Aguardando dados' : 'Awaiting data'}
        </span>
      )
  }
}

export function AnalyticsBenchmark({ benchmark, locale }: AnalyticsBenchmarkProps) {
  const isPt = locale === 'pt-BR'
  const { status, openRate, contactRate, visibility, eligibleCohortSize, periodDays } = benchmark

  return (
    <section className="analytics-benchmark-section" aria-labelledby="analytics-benchmark-title">
      <div className="analytics-section-heading">
        <div>
          <p className="dashboard-eyebrow">
            {isPt ? 'REFERÊNCIA COLETIVA E PRIVACIDADE' : 'COLLECTIVE BENCHMARK & PRIVACY'}
          </p>
          <h2 id="analytics-benchmark-title">
            {isPt ? 'Como seu perfil se compara.' : 'How your profile compares.'}
          </h2>
        </div>
        <p>
          {isPt
            ? `Comparação agregada com a mediana de perfis profissionais ativos em São Paulo nos últimos ${periodDays} dias.`
            : `Aggregate comparison against the median of active professional profiles in São Paulo for the last ${periodDays} days.`}
        </p>
      </div>

      <div className="analytics-benchmark-privacy-note">
        <span className="analytics-benchmark-privacy-icon" aria-hidden="true">🔒</span>
        <p>
          {isPt
            ? 'Preservação rigorosa de privacidade: nenhum dado individual, identidade ou faturamento de concorrentes é rastreado ou exibido.'
            : 'Strict privacy preservation: zero competitor identities, individual metrics, or rankings are tracked or displayed.'}
        </p>
      </div>

      {status === 'INSUFFICIENT_COHORT' && (
        <div className="analytics-benchmark-empty-card">
          <h3>{isPt ? 'Amostra coletiva em formação' : 'Cohort sample forming'}</h3>
          <p>
            {isPt
              ? 'Para proteger a privacidade dos profissionais e garantir precisão estatística, referências comparativas exigem um grupo mínimo de 5 perfis ativos com volume representativo de buscas.'
              : 'To protect professional privacy and ensure statistical accuracy, comparative benchmarks require a minimum cohort of 5 active profiles with representative search volume.'}
          </p>
          <span className="analytics-benchmark-cohort-info">
            {isPt
              ? `Base atual: ${eligibleCohortSize} perfil(is) ativo(s) na cidade.`
              : `Current base: ${eligibleCohortSize} active profile(s) in the city.`}
          </span>
        </div>
      )}

      {status === 'INSUFFICIENT_DATA' && (
        <div className="analytics-benchmark-empty-card">
          <h3>{isPt ? 'Aguardando primeiras impressões' : 'Awaiting initial impressions'}</h3>
          <p>
            {isPt
              ? `Seu perfil ainda não registrou impressões suficientes nos últimos ${periodDays} dias para compor a comparação de desempenho.`
              : `Your profile has not yet recorded sufficient impressions in the last ${periodDays} days to generate a performance comparison.`}
          </p>
        </div>
      )}

      {status === 'AVAILABLE' && (
        <div className="analytics-benchmark-grid">
          {/* Metric 1: Open Rate */}
          <div className="analytics-benchmark-card">
            <div className="analytics-benchmark-card-header">
              <h3>{isPt ? 'Taxa de abertura' : 'Open rate'}</h3>
              {renderBandBadge(openRate.comparisonBand, isPt)}
            </div>
            <div className="analytics-benchmark-values">
              <div className="analytics-benchmark-val-group">
                <span className="analytics-benchmark-label">{isPt ? 'Seu perfil' : 'Your profile'}</span>
                <span className="analytics-benchmark-main-val">
                  {openRate.professionalValue.toFixed(1)}%
                </span>
              </div>
              <div className="analytics-benchmark-val-group">
                <span className="analytics-benchmark-label">{isPt ? 'Mediana da cidade' : 'City median'}</span>
                <span className="analytics-benchmark-median-val">
                  {openRate.cohortMedian !== null ? `${openRate.cohortMedian.toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>
            <p className="analytics-benchmark-desc">
              {isPt
                ? 'Proporção de impressões na busca que viram visitas.'
                : 'Share of search impressions that converted to visits.'}
            </p>
          </div>

          {/* Metric 2: Contact Rate */}
          <div className="analytics-benchmark-card">
            <div className="analytics-benchmark-card-header">
              <h3>{isPt ? 'Taxa de contato' : 'Contact rate'}</h3>
              {renderBandBadge(contactRate.comparisonBand, isPt)}
            </div>
            <div className="analytics-benchmark-values">
              <div className="analytics-benchmark-val-group">
                <span className="analytics-benchmark-label">{isPt ? 'Seu perfil' : 'Your profile'}</span>
                <span className="analytics-benchmark-main-val">
                  {contactRate.professionalValue.toFixed(1)}%
                </span>
              </div>
              <div className="analytics-benchmark-val-group">
                <span className="analytics-benchmark-label">{isPt ? 'Mediana da cidade' : 'City median'}</span>
                <span className="analytics-benchmark-median-val">
                  {contactRate.cohortMedian !== null ? `${contactRate.cohortMedian.toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>
            <p className="analytics-benchmark-desc">
              {isPt
                ? 'Proporção de visitas que clicaram no botão de contato.'
                : 'Share of visits that clicked the contact button.'}
            </p>
          </div>

          {/* Metric 3: Visibility */}
          <div className="analytics-benchmark-card">
            <div className="analytics-benchmark-card-header">
              <h3>{isPt ? 'Visibilidade na busca' : 'Search visibility'}</h3>
              {renderBandBadge(visibility.comparisonBand, isPt)}
            </div>
            <div className="analytics-benchmark-values">
              <div className="analytics-benchmark-val-group">
                <span className="analytics-benchmark-label">{isPt ? 'Seu perfil' : 'Your profile'}</span>
                <span className="analytics-benchmark-main-val">
                  {visibility.professionalValue.toLocaleString(locale)}
                </span>
              </div>
              <div className="analytics-benchmark-val-group">
                <span className="analytics-benchmark-label">{isPt ? 'Mediana da cidade' : 'City median'}</span>
                <span className="analytics-benchmark-median-val">
                  {visibility.cohortMedian !== null ? visibility.cohortMedian.toLocaleString(locale) : '—'}
                </span>
              </div>
            </div>
            <p className="analytics-benchmark-desc">
              {isPt
                ? 'Total de aparições qualificadas na busca da cidade.'
                : 'Total qualified search card appearances in your city.'}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
