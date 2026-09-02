'use client'

import { useState } from 'react'
import { reportReviewAction } from '@/modules/reviews/actions'

export function ReviewReportButton({ reviewId, locale }: { reviewId: string; locale: 'pt-BR' | 'en' }) {
  const [status, setStatus] = useState('')
  const en = locale === 'en'
  async function report() {
    if (!window.confirm(en ? 'Report this review for moderation?' : 'Denunciar esta avaliação para moderação?')) return
    const result = await reportReviewAction({ reviewId, reason: 'OTHER' })
    setStatus(result.success ? (en ? 'Reported' : 'Denunciada') : (result.error ?? (en ? 'Could not report' : 'Não foi possível denunciar')))
  }
  return <span className="review-report"><button type="button" onClick={report}>{en ? 'Report' : 'Denunciar'}</button>{status ? <small role="status">{status}</small> : null}</span>
}
