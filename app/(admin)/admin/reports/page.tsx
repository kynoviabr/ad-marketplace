import { getOpenReportsQueue } from '@/modules/reports/dal'
import { ReportsQueueTable } from '@/components/admin/reports-queue-table'

export const dynamic = 'force-dynamic'

export default async function AdminReportsPage() {
  const openReports = await getOpenReportsQueue()

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '0.5rem' }}>
          Gestão de Denúncias Públicas
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
          Denúncias anônimas enviadas por usuários da plataforma aguardando resolução. Total abertas: {openReports.length}
        </p>
      </div>

      <ReportsQueueTable initialReports={openReports} />
    </div>
  )
}
