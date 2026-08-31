import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/modules/moderation/guards'
import { getKycSupportContext } from '@/modules/verification/admin-monitor'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Suporte ao cadastro — Painel Administrativo', robots: 'noindex, nofollow' }

function formatWaiting(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining ? `${hours}h ${remaining}min` : `${hours}h`
}

export default async function AdminProfessionalSupportPage({ params }: { params: Promise<{ accountUserId: string }> }) {
  await requireAdmin()
  const { accountUserId } = await params
  const context = await getKycSupportContext(accountUserId)
  if (!context) notFound()

  return <div>
    <Link href="/admin/kyc" style={{ color: '#93c5fd', textDecoration: 'none' }}>← Voltar para KYC</Link>
    <header style={{ margin: '1.5rem 0' }}>
      <p style={{ color: '#f59e0b', fontSize: '.75rem', textTransform: 'uppercase', letterSpacing: '.08em' }}>Suporte ao cadastro</p>
      <h1 style={{ color: '#fff', fontSize: '1.75rem', margin: '.35rem 0' }}>{context.professionalName}</h1>
      <p style={{ color: '#9ca3af' }}>Contexto operacional mínimo para ajudar a profissional durante o onboarding.</p>
    </header>

    <section style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '.5rem', padding: '1.25rem', maxWidth: '760px' }} aria-labelledby="support-context-title">
      <h2 id="support-context-title" style={{ color: '#fff', fontSize: '1.1rem', marginTop: 0 }}>Cadastro e verificação</h2>
      <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '.65rem 1.25rem', color: '#d1d5db', margin: 0 }}>
        <dt>Perfil</dt><dd style={{ margin: 0 }}>{context.profileStatus ?? 'Ainda não criado'}</dd>
        <dt>Onboarding</dt><dd style={{ margin: 0 }}>{context.onboardingStatus} · etapa {context.onboardingStep}</dd>
        <dt>Estado KYC</dt><dd style={{ margin: 0 }}>{context.statusLabel}</dd>
        <dt>Última atualização</dt><dd style={{ margin: 0 }}>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(context.lastUpdatedAt))}</dd>
        <dt>Tempo aguardando</dt><dd style={{ margin: 0 }}>{context.verificationStatus === 'VERIFIED' ? 'Concluída' : formatWaiting(context.waitingMinutes)}</dd>
        <dt>WhatsApp</dt><dd style={{ margin: 0 }}>{context.whatsappPhone ?? 'WhatsApp não informado'}</dd>
      </dl>

      {context.whatsappUrl ? <a href={context.whatsappUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', marginTop: '1.25rem', minHeight: '44px', alignItems: 'center', padding: '.6rem 1rem', borderRadius: '.375rem', background: '#15803d', color: '#fff', fontWeight: 700, textDecoration: 'none' }}>Abrir WhatsApp ↗</a> : <p style={{ color: '#9ca3af', margin: '1.25rem 0 0' }}>WhatsApp não informado</p>}
    </section>

    <aside style={{ color: '#9ca3af', fontSize: '.8rem', marginTop: '1rem', maxWidth: '760px' }}>A conversa é iniciada manualmente pelo operador. A Velvet não envia mensagens automaticamente e esta página não altera o estado da verificação.</aside>
  </div>
}
