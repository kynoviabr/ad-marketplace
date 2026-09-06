import type { DailyTrendPoint, AnalyticsPeriodDays } from '@/modules/analytics/types'

interface AnalyticsDailyTrendProps {
  dailyTrend: DailyTrendPoint[]
  periodDays: AnalyticsPeriodDays
  locale: string
}

const ptMonthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const enMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatShortDate(dateStr: string, locale: string): string {
  const [, m, d] = dateStr.split('-').map(Number)
  const isPt = locale === 'pt-BR'
  const names = isPt ? ptMonthNames : enMonthNames
  return `${d} ${names[(m || 1) - 1]}`
}

export function AnalyticsDailyTrend({ dailyTrend, periodDays, locale }: AnalyticsDailyTrendProps) {
  const isPt = locale === 'pt-BR'

  const totalImpressions = dailyTrend.reduce((acc, p) => acc + (p.impressionsTotal || 0), 0)
  const totalViews = dailyTrend.reduce((acc, p) => acc + (p.viewsTotal || 0), 0)
  const totalContacts = dailyTrend.reduce((acc, p) => acc + (p.contactsTotal || 0), 0)

  const hasActivity = totalImpressions > 0 || totalViews > 0 || totalContacts > 0

  if (!hasActivity || dailyTrend.length < 2) {
    return (
      <section className="analytics-trend-section" aria-labelledby="analytics-trend-title">
        <div className="analytics-section-heading">
          <div>
            <p className="dashboard-eyebrow">{isPt ? 'TENDÊNCIA TEMPORAL' : 'TIME TREND'}</p>
            <h2 id="analytics-trend-title">{isPt ? 'Atividade ao longo do tempo.' : 'Activity over time.'}</h2>
          </div>
          <p>
            {isPt
              ? `Histórico de visibilidade e engajamento dos últimos ${periodDays} dias.`
              : `Visibility and engagement history for the last ${periodDays} days.`}
          </p>
        </div>
        <div className="analytics-trend-empty">
          <p className="analytics-trend-empty-lead">
            {isPt ? 'Ainda não há dados suficientes no período. Os dados ainda são iniciais.' : 'Not enough activity recorded yet in this period.'}
          </p>
          {/* Minimum trend activity threshold (metrics.dailyBreakdown.length >= 2) */}
          <p className="analytics-trend-empty-sub">
            {isPt
              ? 'Seus dados começarão a aparecer aqui conforme seu perfil receber visualizações e interações nos resultados.'
              : 'Your metrics will start appearing here as your profile receives views and interactions in search results.'}
          </p>
        </div>
      </section>
    )
  }

  // Determine scale
  const maxImpressions = Math.max(...dailyTrend.map((d) => d.impressionsTotal || 0), 1)
  const maxViews = Math.max(...dailyTrend.map((d) => d.viewsTotal || 0), 1)
  const chartMax = Math.max(maxImpressions, maxViews, 5)

  // Build points for SVG (0 to 100 viewBox coordinate system)
  // X: 0 to 100
  // Y: 90 (bottom axis) to 15 (top margin)
  const n = dailyTrend.length
  const getY = (val: number) => 90 - (val / chartMax) * 75

  const impPoints = dailyTrend.map((d, i) => {
    const x = n <= 1 ? 50 : (i / (n - 1)) * 100
    const y = getY(d.impressionsTotal || 0)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const viewPoints = dailyTrend.map((d, i) => {
    const x = n <= 1 ? 50 : (i / (n - 1)) * 100
    const y = getY(d.viewsTotal || 0)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const contactPoints = dailyTrend.map((d, i) => {
    const x = n <= 1 ? 50 : (i / (n - 1)) * 100
    const y = getY(d.contactsTotal || 0)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const startDate = dailyTrend[0]?.date ? formatShortDate(dailyTrend[0].date, locale) : ''
  const midDate = dailyTrend[Math.floor(n / 2)]?.date ? formatShortDate(dailyTrend[Math.floor(n / 2)].date, locale) : ''
  const endDate = dailyTrend[n - 1]?.date ? formatShortDate(dailyTrend[n - 1].date, locale) : ''

  const summaryText = isPt
    ? `Gráfico de tendência de ${periodDays} dias. Total de ${totalImpressions} impressões, ${totalViews} visitas ao perfil e ${totalContacts} cliques no WhatsApp.`
    : `Trend chart for ${periodDays} days. Total of ${totalImpressions} impressions, ${totalViews} profile visits, and ${totalContacts} WhatsApp clicks.`

  return (
    <section className="analytics-trend-section" aria-labelledby="analytics-trend-title">
      <div className="analytics-section-heading">
        <div>
          <p className="dashboard-eyebrow">{isPt ? 'TENDÊNCIA TEMPORAL' : 'TIME TREND'}</p>
          <h2 id="analytics-trend-title">{isPt ? 'Atividade ao longo do tempo.' : 'Activity over time.'}</h2>
        </div>
        <p>
          {isPt
            ? `Evolução diária de impressões, visitas e contatos nos últimos ${periodDays} dias.`
            : `Daily evolution of impressions, visits, and contacts over the last ${periodDays} days.`}
        </p>
      </div>

      <div className="analytics-trend-legend">
        <span className="analytics-legend-item analytics-legend-item--impressions">
          <span className="analytics-legend-line" aria-hidden="true"></span>
          {isPt ? 'Impressões' : 'Impressions'} ({totalImpressions.toLocaleString(locale)})
        </span>
        <span className="analytics-legend-item analytics-legend-item--views">
          <span className="analytics-legend-line" aria-hidden="true"></span>
          {isPt ? 'Visitas ao perfil' : 'Visits'} ({totalViews.toLocaleString(locale)})
        </span>
        <span className="analytics-legend-item analytics-legend-item--contacts">
          <span className="analytics-legend-line" aria-hidden="true"></span>
          {isPt ? 'Cliques WhatsApp' : 'WhatsApp'} ({totalContacts.toLocaleString(locale)})
        </span>
      </div>

      <figure className="analytics-chart-figure">
        <svg
          viewBox="0 0 100 100"
          role="img"
          aria-labelledby="trend-title trend-svg-description"
          preserveAspectRatio="none"
          className="analytics-trend-svg"
        >
          <title id="trend-title">{isPt ? 'Gráfico de Desempenho Diário' : 'Daily Performance Chart'}</title>
          <desc id="trend-svg-description">{summaryText}</desc>

          {/* Grid lines */}
          <line x1="0" y1="90" x2="100" y2="90" className="analytics-chart-axis" />
          <line x1="0" y1="52" x2="100" y2="52" className="analytics-chart-grid" />
          <line x1="0" y1="15" x2="100" y2="15" className="analytics-chart-grid" />

          {/* Polyline for Impressions */}
          <polyline points={impPoints} className="analytics-chart-line analytics-chart-line--impressions" vectorEffect="non-scaling-stroke" />

          {/* Polyline for Views */}
          <polyline points={viewPoints} className="analytics-chart-line analytics-chart-line--views" vectorEffect="non-scaling-stroke" />

          {/* Polyline for Contacts */}
          <polyline points={contactPoints} className="analytics-chart-line analytics-chart-line--contacts" vectorEffect="non-scaling-stroke" />
        </svg>

        <figcaption className="analytics-chart-caption">
          <span>{startDate}</span>
          <span>{midDate}</span>
          <span>{endDate}</span>
        </figcaption>
      </figure>

      {/* Accessible data table */}
      <details className="analytics-data-table">
        <summary>{isPt ? 'Ver dados diários em tabela' : 'View daily data as table'}</summary>
        <div>
          <table>
            <caption className="sr-only">
              {isPt ? 'Tabela diária de métricas de performance' : 'Daily performance metrics table'}
            </caption>
            <thead>
              <tr>
                <th scope="col">{isPt ? 'Data' : 'Date'}</th>
                <th scope="col">{isPt ? 'Impressões' : 'Impressions'}</th>
                <th scope="col">{isPt ? 'Visitas' : 'Visits'}</th>
                <th scope="col">{isPt ? 'WhatsApp' : 'WhatsApp'}</th>
              </tr>
            </thead>
            <tbody>
              {dailyTrend.map((row) => (
                <tr key={row.date}>
                  <th scope="row">{formatShortDate(row.date, locale)}</th>
                  <td>{(row.impressionsTotal || 0).toLocaleString(locale)}</td>
                  <td>{(row.viewsTotal || 0).toLocaleString(locale)}</td>
                  <td>{(row.whatsappClicks || 0).toLocaleString(locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
