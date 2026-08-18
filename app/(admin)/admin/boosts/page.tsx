import { requireAdmin } from '@/modules/moderation/guards'
import { getAllBoostCampaigns } from '@/modules/promotions/dal'
import { AdminBoostsOverview } from '@/components/admin/boosts-overview'
import { AdminNavbar } from '@/components/admin/admin-navbar'

export const dynamic = 'force-dynamic'

export default async function AdminBoostsPage() {
  await requireAdmin()
  const campaigns = await getAllBoostCampaigns()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#111827', color: '#ffffff' }}>
      <AdminNavbar />
      <div style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>
            Gestão de Destaques e Patrocínios
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>
            Supervisão e auditoria de campanhas de visibilidade ativas e programadas no marketplace.
          </p>
        </div>

        <AdminBoostsOverview campaigns={campaigns} />
      </div>
    </div>
  )
}
