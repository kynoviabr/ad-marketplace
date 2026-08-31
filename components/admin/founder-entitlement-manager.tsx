'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { grantFounderBenefitAction } from '@/modules/billing/actions'
import type { AdminFounderEntitlementSummary } from '@/modules/billing/types'

export function FounderEntitlementManager({ items }: { items: AdminFounderEntitlementSummary[] }) {
  const router = useRouter()
  const [pendingProfile, setPendingProfile] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('pt-BR').format(new Date(value)) : 'sem data'

  async function grant(profileId: string) {
    if (pendingProfile) return
    setPendingProfile(profileId)
    setFeedback((current) => ({ ...current, [profileId]: '' }))
    const result = await grantFounderBenefitAction({ profileId })
    setPendingProfile(null)
    if (!result.success) {
      setFeedback((current) => ({ ...current, [profileId]: result.error }))
      return
    }
    setFeedback((current) => ({ ...current, [profileId]: 'Benefício Founder concedido com sucesso.' }))
    router.refresh()
  }

  return <section style={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '2.5rem' }} aria-labelledby="founder-title">
    <h2 id="founder-title" style={{ color: '#fff', fontSize: '1.125rem', margin: 0 }}>Founder / Acesso de publicação</h2>
    <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Conceda três meses de lançamento gratuito pelo plano Founder. A concessão não publica nem aprova o perfil.</p>
    {items.length === 0 ? <p style={{ color: '#9ca3af' }}>Nenhum perfil profissional encontrado.</p> : <div style={{ display: 'grid', gap: '1rem' }}>
      {items.map((item) => <article key={item.profileId} style={{ padding: '1rem', border: '1px solid #374151', borderRadius: '0.5rem', background: '#111827' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ color: '#fff', margin: '0 0 .5rem' }}>{item.stageName}</h3>
            <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '.35rem 1rem', color: '#d1d5db', fontSize: '.875rem', margin: 0 }}>
              <dt>Publicação</dt><dd style={{ margin: 0 }}>{item.publicationActive ? 'ATIVA' : 'INATIVA'}</dd>
              <dt>Plano</dt><dd style={{ margin: 0 }}>{item.planCode ?? 'nenhum'}</dd>
              <dt>Preço</dt><dd style={{ margin: 0 }}>{item.priceCode ?? 'nenhum'}</dd>
              <dt>Status</dt><dd style={{ margin: 0 }}>{item.subscriptionStatus ?? 'nenhum'}</dd>
              <dt>Início</dt><dd style={{ margin: 0 }}>{formatDate(item.currentPeriodStart)}</dd>
              <dt>Válido até</dt><dd style={{ margin: 0 }}>{formatDate(item.currentPeriodEnd)}</dd>
              <dt>Período Founder</dt><dd style={{ margin: 0 }}>{item.founderFreePeriod === 'ACTIVE' ? 'ATIVO' : item.founderFreePeriod === 'EXPIRED' ? 'EXPIRADO' : 'NÃO CONCEDIDO'}</dd>
            </dl>
          </div>
          {item.founderFreePeriod === 'NOT_GRANTED' && !item.subscriptionStatus ? <button type="button" onClick={() => grant(item.profileId)} disabled={pendingProfile !== null} style={{ alignSelf: 'flex-start', minHeight: '44px', padding: '.65rem 1rem', borderRadius: '.375rem', border: 0, background: '#a16207', color: '#fff', fontWeight: 700, cursor: pendingProfile ? 'not-allowed' : 'pointer', opacity: pendingProfile ? .65 : 1 }}>
            {pendingProfile === item.profileId ? 'Concedendo…' : 'Conceder benefício Founder — 3 meses'}
          </button> : null}
        </div>
        {feedback[item.profileId] ? <p role="status" style={{ color: feedback[item.profileId].includes('sucesso') ? '#86efac' : '#fca5a5', marginBottom: 0 }}>{feedback[item.profileId]}</p> : null}
      </article>)}
    </div>}
  </section>
}
