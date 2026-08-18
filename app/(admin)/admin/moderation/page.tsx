import { getPendingMediaQueue } from '@/modules/moderation/dal'
import { ModerationQueueTable } from '@/components/admin/moderation-queue-table'

export const dynamic = 'force-dynamic'

export default async function AdminModerationPage() {
  const pendingItems = await getPendingMediaQueue()

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '0.5rem' }}>
          Moderação de Fotos de Perfil
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
          Fotos enviadas por anunciantes aguardando aprovação para publicação. Total na fila: {pendingItems.length}
        </p>
      </div>

      <ModerationQueueTable initialItems={pendingItems} />
    </div>
  )
}
