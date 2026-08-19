import { requireAccount } from '@/modules/auth/dal'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { getAdvertiserMetrics } from '@/modules/analytics/dal'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface AdvertiserAnalyticsPageProps {
  searchParams: Promise<{ days?: string }>
}

export default async function AdvertiserAnalyticsPage({ searchParams }: AdvertiserAnalyticsPageProps) {
  const account = await requireAccount()
  const profile = await getProfileByAccountUserId(account.id)

  if (!profile) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', color: '#ffffff' }}>
        <div style={{ padding: '24px', backgroundColor: '#1f2937', borderRadius: '12px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>Perfil Não Configurado</h2>
          <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
            Você precisa criar seu perfil profissional antes de visualizar métricas.
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

  const resolvedParams = await searchParams
  const daysParam = resolvedParams.days
  const days: 7 | 30 | 90 = daysParam === '7' ? 7 : daysParam === '90' ? 90 : 30

  const metrics = await getAdvertiserMetrics(profile.id, days)

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px', color: '#ffffff' }}>
      {/* Header & Breadcrumb */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Métricas de Desempenho</h1>
            <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '4px' }}>
              Visualizações e intenções de contato geradas para o perfil <strong style={{ color: '#ffffff' }}>{profile.stage_name}</strong>.
            </p>
          </div>
          <Link
            href="/dashboard"
            style={{
              fontSize: '14px',
              color: '#9ca3af',
              textDecoration: 'none',
              padding: '6px 12px',
              backgroundColor: '#1f2937',
              borderRadius: '6px',
            }}
          >
            ← Voltar ao Início
          </Link>
        </div>

        {/* Period Selector */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          {([7, 30, 90] as const).map((d) => {
            const isSelected = days === d
            return (
              <Link
                key={d}
                href={`/dashboard/analytics?days=${d}`}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: isSelected ? 600 : 400,
                  backgroundColor: isSelected ? '#ec4899' : '#1f2937',
                  color: '#ffffff',
                  textDecoration: 'none',
                }}
              >
                Últimos {d} dias
              </Link>
            )
          })}
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {/* Card 1: Impressions */}
        <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '24px', border: '1px solid #374151' }}>
          <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
            Total de Impressões no Feed
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', marginBottom: '12px' }}>
            {metrics.impressionsTotal.toLocaleString('pt-BR')}
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#9ca3af' }}>
            <span>Orgânicas: <strong style={{ color: '#ffffff' }}>{metrics.impressionsOrganic}</strong></span>
            <span>•</span>
            <span>Patrocinadas: <strong style={{ color: '#f59e0b' }}>{metrics.impressionsSponsored}</strong></span>
          </div>
        </div>

        {/* Card 2: WhatsApp Clicks */}
        <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '24px', border: '1px solid #374151' }}>
          <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
            Cliques no WhatsApp (Intenções)
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#10b981', marginBottom: '12px' }}>
            {metrics.whatsappClicks.toLocaleString('pt-BR')}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
            Visitantes que clicaram no seu botão direto de contato
          </div>
        </div>

        {/* Card 3: CTR */}
        <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '24px', border: '1px solid #374151' }}>
          <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
            Taxa de Conversão (CTR)
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#38bdf8', marginBottom: '12px' }}>
            {metrics.ctr}%
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
            Proporção de cliques diretos em relação às exibições
          </div>
        </div>
      </div>

      {/* Daily Breakdown Table */}
      {metrics.dailyBreakdown.length > 0 && (
        <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '24px', border: '1px solid #374151', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Histórico Diário</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #374151', color: '#9ca3af' }}>
                  <th style={{ padding: '8px 12px' }}>Data</th>
                  <th style={{ padding: '8px 12px' }}>Impressões Totais</th>
                  <th style={{ padding: '8px 12px' }}>Orgânicas</th>
                  <th style={{ padding: '8px 12px' }}>Destaques</th>
                  <th style={{ padding: '8px 12px' }}>Cliques WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                {metrics.dailyBreakdown.map((row) => (
                  <tr key={row.date} style={{ borderBottom: '1px solid #2d3748' }}>
                    <td style={{ padding: '8px 12px' }}>{row.date}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.impressionsTotal}</td>
                    <td style={{ padding: '8px 12px', color: '#9ca3af' }}>{row.impressionsOrganic}</td>
                    <td style={{ padding: '8px 12px', color: '#f59e0b' }}>{row.impressionsSponsored}</td>
                    <td style={{ padding: '8px 12px', color: '#10b981', fontWeight: 600 }}>{row.whatsappClicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Information Banner */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: '#1e293b',
          borderRadius: '8px',
          borderLeft: '4px solid #38bdf8',
          fontSize: '13px',
          color: '#cbd5e1',
          lineHeight: '1.5',
        }}
      >
        <strong>Sobre as métricas:</strong> As impressões são contabilizadas somente quando seu anúncio fica visível na tela do visitante por pelo menos 0,5 segundo. O clique no WhatsApp representa uma intenção direta de contato. Todos os dados são agregados de forma anônima em estrita conformidade com as diretrizes de privacidade.
      </div>
    </div>
  )
}
