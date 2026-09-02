'use client'

import Link from 'next/link'
import { useState } from 'react'
import { submitReviewAction } from '@/modules/reviews/actions'

export function ReviewForm({ profileId, access, locale }: { profileId: string; access: { authenticated: boolean; adult: boolean; owner: boolean }; locale: 'pt-BR' | 'en' }) {
  const en = locale === 'en'
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  if (access.owner) return null
  if (!access.authenticated) return <p className="review-access-note"><Link href={en ? '/en/login' : '/login'}>{en ? 'Sign in' : 'Entre'}</Link> {en ? 'to leave a review.' : 'para deixar uma avaliação.'}</p>
  if (!access.adult) return <p className="review-access-note">{en ? 'Confirmed legal age is required to review.' : 'É necessário ter a maioridade confirmada para avaliar.'}</p>
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setMessage('')
    if (!rating) return setMessage(en ? 'Choose 1 to 5 stars.' : 'Escolha de 1 a 5 estrelas.')
    setPending(true)
    const result = await submitReviewAction({ profileId, rating, comment })
    setPending(false)
    if (!result.success) return setMessage(result.error ?? (en ? 'Could not submit.' : 'Não foi possível enviar.'))
    setComment(''); setRating(0); setMessage(en ? 'Review sent for moderation.' : 'Avaliação enviada para moderação.')
  }
  return <form className="review-form" onSubmit={submit}>
    <h3>{en ? 'Share your experience' : 'Compartilhe sua experiência'}</h3>
    <fieldset><legend>{en ? 'Rating' : 'Nota'}</legend><div className="review-star-picker">{[1,2,3,4,5].map((value) => <button key={value} type="button" aria-label={`${value} ${en ? 'stars' : 'estrelas'}`} aria-pressed={rating === value} onClick={() => setRating(value)}>{value <= rating ? '★' : '☆'}</button>)}</div></fieldset>
    <label>{en ? 'Comment (optional)' : 'Comentário (opcional)'}<textarea maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} /></label>
    <button className="velvet-button velvet-button--primary" disabled={pending} type="submit">{pending ? (en ? 'Sending…' : 'Enviando…') : (en ? 'Send for moderation' : 'Enviar para moderação')}</button>
    {message ? <p role="status">{message}</p> : null}
  </form>
}
