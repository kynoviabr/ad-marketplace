import { requireAccount } from '@/modules/auth/dal'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { getProfileLocations } from '@/modules/locations/dal'
import { getActiveBoostProducts, getProfileBoostsByProfileId } from '@/modules/promotions/dal'
import { BoostCard } from '@/components/promotions/boost-card'
import { ActiveCampaignsTable } from '@/components/promotions/active-campaigns-table'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdvertiserBoostsPage() {
  const account = await requireAccount()
  const profile = await getProfileByAccountUserId(account.id)

  if (!profile) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', color: '#ffffff' }}>
        <div style={{ padding: '24px', backgroundColor: '#1f2937', borderRadius: '12px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>Perfil Não Configurado</h2>
          <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
            Você precisa criar seu perfil profissional antes de contratar destaques.
          </p>
          <Link
            href="/onboarding/profile"
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: '#ec4899',
              color: '#ffffff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Configurar Perfil
          </Link>
        </div>
      </div>
    )
  }

  const [products, campaigns, profileLocations] = await Promise.all([
    getActiveBoostProducts(),
    getProfileBoostsByProfileId(profile.id),
    getProfileLocations(profile.id),
  ])

  const eligibleLocations = profileLocations
    .filter((pl) => pl.location)
    .map((pl) => ({
      id: pl.location_id,
      name: `${pl.location!.name} (${pl.location!.zone})`,
    }))

  return (
    <div style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 20px', color: '#ffffff' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Destaques e Visibilidade</h1>
          <Link
            href="/dashboard"
            style={{
              padding: '8px 16px',
              backgroundColor: '#374151',
              color: '#ffffff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            ← Voltar ao Painel
          </Link>
        </div>
        <p style={{ color: '#9ca3af', fontSize: '15px' }}>
          Aumente a visibilidade do seu perfil nos resultados de busca por cidade ou bairro.
        </p>
      </div>

      {/* Available Boost Products */}
      <div style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Opções de Destaque</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
          }}
        >
          {products.map((product) => (
            <BoostCard
              key={product.id}
              product={product}
              profileId={profile.id}
              eligibleLocations={eligibleLocations}
            />
          ))}
        </div>
      </div>

      {/* Campaign History */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Histórico de Destaques</h2>
        <ActiveCampaignsTable campaigns={campaigns} />
      </div>
    </div>
  )
}
