'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { loginAction } from '@/modules/auth/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-message'
import type { ActionResult } from '@/modules/auth/types'
import { useI18n } from '@/components/i18n'

const initialState: ActionResult = { success: false, error: '' }

export function LoginForm() {
  const { t } = useI18n()
  const [state, formAction, isPending] = useActionState(loginAction, initialState)

  return (
    <form action={formAction} className="auth-form" noValidate>
      <p className="auth-eyebrow">{t('auth.loginEyebrow')}</p>
      <h1 className="auth-title">{t('auth.welcomeBack')}</h1>
      <p className="auth-subtitle">{t('auth.loginSubtitle')}</p>

      {!state.success && state.error && (
        <FormMessage type="error" message={state.error} />
      )}

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
