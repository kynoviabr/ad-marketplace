'use client'
import { useActionState } from 'react'
import { publishProfileAction } from '@/modules/publication/actions'
import type { PublishProfileActionState } from '@/modules/publication/types'
const initialState: PublishProfileActionState = { success: false, error: '' }
export function PublicationAction({ enabled }: { enabled: boolean }) {
  const [state, formAction, isPending] = useActionState(publishProfileAction, initialState)
  return <form action={formAction} className="review-publication-action">
    {state.success === false && state.error ? <p className="review-action-error" role="alert">{state.error}</p> : null}
    <button className="onboarding-primary" type="submit" disabled={!enabled || isPending}><span>{isPending ? 'Confirmando critérios…' : 'Publicar perfil'}</span><span aria-hidden="true">→</span></button>
    <p>Os critérios são conferidos novamente no momento da publicação.</p>
  </form>
}
