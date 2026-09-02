import { getCustomerReviewModerationQueue, getPendingMediaQueue } from '@/modules/moderation/dal'
import { ModerationQueueTable } from '@/components/admin/moderation-queue-table'
import { ReviewModerationQueue } from '@/components/admin/review-moderation-queue'

export const dynamic = 'force-dynamic'

export default async function AdminModerationPage({ searchParams }: { searchParams: Promise<{ profile?: string }> }) {
  const { profile } = await searchParams
  const [pendingItems, reviewItems] = await Promise.all([getPendingMediaQueue(profile), getCustomerReviewModerationQueue()])

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
      <section style={{ marginTop: '3rem' }} aria-labelledby="review-moderation-title">
        <h2 id="review-moderation-title">Avaliações e respostas</h2>
        <p style={{ color: '#9ca3af' }}>Pendentes, denunciadas e contexto da resposta profissional. Decisões geram trilha de auditoria.</p>
        <ReviewModerationQueue initialItems={reviewItems} />
      </section>
    </div>
  )
}
