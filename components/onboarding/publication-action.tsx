'use client'
import { useActionState } from 'react'
import { publishProfileAction } from '@/modules/publication/actions'
import type { PublishProfileActionState } from '@/modules/publication/types'
import { useI18n } from '@/components/i18n'
const initialState: PublishProfileActionState = { success: false, error: '' }
export function PublicationAction({ enabled }: { enabled: boolean }) {
  const { t } = useI18n()
  const [state, formAction, isPending] = useActionState(publishProfileAction, initialState)
  return <form action={formAction} className="review-publication-action">
    {state.success === false && state.error ? <p className="review-action-error" role="alert">{state.error}</p> : null}
    <button className="onboarding-primary" type="submit" disabled={!enabled || isPending}><span>{isPending ? t('review.confirming') : t('review.publish')}</span><span aria-hidden="true">→</span></button>
    <p>{t('review.recheck')}</p>
  </form>
}
