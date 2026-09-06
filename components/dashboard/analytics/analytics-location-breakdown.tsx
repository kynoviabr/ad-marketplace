import type { TopLocationMetric } from '@/modules/analytics/types'

interface AnalyticsLocationBreakdownProps {
  topLocations: TopLocationMetric[]
  locale: string
}

export function AnalyticsLocationBreakdown({ topLocations, locale }: AnalyticsLocationBreakdownProps) {
  const isPt = locale === 'pt-BR'

  return (
    <section className="analytics-locations-section" aria-labelledby="analytics-locations-title">
      <div className="analytics-section-heading">
        <div>
          <p className="dashboard-eyebrow">{isPt ? 'REGIÕES DE ATENDIMENTO' : 'SERVICE AREAS'}</p>
          <h2 id="analytics-locations-title">
            {isPt ? 'Desempenho por região de atendimento.' : 'Performance by service area.'}
          </h2>
        </div>
        <p>
          {isPt
            ? 'Regiões cadastradas no seu perfil onde seus anúncios apareceram e geraram mais interesse nos resultados de busca.'
            : 'Configured service areas on your profile where your card appeared and generated engagement.'}
        </p>
      </div>

      {topLocations.length === 0 ? (
        <div className="analytics-locations-empty">
          <p>
            {isPt
              ? 'Nenhuma atividade distribuída por região registrada no período selecionado.'
              : 'No region-scoped activity recorded in the selected period.'}
          </p>
        </div>
      ) : (
        <div className="analytics-locations-table-wrapper">
          <table className="analytics-locations-table">
            <caption className="sr-only">
              {isPt ? 'Métricas de desempenho por região de atendimento' : 'Performance metrics by service area'}
            </caption>
            <thead>
              <tr>
                <th scope="col">{isPt ? 'Região' : 'Area'}</th>
                <th scope="col">{isPt ? 'Cidade' : 'City'}</th>
                <th scope="col" className="text-right">{isPt ? 'Impressões' : 'Impressions'}</th>
                <th scope="col" className="text-right">{isPt ? 'Visitas' : 'Visits'}</th>
                <th scope="col" className="text-right">{isPt ? 'WhatsApp' : 'WhatsApp'}</th>
                <th scope="col" className="text-right">{isPt ? 'Conversão' : 'Rate'}</th>
              </tr>
            </thead>
            <tbody>
              {topLocations.map((loc, idx) => (
                <tr key={`${loc.locationName}-${loc.cityName}-${idx}`}>
                  <th scope="row" className="analytics-location-name">
                    <strong>{loc.locationName}</strong>
                  </th>
                  <td className="analytics-location-city">{loc.cityName}</td>
                  <td className="text-right">{(loc.impressions || 0).toLocaleString(locale)}</td>
                  <td className="text-right">{(loc.views || 0).toLocaleString(locale)}</td>
                  <td className="text-right">{(loc.contacts || 0).toLocaleString(locale)}</td>
                  <td className="text-right">
                    <span className="analytics-rate-pill">
                      {(loc.conversionRate || 0).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
