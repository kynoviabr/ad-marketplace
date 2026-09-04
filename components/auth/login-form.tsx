'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { loginAction } from '@/modules/auth/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-message'
import type { ActionResult } from '@/modules/auth/types'
import { useI18n } from '@/components/i18n'
import { GoogleOAuthButton } from '@/components/auth/google-oauth-button'

const initialState: ActionResult = { success: false, error: '' }

export function LoginForm() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const [state, formAction, isPending] = useActionState(loginAction, initialState)

  const urlError = searchParams.get('error')
  const isIntentRequired = urlError === 'signup_intent_required'
  const isOAuthError = urlError === 'oauth_error' || urlError === 'oauth_failed'
  const isConfirmationFailed = urlError === 'confirmation_failed'

  return (
    <form action={formAction} className="auth-form" noValidate>
      <p className="auth-eyebrow">{t('auth.loginEyebrow')}</p>
      <h1 className="auth-title">{t('auth.welcomeBack')}</h1>
      <p className="auth-subtitle">{t('auth.loginSubtitle')}</p>

      {isIntentRequired && (
        <div className="auth-intent-box" role="alert">
          <p className="auth-intent-title">{t('auth.intentRequiredTitle')}</p>
          <p className="auth-intent-desc">{t('auth.intentRequiredDesc')}</p>
          <div className="auth-intent-actions">
            <GoogleOAuthButton intent="ADVERTISER" label={t('auth.intentAdvertiserCta')} />
            <GoogleOAuthButton intent="CLIENT" label={t('auth.intentClientCta')} />
          </div>
        </div>
      )}

      {isOAuthError && (
        <FormMessage type="error" message={t('auth.googleOAuthError')} />
      )}

      {isConfirmationFailed && (
        <FormMessage type="error" message={t('auth.confirmationFailed')} />
      )}

      {!state.success && state.error && (
        <FormMessage type="error" message={state.error} />
      )}

      <GoogleOAuthButton intent="LOGIN" />

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
          autoComplete="current-password"
          placeholder={t('auth.yourPassword')}
          required
        />
      </div>

      <div className="form-footer-link">
        <Link href="/forgot-password">{t('auth.forgotPassword')}</Link>
      </div>

      <Button type="submit" loading={isPending}>
        {t('auth.signIn')}
      </Button>

      <p className="auth-footer">
        {t('auth.noAccount')}{' '}
        <Link href="/signup">{t('auth.createAccount')}</Link>
      </p>
    </form>
  )
}
