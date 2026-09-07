'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { VerificationSafeDTO, VerificationStatus } from '@/modules/verification/types'
import { continueAfterVerificationAction, getVerificationStatusAction, startVerificationAction } from '@/modules/verification/actions'
import { useI18n } from '@/components/i18n'
import { verificationStatusLabel } from '@/lib/i18n/labels'

interface VerificationStatusCardProps {
  initialVerification: VerificationSafeDTO | null
  initialVerifiedAdult: boolean
}

function isVerifiedAdult(verification: VerificationSafeDTO | null): boolean {
  if (!verification || verification.status !== 'VERIFIED') return false
  if (!verification.identityVerified || !verification.ageVerified) return false
  return !verification.expiresAt || new Date(verification.expiresAt).getTime() > Date.now()
}

export function VerificationStatusCard({ initialVerification, initialVerifiedAdult }: VerificationStatusCardProps) {
  const { locale, t } = useI18n()
  const router = useRouter()
  const [verification, setVerification] = useState<VerificationSafeDTO | null>(initialVerification)
  const [verifiedAdult, setVerifiedAdult] = useState(initialVerifiedAdult)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const status = verification?.status ?? 'NOT_STARTED'

  const startVerification = () => {
    setError(null)
    startTransition(async () => {
      const result = await startVerificationAction()
      if (result.success) window.location.assign(result.data.verificationUrl)
      else setError(result.error)
    })
  }

  const refreshStatus = () => {
    setError(null)
    startTransition(async () => {
      const result = await getVerificationStatusAction()
      if (!result.success) return setError(result.error)
      setVerification(result.data)
      setVerifiedAdult(isVerifiedAdult(result.data))
      router.refresh()
    })
  }

  const continueToPhotos = () => {
    setError(null)
    startTransition(async () => {
      const result = await continueAfterVerificationAction()
      if (!result.success) setError(result.error)
    })
  }

  return (
    <section className="verification-panel" aria-labelledby="verification-panel-title">
      <div className="verification-mark" aria-hidden="true">V</div>
      <div className="verification-status-line" role="status" aria-live="polite">
        <span>{t('verification.state')}</span><b>{verificationStatusLabel(locale, status)}</b>
      </div>
      {error && <p className="verification-error" role="alert">{error}</p>}

      {status === 'NOT_STARTED' && (
        <div className="verification-state">
          <h2 id="verification-panel-title">{t('verification.confirmIdentity')}</h2>
          <p className="verification-lead-notice">{t('verification.leadNotice')}</p>
          <p>{t('verification.partnerRedirect')}</p>
          <ol className="verification-steps">
            <li><span>01</span>{t('verification.stepStart')}</li>
            <li><span>02</span>{t('verification.stepAnalysis')}</li>
            <li><span>03</span>{t('verification.stepReturn')}</li>
          </ol>
          <div className="verification-actions">
            <button type="button" className="onboarding-primary" onClick={startVerification} disabled={isPending}>
              {isPending ? t('verification.preparing') : t('verification.start')}<span aria-hidden="true">↗</span>
            </button>
            <Link href="/onboarding/revisar" className="verification-secondary-action">
              {t('verification.reviewProfile')}
            </Link>
          </div>
          <div className="onboarding-nav-back">
            <Link href="/onboarding/onde-atende" className="onboarding-secondary">
              ← {t('common.back')}
            </Link>
          </div>
          <p className="verification-external-note">{t('verification.external')}</p>
        </div>
      )}

      {['PENDING', 'IN_PROGRESS', 'IN_REVIEW'].includes(status) && (
        <div className="verification-state">
          <h2 id="verification-panel-title">{t('verification.inProgress')}</h2>
          <p>{status === 'IN_REVIEW' ? t('verification.underReview') : t('verification.finishExternal')}</p>
          <div className="verification-actions">
            <button type="button" className="onboarding-primary" onClick={refreshStatus} disabled={isPending}>
              {isPending ? t('verification.checking') : t('verification.refresh')}<span aria-hidden="true">↻</span>
            </button>
            <Link href="/onboarding/revisar" className="verification-secondary-action">
              {t('verification.reviewProfile')}
            </Link>
          </div>
          <div className="onboarding-nav-back">
            <Link href="/onboarding/onde-atende" className="onboarding-secondary">
              ← {t('common.back')}
            </Link>
          </div>
        </div>
      )}

      {status === 'VERIFIED' && verifiedAdult && (
        <div className="verification-state verification-state--verified">
          <h2 id="verification-panel-title">{t('verification.identityConfirmed')}</h2>
          <ul className="verification-confirmations">
            <li><span aria-hidden="true">✓</span> {t('verification.identityConfirmed')}</li>
            <li><span aria-hidden="true">✓</span> {t('verification.ageConfirmed')}</li>
          </ul>
          <div className="verification-actions">
            <button type="button" className="onboarding-primary" onClick={continueToPhotos} disabled={isPending}>
              {isPending ? t('verification.continuing') : t('common.continue')}<span aria-hidden="true">→</span>
            </button>
            <Link href="/onboarding/revisar" className="verification-secondary-action">
              {t('verification.reviewProfile')}
            </Link>
          </div>
        </div>
      )}

      {((status === 'VERIFIED' && !verifiedAdult) || status === 'REJECTED' || status === 'EXPIRED') && (
        <div className="verification-state">
          <h2 id="verification-panel-title">{status === 'EXPIRED' ? t('verification.expired') : t('verification.failed')}</h2>
          <p>{status === 'EXPIRED' ? t('verification.expiredText') : t('verification.failedText')}</p>
          <div className="verification-actions">
            <button type="button" className="onboarding-primary" onClick={startVerification} disabled={isPending}>
              {isPending ? t('verification.preparing') : t('verification.retry')}<span aria-hidden="true">↗</span>
            </button>
            <Link href="/onboarding/revisar" className="verification-secondary-action">
              {t('verification.reviewProfile')}
            </Link>
          </div>
          <div className="onboarding-nav-back">
            <Link href="/onboarding/onde-atende" className="onboarding-secondary">
              ← {t('common.back')}
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
