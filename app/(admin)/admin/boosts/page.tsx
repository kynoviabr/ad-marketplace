import { requireAdmin } from '@/modules/moderation/guards'
import { getAllBoostCampaigns } from '@/modules/promotions/dal'
import { AdminBoostsOverview } from '@/components/admin/boosts-overview'

export const dynamic = 'force-dynamic'

export default async function AdminBoostsPage() {
  await requireAdmin()
  const campaigns = await getAllBoostCampaigns()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '0.5rem' }}>
          Gestão de Destaques e Patrocínios
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
          Supervisão e auditoria de campanhas de visibilidade ativas e programadas no marketplace.
        </p>
      </div>

      <AdminBoostsOverview campaigns={campaigns} />
    </div>
  )
}
