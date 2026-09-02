'use client'

import { useState } from 'react'
import { moderateCustomerReviewAction } from '@/modules/moderation/actions'
import type { ReviewModerationQueueItem } from '@/modules/reviews/types'

export function ReviewModerationQueue({ initialItems }: { initialItems: ReviewModerationQueueItem[] }) {
  const [items, setItems] = useState(initialItems)
  const [busy, setBusy] = useState<string | null>(null)
  async function decide(item: ReviewModerationQueueItem, target: 'REVIEW' | 'RESPONSE', decision: 'APPROVE' | 'REJECT') {
    const reason = decision === 'REJECT' ? window.prompt('Motivo interno da rejeição:')?.trim() : undefined
    if (decision === 'REJECT' && !reason) return
    setBusy(`${item.id}:${target}`)
    const result = await moderateCustomerReviewAction({ reviewId: item.id, target, decision, reason })
    setBusy(null)
    if (!result.success) return window.alert(result.error)
    const nextStatus = decision === 'APPROVE' ? 'APPROVED' as const : 'REJECTED' as const
    setItems((current) => current.map((entry) => entry.id === item.id
      ? target === 'REVIEW' ? { ...entry, status: nextStatus } : { ...entry, response: entry.response ? { ...entry.response, status: nextStatus } : null }
      : entry).filter((entry) => entry.status === 'PENDING' || entry.response?.status === 'PENDING' || entry.openReports > 0))
  }
  if (!items.length) return <p style={{ color: '#9ca3af' }}>Nenhuma avaliação pendente ou denunciada.</p>
  return <div style={{ display: 'grid', gap: '1rem' }}>{items.map((item) => <article key={item.id} style={{ padding: '1rem', background: '#1f2937', border: '1px solid #374151', borderRadius: '.5rem' }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}><strong>{item.profileStageName}</strong><span>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</span></header>
    <p>{item.comment || <em>Sem comentário</em>}</p>
    <small>{item.status} · {item.openReports} denúncia(s)</small>
    {item.status === 'PENDING' ? <div style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem' }}><button disabled={busy !== null} onClick={() => decide(item, 'REVIEW', 'APPROVE')}>Aprovar</button><button disabled={busy !== null} onClick={() => decide(item, 'REVIEW', 'REJECT')}>Rejeitar</button></div> : null}
    {item.response ? <section style={{ marginTop: '1rem', paddingLeft: '1rem', borderLeft: '2px solid #6b7280' }}><strong>Resposta profissional</strong><p>{item.response.body}</p><small>{item.response.status}</small>{item.response.status === 'PENDING' ? <div style={{ display: 'flex', gap: '.5rem' }}><button disabled={busy !== null} onClick={() => decide(item, 'RESPONSE', 'APPROVE')}>Aprovar resposta</button><button disabled={busy !== null} onClick={() => decide(item, 'RESPONSE', 'REJECT')}>Rejeitar resposta</button></div> : null}</section> : null}
  </article>)}</div>
}
