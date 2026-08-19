import { requireAdmin } from '@/modules/moderation/guards'
import { getAdminPlatformMetrics } from '@/modules/analytics/dal'
import { AdminNavbar } from '@/components/admin/admin-navbar'
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
    <div style={{ minHeight: '100vh', backgroundColor: '#111827', color: '#ffffff' }}>
      <AdminNavbar />
      <div style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>
            Analytics & Métricas da Plataforma (Superfície A)
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>
            Monitoramento operacional de buscas, impressões, cliques e conversões no marketplace.
          </p>
        </div>

        <AdminAnalyticsDashboardView initialMetrics={metrics} />
      </div>
    </div>
  )
}
