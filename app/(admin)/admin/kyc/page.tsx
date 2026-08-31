import Link from 'next/link'
import { requireAdmin } from '@/modules/moderation/guards'
import { getKycOperationsMonitor, matchesKycFilter, type KycAdminFilter } from '@/modules/verification/admin-monitor'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Operações KYC — Painel Administrativo', robots: 'noindex, nofollow' }

const FILTERS: Array<{ value: KycAdminFilter; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'NOT_STARTED', label: 'Não iniciadas' },
  { value: 'PENDING', label: 'Pendentes / em andamento' },
  { value: 'IN_REVIEW', label: 'Em análise' },
  { value: 'VERIFIED', label: 'Verificadas' },
  { value: 'PROBLEM', label: 'Rejeitadas / problema' },
]

function formatWaiting(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining ? `${hours}h ${remaining}min` : `${hours}h`
}

export default async function AdminKycPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin()
  const { status } = await searchParams
  const filter = FILTERS.some((item) => item.value === status) ? status as KycAdminFilter : 'ALL'
  const monitor = await getKycOperationsMonitor()
  const items = monitor.items.filter((item) => matchesKycFilter(item.verificationStatus, filter))
  const counters = [
    ['Não iniciadas', monitor.summary.notStarted], ['Em andamento / aguardando', monitor.summary.pending],
    ['Em análise', monitor.summary.inReview], ['Verificadas', monitor.summary.verified],
    ['Rejeitadas / problema', monitor.summary.problem], ['Total não resolvido', monitor.summary.unresolved],
  ] as const

  return <div>
    <header style={{ marginBottom: '1.5rem' }}>
      <h1 style={{ color: '#fff', fontSize: '1.75rem', marginBottom: '.5rem' }}>Operações KYC</h1>
      <p style={{ color: '#9ca3af', fontSize: '.875rem' }}>Acompanhamento operacional seguro da verificação, sem documentos ou dados de identidade.</p>
    </header>

    <section aria-label="Resumo KYC" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.75rem', marginBottom: '1.5rem' }}>
      {counters.map(([label, value]) => <article key={label} style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '.5rem', padding: '1rem' }}>
        <span style={{ color: '#9ca3af', fontSize: '.75rem', textTransform: 'uppercase' }}>{label}</span>
        <strong style={{ display: 'block', color: '#fff', fontSize: '1.5rem', marginTop: '.3rem' }}>{value}</strong>
      </article>)}
    </section>

    <nav aria-label="Filtros KYC" style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1rem' }}>
      {FILTERS.map((item) => <Link key={item.value} href={item.value === 'ALL' ? '/admin/kyc' : `/admin/kyc?status=${item.value}`} style={{ color: filter === item.value ? '#111827' : '#d1d5db', background: filter === item.value ? '#f59e0b' : '#1f2937', border: '1px solid #4b5563', borderRadius: '.375rem', padding: '.55rem .75rem', textDecoration: 'none', fontSize: '.8rem' }}>{item.label}</Link>)}
    </nav>

    <section style={{ overflowX: 'auto', border: '1px solid #374151', borderRadius: '.5rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
        <thead><tr style={{ background: '#111827', color: '#9ca3af', textAlign: 'left' }}>
          {['Profissional', 'Estado KYC', 'Última atualização', 'Tempo aguardando', 'Perfil / onboarding', 'Ação'].map((label) => <th key={label} style={{ padding: '.8rem' }}>{label}</th>)}
        </tr></thead>
        <tbody>{items.map((item) => <tr key={item.accountUserId} style={{ borderTop: '1px solid #374151', color: '#d1d5db', background: item.attention === 'CRITICAL' ? '#3f1d24' : item.attention === 'WARNING' ? '#3b2f16' : '#1f2937' }}>
          <td style={{ padding: '.8rem', color: '#fff', fontWeight: 600 }}>{item.professionalName}</td>
          <td style={{ padding: '.8rem' }}>{item.statusLabel}</td>
          <td style={{ padding: '.8rem' }}>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.lastUpdatedAt))}</td>
          <td style={{ padding: '.8rem' }}>{item.verificationStatus === 'VERIFIED' ? 'Concluída' : <>{formatWaiting(item.waitingMinutes)}{item.attention !== 'NONE' ? <strong style={{ display: 'block', color: item.attention === 'CRITICAL' ? '#fca5a5' : '#fcd34d' }}>Requer atenção</strong> : null}</>}</td>
          <td style={{ padding: '.8rem' }}>{item.profileStatus ?? 'Sem perfil'} · etapa {item.onboardingStep} · {item.onboardingStatus}</td>
          <td style={{ padding: '.8rem' }}>{item.profileHref ? <Link href={item.profileHref} style={{ color: '#93c5fd' }}>Ver perfil</Link> : <span style={{ color: '#6b7280' }}>Sem perfil</span>}</td>
        </tr>)}</tbody>
      </table>
      {items.length === 0 ? <p style={{ padding: '1.5rem', color: '#9ca3af', background: '#1f2937', margin: 0 }}>Nenhum caso neste filtro.</p> : null}
    </section>
  </div>
}
