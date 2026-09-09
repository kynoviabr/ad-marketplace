import { requireAdmin } from '@/modules/moderation/guards'
import { getAdminPlatformMetrics } from '@/modules/analytics/dal'
import { AdminAnalyticsDashboardView } from '@/components/admin/analytics-dashboard-view'

export const dynamic = 'force-dynamic'

interface AdminAnalyticsPageProps {
  searchParams: Promise<{ days?: string }>
}

export default async function AdminAnalyticsPage({ searchParams }: AdminAnalyticsPageProps) {
  await requireAdmin()

  const resolvedParams = await searchParams
  const days = resolvedParams.days ? Number(resolvedParams.days) : 30

  const metrics = await getAdminPlatformMetrics(days)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '0.5rem' }}>
          Analytics & Métricas da Plataforma (Superfície A)
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
          Monitoramento operacional de buscas, impressões, cliques e conversões no marketplace.
        </p>
      </div>

      <AdminAnalyticsDashboardView initialMetrics={metrics} />
    </div>
  )
}
