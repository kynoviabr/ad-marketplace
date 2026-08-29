'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signupAction } from '@/modules/auth/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-message'
import type { ActionResult } from '@/modules/auth/types'

const initialState: ActionResult = { success: false, error: '' }

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signupAction, initialState)

  const fieldErrors = !state.success ? state.fieldErrors : undefined

  return (
    <form action={formAction} className="auth-form" noValidate>
      <p className="auth-eyebrow">PARA PROFISSIONAIS</p>
      <h1 className="auth-title">Comece seu espaço.</h1>
      <p className="auth-subtitle">Crie sua conta para montar seu perfil na Velvet.</p>

      {!state.success && state.error && !fieldErrors && (
        <FormMessage type="error" message={state.error} />
      )}

      <div className="form-group">
        <Label htmlFor="email" required>
          E-mail
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
          Senha
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          error={fieldErrors?.password?.[0]}
          required
        />
      </div>

      <div className="form-group">
        <Label htmlFor="confirmPassword" required>
          Confirmar senha
        </Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Repita a senha"
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
          <span>Tenho 18 anos ou mais</span>
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
            Li e aceito os{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer">
              Termos de Uso
            </a>{' '}
            e a{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              Política de Privacidade
            </a>
          </span>
        </label>
        {fieldErrors?.acceptedTerms && (
          <p className="input-error" role="alert">
            {fieldErrors.acceptedTerms[0]}
          </p>
        )}
      </div>

      <Button type="submit" loading={isPending}>
        Criar conta
      </Button>

      <p className="auth-footer">
        Já tenho uma conta <span aria-hidden="true">→</span>{' '}
        <Link href="/login">Entrar</Link>
      </p>
    </form>
  )
}
