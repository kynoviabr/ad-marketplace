'use client'

import { useState } from 'react'
import { saveProfessionalResponseAction } from '@/modules/reviews/actions'

export function ProfessionalResponseForm({ reviewId, initialResponse, locale }: { reviewId: string; initialResponse: string; locale: 'pt-BR' | 'en' }) {
  const [response, setResponse] = useState(initialResponse)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const en = locale === 'en'
  async function save(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setMessage('')
    const result = await saveProfessionalResponseAction({ reviewId, response })
    setPending(false); setMessage(result.success ? (en ? 'Response sent for moderation.' : 'Resposta enviada para moderação.') : (result.error ?? 'Erro'))
  }
  return <form className="professional-response-form" onSubmit={save}><label>{en ? 'Public response' : 'Resposta pública'}<textarea required maxLength={2000} value={response} onChange={(event) => setResponse(event.target.value)} /></label><button disabled={pending} type="submit">{pending ? '…' : (en ? 'Save response' : 'Salvar resposta')}</button>{message ? <small role="status">{message}</small> : null}</form>
}
