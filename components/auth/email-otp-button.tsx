'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { OAuthIntent } from '@/modules/auth/oauth'
import {
  requestEmailOtpAction,
  verifyEmailOtpAction,
} from '@/modules/auth/email-otp-actions'
import { isEmailOtpEnabled } from '@/modules/auth/email-otp'
import { useI18n } from '@/components/i18n'

export interface EmailOtpButtonProps {
  intent: OAuthIntent
  label?: string
  className?: string
  initialStep?: 'button' | 'email' | 'code'
  initialEmail?: string
  enabled?: boolean
}

function EmailIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function EmailOtpContent({
  intent,
  label,
  className = '',
  initialStep = 'button',
  initialEmail = '',
}: EmailOtpButtonProps) {
  const { t } = useI18n()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(initialStep !== 'button')
  const [step, setStep] = useState<'email' | 'code'>(
    initialStep === 'code' ? 'code' : 'email'
  )
  const [email, setEmail] = useState(initialEmail)
  const [targetEmail, setTargetEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [resendCountdown, setResendCountdown] = useState<number>(0)

  // Countdown timer for code resend cooldown
  useEffect(() => {
    if (resendCountdown <= 0) return
    const interval = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [resendCountdown])

  const buttonText = label || t('auth.receiveCodeByEmail')

  const handleOpen = () => {
    setIsOpen(true)
    setStep('email')
    setErrorMessage(null)
  }

  const handleClose = () => {
    setIsOpen(false)
    setStep('email')
    setCode('')
    setErrorMessage(null)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (errorMessage) setErrorMessage(null)
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(val)
    if (errorMessage) setErrorMessage(null)
  }

  const handleRequestOtp = () => {
    setErrorMessage(null)
    startTransition(async () => {
      try {
        const result = await requestEmailOtpAction(email, intent)
        if (result.success) {
          setStep('code')
          setTargetEmail(result.email || email.trim())
          setResendCountdown(result.retryAfterSeconds || 60)
        } else if (result.requiresIntentSelection) {
          router.push('/login?error=signup_intent_required')
        } else {
          setErrorMessage(result.error || t('auth.emailOtpDeliveryError'))
        }
      } catch {
        setErrorMessage(t('auth.emailOtpDeliveryError'))
      }
    })
  }

  const handleVerifyOtp = () => {
    if (code.length !== 6) {
      setErrorMessage(t('auth.emailOtpInvalidCode'))
      return
    }
    setErrorMessage(null)
    startTransition(async () => {
      try {
        const result = await verifyEmailOtpAction(email, code, intent)
        if (result.success && result.destination) {
          router.push(result.destination)
          router.refresh()
        } else if (result.requiresIntentSelection) {
          router.push('/login?error=signup_intent_required')
        } else {
          setErrorMessage(result.error || t('auth.emailOtpInvalidCode'))
        }
      } catch {
        setErrorMessage(t('auth.emailOtpInvalidCode'))
      }
    })
  }

  const handleResendOtp = () => {
    if (resendCountdown > 0 || isPending) return
    setErrorMessage(null)
    startTransition(async () => {
      try {
        const result = await requestEmailOtpAction(email, intent)
        if (result.success) {
          setResendCountdown(result.retryAfterSeconds || 60)
        } else {
          setErrorMessage(result.error || t('auth.emailOtpDeliveryError'))
        }
      } catch {
        setErrorMessage(t('auth.emailOtpDeliveryError'))
      }
    })
  }

  // Collapsed trigger button
  if (!isOpen) {
    return (
      <div className="auth-oauth-group">
        <button
          type="button"
          onClick={handleOpen}
          className={`auth-btn-email ${className}`}
          aria-label={buttonText}
          data-testid="email-otp-trigger-btn"
        >
          <EmailIcon />
          <span>{buttonText}</span>
        </button>
      </div>
    )
  }

  // Expanded OTP flow card
  return (
    <div
      className="auth-email-box"
      role="region"
      aria-labelledby="email-otp-title"
      data-testid="email-otp-container"
    >
      <div className="auth-email-header">
        <div>
          <h2 id="email-otp-title" className="auth-email-title">
            {t('auth.emailOtpTitle')}
          </h2>
          <p className="auth-email-subtitle">{t('auth.emailOtpSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="auth-email-close-btn"
          aria-label={t('auth.emailOtpBack')}
          title={t('auth.emailOtpBack')}
        >
          ✕
        </button>
      </div>

      {errorMessage && (
        <div className="auth-email-error" role="alert" data-testid="email-otp-error">
          {errorMessage}
        </div>
      )}

      {step === 'email' ? (
        <div className="auth-email-actions" data-testid="email-otp-email-step">
          <div className="auth-email-field">
            <label htmlFor="email-otp-input">
              {t('auth.emailOtpEmailLabel')}
            </label>
            <input
              id="email-otp-input"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={t('auth.emailOtpEmailPlaceholder')}
              value={email}
              onChange={handleEmailChange}
              disabled={isPending}
              className="auth-email-input"
              data-testid="email-otp-input"
              autoFocus
            />
          </div>

          <button
            type="button"
            onClick={handleRequestOtp}
            disabled={isPending || !email.trim()}
            className="btn btn--primary"
            style={{ width: '100%' }}
            data-testid="email-request-otp-btn"
          >
            {isPending ? t('auth.emailOtpSending') : t('auth.emailOtpSendCode')}
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="auth-email-back-btn"
          >
            {t('auth.emailOtpBack')}
          </button>
        </div>
      ) : (
        <div className="auth-email-actions" data-testid="email-otp-code-step">
          <div className="auth-email-badge">
            <span>
              {t('auth.emailOtpCodeSentTo')} <strong>{targetEmail || email}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setCode('')
                setErrorMessage(null)
              }}
              className="auth-email-change-email"
              data-testid="email-change-email-btn"
            >
              {t('auth.emailOtpChangeEmail')}
            </button>
          </div>

          <div className="auth-email-field">
            <label htmlFor="email-code-input">
              {t('auth.emailOtpCodeLabel')}
            </label>
            <input
              id="email-code-input"
              type="text"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder={t('auth.emailOtpCodePlaceholder')}
              value={code}
              onChange={handleCodeChange}
              disabled={isPending}
              className="auth-email-input auth-email-input-code"
              data-testid="email-code-input"
              autoFocus
            />
          </div>

          <button
            type="button"
            onClick={handleVerifyOtp}
            disabled={isPending || code.length !== 6}
            className="btn btn--primary"
            style={{ width: '100%' }}
            data-testid="email-verify-otp-btn"
          >
            {isPending ? t('auth.emailOtpVerifying') : t('auth.emailOtpVerify')}
          </button>

          <div className="auth-email-resend-row">
            {resendCountdown > 0 ? (
              <span className="auth-email-resend-countdown" data-testid="email-resend-countdown">
                {t('auth.emailOtpResendIn', { seconds: resendCountdown })}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isPending}
                className="auth-email-resend-btn"
                data-testid="email-resend-btn"
              >
                {isPending ? t('auth.emailOtpSending') : t('auth.emailOtpResend')}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="auth-email-back-btn"
          >
            {t('auth.emailOtpBack')}
          </button>
        </div>
      )}
    </div>
  )
}

export function EmailOtpButton(props: EmailOtpButtonProps) {
  const isEnabled = props.enabled !== undefined ? props.enabled : isEmailOtpEnabled()
  if (!isEnabled) {
    return null
  }
  return <EmailOtpContent {...props} />
}
