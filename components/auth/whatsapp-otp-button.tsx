'use client'

import { useState, useEffect, useTransition } from 'react'
import type { OAuthIntent } from '@/modules/auth/oauth'
import {
  formatBrazilianPhoneInput,
  type WhatsAppOtpProvider,
} from '@/modules/auth/whatsapp-otp'
import {
  requestWhatsAppOtpAction,
  verifyWhatsAppOtpAction,
} from '@/modules/auth/whatsapp-actions'
import { useI18n } from '@/components/i18n'

export interface WhatsAppOtpButtonProps {
  intent: OAuthIntent
  label?: string
  className?: string
  initialStep?: 'button' | 'phone' | 'code'
  initialPhone?: string
  mockProvider?: WhatsAppOtpProvider
}

function WhatsAppIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M17.472 14.382c-.301-.15-1.781-.879-2.057-.98-.276-.1-.476-.15-.677.15-.2.301-.777.98-.953 1.18-.175.2-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.676-2.085-.175-.301-.019-.464.132-.614.136-.135.301-.351.451-.527.151-.175.201-.301.301-.501.1-.2.05-.376-.025-.526-.075-.15-.677-1.632-.928-2.236-.244-.588-.493-.509-.677-.518-.175-.009-.376-.01-.577-.01-.2 0-.527.075-.802.376-.276.301-1.053 1.029-1.053 2.509 0 1.48 1.079 2.91 1.229 3.111.15.2 2.122 3.24 5.141 4.544.718.31 1.279.496 1.716.635.722.23 1.379.197 1.9-.12.58-.354 1.78-1.028 2.032-1.84.252-.812.252-1.508.177-1.658-.075-.15-.276-.226-.577-.376z"
        fill="#25D366"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.05 21.95a.75.75 0 00.938.938l4.782-1.388A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm-8.5 10c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5-3.806 8.5-8.5 8.5a8.46 8.46 0 01-4.44-1.25.75.75 0 00-.518-.106l-3.35.972.972-3.35a.75.75 0 00-.106-.518A8.46 8.46 0 013.5 12z"
        fill="#25D366"
      />
    </svg>
  )
}

export function WhatsAppOtpButton({
  intent,
  label,
  className = '',
  initialStep = 'button',
  initialPhone = '',
  mockProvider,
}: WhatsAppOtpButtonProps) {
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(initialStep !== 'button')
  const [step, setStep] = useState<'phone' | 'code'>(
    initialStep === 'code' ? 'code' : 'phone'
  )
  const [phone, setPhone] = useState(initialPhone)
  const [formattedTargetPhone, setFormattedTargetPhone] = useState(initialPhone)
  const [code, setCode] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [resendCountdown, setResendCountdown] = useState<number>(0)

  // Countdown timer for code resend
  useEffect(() => {
    if (resendCountdown <= 0) return
    const interval = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [resendCountdown])

  const buttonText = label || t('auth.continueWithWhatsApp')

  const handleOpen = () => {
    setIsOpen(true)
    setStep('phone')
    setErrorMessage(null)
  }

  const handleClose = () => {
    setIsOpen(false)
    setStep('phone')
    setCode('')
    setErrorMessage(null)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const masked = formatBrazilianPhoneInput(raw)
    setPhone(masked)
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
        const result = await requestWhatsAppOtpAction(phone, intent, mockProvider)
        if (result.success) {
          setStep('code')
          setFormattedTargetPhone(result.formattedPhone || phone)
          setResendCountdown(60)
        } else {
          setErrorMessage(result.error || t('auth.whatsAppUnavailable'))
        }
      } catch {
        setErrorMessage(t('auth.whatsAppUnavailable'))
      }
    })
  }

  const handleVerifyOtp = () => {
    if (code.length !== 6) {
      setErrorMessage(t('auth.whatsAppInvalidCode'))
      return
    }
    setErrorMessage(null)
    startTransition(async () => {
      try {
        const result = await verifyWhatsAppOtpAction(phone, code, intent, mockProvider)
        if (result.success) {
          // Future: session established, redirect according to role
          setErrorMessage(null)
        } else {
          setErrorMessage(result.error || t('auth.whatsAppInvalidCode'))
        }
      } catch {
        setErrorMessage(t('auth.whatsAppInvalidCode'))
      }
    })
  }

  const handleResendOtp = () => {
    if (resendCountdown > 0 || isPending) return
    setErrorMessage(null)
    startTransition(async () => {
      try {
        const result = await requestWhatsAppOtpAction(phone, intent, mockProvider)
        if (result.success) {
          setResendCountdown(60)
        } else {
          setErrorMessage(result.error || t('auth.whatsAppUnavailable'))
        }
      } catch {
        setErrorMessage(t('auth.whatsAppUnavailable'))
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
          className={`auth-btn-whatsapp ${className}`}
          aria-label={buttonText}
          data-testid="whatsapp-otp-trigger-btn"
        >
          <WhatsAppIcon />
          <span>{buttonText}</span>
        </button>
      </div>
    )
  }

  // Expanded OTP flow card
  return (
    <div
      className="auth-whatsapp-box"
      role="region"
      aria-labelledby="whatsapp-otp-title"
      data-testid="whatsapp-otp-container"
    >
      <div className="auth-whatsapp-header">
        <div>
          <h2 id="whatsapp-otp-title" className="auth-whatsapp-title">
            {t('auth.whatsAppTitle')}
          </h2>
          <p className="auth-whatsapp-subtitle">{t('auth.whatsAppSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="auth-whatsapp-close-btn"
          aria-label={t('auth.whatsAppBack')}
          title={t('auth.whatsAppBack')}
        >
          ✕
        </button>
      </div>

      {errorMessage && (
        <div className="auth-whatsapp-error" role="alert" data-testid="whatsapp-otp-error">
          {errorMessage}
        </div>
      )}

      {step === 'phone' ? (
        <div className="auth-whatsapp-actions" data-testid="whatsapp-otp-phone-step">
          <div className="auth-whatsapp-field">
            <label htmlFor="whatsapp-phone-input">
              {t('auth.whatsAppPhoneLabel')}
            </label>
            <input
              id="whatsapp-phone-input"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder={t('auth.whatsAppPhonePlaceholder')}
              value={phone}
              onChange={handlePhoneChange}
              disabled={isPending}
              className="auth-whatsapp-input"
              data-testid="whatsapp-phone-input"
              autoFocus
            />
          </div>

          <button
            type="button"
            onClick={handleRequestOtp}
            disabled={isPending || !phone.trim()}
            className="btn btn--primary"
            style={{ width: '100%' }}
            data-testid="whatsapp-request-otp-btn"
          >
            {isPending ? t('auth.whatsAppSending') : t('auth.whatsAppSendCode')}
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="auth-whatsapp-back-btn"
          >
            {t('auth.whatsAppBack')}
          </button>
        </div>
      ) : (
        <div className="auth-whatsapp-actions" data-testid="whatsapp-otp-code-step">
          <div className="auth-whatsapp-phone-badge">
            <span>
              {t('auth.whatsAppCodeSentTo')} <strong>{formattedTargetPhone || phone}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setStep('phone')
                setCode('')
                setErrorMessage(null)
              }}
              className="auth-whatsapp-change-phone"
              data-testid="whatsapp-change-phone-btn"
            >
              {t('auth.whatsAppChangeNumber')}
            </button>
          </div>

          <div className="auth-whatsapp-field">
            <label htmlFor="whatsapp-code-input">
              {t('auth.whatsAppCodeLabel')}
            </label>
            <input
              id="whatsapp-code-input"
              type="text"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder={t('auth.whatsAppCodePlaceholder')}
              value={code}
              onChange={handleCodeChange}
              disabled={isPending}
              className="auth-whatsapp-input auth-whatsapp-input-code"
              data-testid="whatsapp-code-input"
              autoFocus
            />
          </div>

          <button
            type="button"
            onClick={handleVerifyOtp}
            disabled={isPending || code.length !== 6}
            className="btn btn--primary"
            style={{ width: '100%' }}
            data-testid="whatsapp-verify-otp-btn"
          >
            {isPending ? t('auth.whatsAppVerifying') : t('auth.whatsAppVerify')}
          </button>

          <div className="auth-whatsapp-resend-row">
            {resendCountdown > 0 ? (
              <span className="auth-whatsapp-resend-countdown" data-testid="whatsapp-resend-countdown">
                {t('auth.whatsAppResendIn', { seconds: resendCountdown })}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isPending}
                className="auth-whatsapp-resend-btn"
                data-testid="whatsapp-resend-btn"
              >
                {isPending ? t('auth.whatsAppSending') : t('auth.whatsAppResend')}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="auth-whatsapp-back-btn"
          >
            {t('auth.whatsAppBack')}
          </button>
        </div>
      )}
    </div>
  )
}
