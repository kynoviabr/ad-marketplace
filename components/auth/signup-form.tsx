'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signupAction } from '@/modules/auth/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-message'
import { GoogleOAuthButton } from '@/components/auth/google-oauth-button'
import { WhatsAppOtpButton } from '@/components/auth/whatsapp-otp-button'
import { EmailOtpButton } from '@/components/auth/email-otp-button'
import type { ActionResult } from '@/modules/auth/types'
import { useI18n } from '@/components/i18n'

const initialState: ActionResult = { success: false, error: '' }

export function SignupForm() {
  const { t } = useI18n()
  const [state, formAction, isPending] = useActionState(signupAction, initialState)

  const fieldErrors = !state.success ? state.fieldErrors : undefined

  return (
    <form action={formAction} className="auth-form" noValidate>
      <p className="auth-eyebrow">{t('auth.professionals')}</p>
      <h1 className="auth-title">{t('auth.signupHeading')}</h1>
      <p className="auth-subtitle">{t('auth.signupSubtitle')}</p>

      {!state.success && state.error && !fieldErrors && (
        <FormMessage type="error" message={state.error} />
      )}

      <GoogleOAuthButton intent="ADVERTISER" />
      <WhatsAppOtpButton intent="ADVERTISER" />
      <EmailOtpButton intent="ADVERTISER" />

      <div className="auth-divider" aria-hidden="true">
        <span>{t('auth.or')}</span>
      </div>

      <div className="form-group">
        <Label htmlFor="email" required>
          {t('auth.email')}
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="seu@email.com"
          error={fieldErrors?.email?.[0]}
          required
        />
      </div>

      <div className="form-group">
        <Label htmlFor="password" required>
          {t('auth.password')}
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder={t('auth.minimumPassword')}
          error={fieldErrors?.password?.[0]}
          required
        />
      </div>

      <div className="form-group">
        <Label htmlFor="confirmPassword" required>
          {t('auth.confirmPassword')}
        </Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder={t('auth.repeatPassword')}
          error={fieldErrors?.confirmPassword?.[0]}
          required
        />
      </div>

      <div className="form-group form-group--checkbox">
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="acceptedAge"
            value="on"
            className="checkbox"
            required
          />
          <span>{t('auth.adultConfirmation')}</span>
        </label>
        {fieldErrors?.acceptedAge && (
          <p className="input-error" role="alert">
            {fieldErrors.acceptedAge[0]}
          </p>
        )}
      </div>

      <div className="form-group form-group--checkbox">
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="acceptedTerms"
            value="on"
            className="checkbox"
            required
          />
          <span>
            {t('auth.readAccept')}{' '}
            <a href="/termos" target="_blank" rel="noopener noreferrer">{t('auth.terms')}</a>{' '}
            {t('auth.andThe')}{' '}
            <a href="/privacidade" target="_blank" rel="noopener noreferrer">{t('auth.privacy')}</a>
          </span>
        </label>
        {fieldErrors?.acceptedTerms && (
          <p className="input-error" role="alert">
            {fieldErrors.acceptedTerms[0]}
          </p>
        )}
      </div>

      <Button type="submit" loading={isPending}>
        {t('auth.createAccount')}
      </Button>

      <p className="auth-footer">
        {t('auth.haveAccount')} <span aria-hidden="true">→</span>{' '}
        <Link href="/login">{t('auth.signIn')}</Link>
      </p>
    </form>
  )
}
