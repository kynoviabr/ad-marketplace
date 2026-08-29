import Link from 'next/link'
import { ProfessionalDashboardHeader } from '@/components/dashboard/professional-dashboard-header'
import { getAdvertiserMetrics } from '@/modules/analytics/dal'
import type { AdvertiserMetricsSummaryDTO } from '@/modules/analytics/types'
import { requireAccount } from '@/modules/auth/dal'
import { isProfileCanonicallyEligible } from '@/modules/publication/dal'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Analytics | Velvet', robots: 'noindex, nofollow' }

interface AdvertiserAnalyticsPageProps { searchParams: Promise<{ days?: string }> }

const ranges = [7, 30, 90] as const
const formatNumber = (value: number) => value.toLocaleString('pt-BR')
const monthNames = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.']
const formatDate = (date: string) => {
  const [, month, day] = date.split('-').map(Number)
  return `${String(day).padStart(2, '0')} de ${monthNames[month - 1] ?? ''}`
}

function PerformanceChart({ metrics }: { metrics: AdvertiserMetricsSummaryDTO }) {
  const useProfileViews = metrics.impressionsTotal === 0 && metrics.profileViews > 0
  const metricLabel = useProfileViews ? 'visualizações' : 'impressões'
  const metricTotal = useProfileViews ? metrics.profileViews : metrics.impressionsTotal
  const values = metrics.dailyBreakdown.map((item) => useProfileViews ? item.profileViews : item.impressionsTotal)
  const max = Math.max(...values, 1)
  const pointList = values.map((value, index) => {
    const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100
    const y = 94 - (value / max) * 82
    return { x, y, value, date: metrics.dailyBreakdown[index].date }
  })
  const summary = `Tendência de ${metricLabel} em ${metrics.days} dias. Total de ${formatNumber(metricTotal)} ${metricLabel}, com máximo diário de ${formatNumber(max)}.`

  return <section className="analytics-trend" aria-labelledby="analytics-trend-title">
    <div className="analytics-section-heading"><div><p className="dashboard-eyebrow">PERFORMANCE</p><h2 id="analytics-trend-title">Seu perfil em movimento.</h2></div><p>{summary}</p></div>
    <figure>
      <svg viewBox="0 0 100 100" role="img" aria-labelledby="trend-svg-title trend-svg-description" preserveAspectRatio="none">
        <title id="trend-svg-title">{useProfileViews ? 'Visualizações diárias' : 'Impressões diárias'}</title><desc id="trend-svg-description">{summary}</desc>
        <line x1="0" y1="94" x2="100" y2="94" className="analytics-chart-axis" />
        <line x1="0" y1="53" x2="100" y2="53" className="analytics-chart-grid" />
        <line x1="0" y1="12" x2="100" y2="12" className="analytics-chart-grid" />
        <polyline points={pointList.map(({ x, y }) => `${x},${y}`).join(' ')} className="analytics-chart-line" vectorEffect="non-scaling-stroke" />
        {pointList.map(({ x, y, value, date }) => <circle key={`${date}-${value}`} cx={x} cy={y} r="1.15" className="analytics-chart-point" />)}
      </svg>
      <figcaption><span>{metrics.dailyBreakdown[0] ? formatDate(metrics.dailyBreakdown[0].date) : ''}</span><span>{metrics.dailyBreakdown.at(-1) ? formatDate(metrics.dailyBreakdown.at(-1)!.date) : ''}</span></figcaption>
    </figure>
    <details className="analytics-data-table"><summary>Ver dados diários em tabela</summary><div><table><caption className="sr-only">Dados diários de performance</caption><thead><tr><th>Data</th><th>Impressões</th><th>Visualizações</th><th>WhatsApp</th></tr></thead><tbody>{metrics.dailyBreakdown.map((row) => <tr key={row.date}><th>{formatDate(row.date)}</th><td>{formatNumber(row.impressionsTotal)}</td><td>{formatNumber(row.profileViews)}</td><td>{formatNumber(row.whatsappClicks)}</td></tr>)}</tbody></table></div></details>
  </section>
}

export default async function AdvertiserAnalyticsPage({ searchParams }: AdvertiserAnalyticsPageProps) {
  const [account, resolvedParams] = await Promise.all([requireAccount(), searchParams])
  const profile = await getProfileByAccountUserId(account.id)
  const days: 7 | 30 | 90 = resolvedParams.days === '7' ? 7 : resolvedParams.days === '90' ? 90 : 30

  if (!profile) return <div className="velvet-dashboard velvet-analytics"><ProfessionalDashboardHeader activeHref="/dashboard/analytics" /><main><section className="analytics-empty"><p className="dashboard-eyebrow">ANALYTICS</p><h1>Seu perfil vem primeiro.</h1><p>Conclua sua apresentação para começar a acompanhar sua presença na Velvet.</p><Link href="/onboarding/voce">Configurar perfil <span aria-hidden="true">→</span></Link></section></main></div>

  const [metrics, canonicallyEligible] = await Promise.all([
    getAdvertiserMetrics(profile.id, days),
    isProfileCanonicallyEligible(account.id, profile.id).catch(() => false),
  ])
  const hasData = metrics.impressionsTotal > 0 || metrics.profileViews > 0 || metrics.whatsappClicks > 0
  const hasLowData = hasData && metrics.impressionsTotal < 10
  const isPublic = profile.status === 'ACTIVE' && canonicallyEligible

  return <div className="velvet-dashboard velvet-analytics">
    <ProfessionalDashboardHeader activeHref="/dashboard/analytics" />
    <main>
      <section className="analytics-intro"><div><p className="dashboard-eyebrow">ANALYTICS</p><h1>Veja como seu perfil está performando.</h1></div><div><p>Entenda sua visibilidade e os contatos gerados pelo perfil de {profile.stage_name}.</p>{isPublic ? <Link href={`/perfil/${profile.slug}`}>Ver meu perfil <span aria-hidden="true">↗</span></Link> : <p className="analytics-publication-note">As métricas continuam disponíveis enquanto seu perfil não está público.</p>}</div></section>

      <nav className="analytics-period" aria-label="Período das métricas"><span>PERÍODO</span><div>{ranges.map((range) => <Link key={range} href={`/dashboard/analytics?days=${range}`} aria-current={days === range ? 'page' : undefined}>{range} dias</Link>)}</div></nav>

      {!hasData ? <section className="analytics-empty analytics-empty--data"><p className="dashboard-eyebrow">SEU DIÁRIO DE PERFORMANCE</p><h2>Seus primeiros dados aparecerão aqui.</h2><p>Quando seu perfil começar a receber visitas, você poderá acompanhar sua visibilidade e contatos.</p></section> : <>
        <section className="analytics-kpis" aria-labelledby="analytics-kpis-title"><h2 id="analytics-kpis-title" className="sr-only">Principais métricas</h2>
          <dl>
            <div><dt>Impressões</dt><dd>{formatNumber(metrics.impressionsTotal)}</dd><p>vezes em que seu perfil ficou visível nos resultados</p></div>
            <div><dt>Visualizações do perfil</dt><dd>{formatNumber(metrics.profileViews)}</dd><p>aberturas da sua página pública</p></div>
            <div><dt>Cliques no WhatsApp</dt><dd>{formatNumber(metrics.whatsappClicks)}</dd><p>intenções diretas de conversa</p></div>
            <div><dt>CTR de contato</dt><dd>{metrics.ctr.toLocaleString('pt-BR')}%</dd><p>cliques no WhatsApp ÷ impressões</p></div>
          </dl>
        </section>
        {hasLowData ? <p className="analytics-low-data">Os dados ainda são iniciais. Continue acompanhando sem tirar conclusões sobre tendência por enquanto.</p> : null}
        {metrics.dailyBreakdown.length >= 2 ? <PerformanceChart metrics={metrics} /> : null}
        <section className="analytics-conversion" aria-labelledby="analytics-conversion-title"><div><p className="dashboard-eyebrow">JORNADA DE INTERESSE</p><h2 id="analytics-conversion-title">Da descoberta à conversa.</h2></div><ol><li><span>01</span><strong>{formatNumber(metrics.impressionsTotal)}</strong><p>exibições nos resultados</p></li><li><span>02</span><strong>{formatNumber(metrics.profileViews)}</strong><p>aberturas do perfil</p></li><li><span>03</span><strong>{formatNumber(metrics.whatsappClicks)}</strong><p>cliques para conversar</p></li></ol></section>
      </>}

      <aside className="analytics-context"><p className="dashboard-eyebrow">COMO LER</p><p>Uma impressão é registrada quando o cartão permanece visível por pelo menos meio segundo. Uma visualização acontece ao abrir o perfil público. O clique no WhatsApp indica intenção de contato. O CTR compara cliques no WhatsApp com impressões.</p><p>Os dados são agregados diariamente e apresentados sem identificar visitantes.</p></aside>
    </main>
  </div>
}
