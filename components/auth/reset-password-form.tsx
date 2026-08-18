'use client'

import { useActionState } from 'react'
import { resetPasswordAction } from '@/modules/auth/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-message'
import type { ActionResult } from '@/modules/auth/types'

const initialState: ActionResult = { success: false, error: '' }

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState)

  const fieldErrors = !state.success ? state.fieldErrors : undefined

  return (
    <form action={formAction} className="auth-form" noValidate>
      <h1 className="auth-title">Nova senha</h1>
      <p className="auth-subtitle">Defina uma nova senha para sua conta.</p>

      {!state.success && state.error && !fieldErrors && (
        <FormMessage type="error" message={state.error} />
      )}

      <div className="form-group">
        <Label htmlFor="password" required>
          Nova senha
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
          Confirmar nova senha
        </Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Repita a nova senha"
          error={fieldErrors?.confirmPassword?.[0]}
          required
        />
      </div>

      <Button type="submit" loading={isPending}>
        Redefinir senha
      </Button>
    </form>
  )
}
