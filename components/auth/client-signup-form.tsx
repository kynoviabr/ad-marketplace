'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { clientSignupAction } from '@/modules/auth/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-message'
import { GoogleOAuthButton } from '@/components/auth/google-oauth-button'
import type { ActionResult } from '@/modules/auth/types'
import { useI18n } from '@/components/i18n'

const initialState: ActionResult = { success: false, error: '' }

export function ClientSignupForm() {
  const { t } = useI18n()
  const [state, formAction, isPending] = useActionState(clientSignupAction, initialState)
  const fieldErrors = !state.success ? state.fieldErrors : undefined

  return (
    <form action={formAction} className="auth-form" noValidate>
      <p className="auth-eyebrow">{t('client.signupEyebrow')}</p>
      <h1 className="auth-title">{t('client.signupHeading')}</h1>
      <p className="auth-subtitle">{t('client.signupSubtitle')}</p>

      {!state.success && state.error && !fieldErrors && (
        <FormMessage type="error" message={state.error} />
      )}

      <GoogleOAuthButton intent="CLIENT" />

      <div className="auth-divider" aria-hidden="true">
        <span>{t('auth.or')}</span>
      </div>

      <div className="auth-field">
        <Label htmlFor="email">{t('auth.email')}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          error={fieldErrors?.email?.[0]}
        />
        {fieldErrors?.email?.[0] && <FormMessage type="error" message={fieldErrors.email[0]} />}
      </div>

      <div className="auth-field">
        <Label htmlFor="password">{t('auth.password')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          error={fieldErrors?.password?.[0]}
        />
        <p className="auth-field-hint">{t('auth.minimumPassword')}</p>
        {fieldErrors?.password?.[0] && <FormMessage type="error" message={fieldErrors.password[0]} />}
      </div>

      <div className="auth-field">
        <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          error={fieldErrors?.confirmPassword?.[0]}
        />
        {fieldErrors?.confirmPassword?.[0] && (
          <FormMessage type="error" message={fieldErrors.confirmPassword[0]} />
        )}
      </div>

      <div className="auth-field auth-field--checkbox">
        <label className="auth-checkbox-label">
          <input type="checkbox" name="acceptedTerms" required />
          <span>{t('auth.readAccept')}{' '}
            <Link href="/termos" target="_blank">{t('auth.terms')}</Link>
            {' '}{t('auth.andThe')}{' '}
            <Link href="/privacidade" target="_blank">{t('auth.privacy')}</Link>
          </span>
        </label>
        {fieldErrors?.acceptedTerms?.[0] && (
          <FormMessage type="error" message={fieldErrors.acceptedTerms[0]} />
        )}
      </div>

      <Button type="submit" className="auth-submit" disabled={isPending}>
        {isPending ? t('auth.creatingAccount') : t('auth.createAccount')}
      </Button>

      <p className="auth-footer">
        {t('auth.haveAccount')}{' '}
        <Link href="/login">{t('auth.signIn')}</Link>
      </p>
      <p className="auth-footer">
        <Link href="/signup">{t('auth.professionalSignupLink')}</Link>
      </p>
    </form>
  )
}
