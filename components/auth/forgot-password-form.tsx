'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { forgotPasswordAction } from '@/modules/auth/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-message'
import type { ActionResult } from '@/modules/auth/types'

const initialState: ActionResult = { success: false, error: '' }

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, initialState)

  if (state.success) {
    return (
      <div className="auth-form">
        <h1 className="auth-title">Verifique seu e-mail</h1>
        <FormMessage
          type="success"
          message="Se houver uma conta associada a este e-mail, enviaremos as instruções para redefinir sua senha."
        />
        <p className="auth-footer">
          <Link href="/login">Voltar para o login</Link>
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="auth-form" noValidate>
      <h1 className="auth-title">Recuperar senha</h1>
      <p className="auth-subtitle">
        Informe seu e-mail e enviaremos as instruções para redefinir sua senha.
      </p>

      {!state.success && state.error && (
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
          required
        />
      </div>

      <Button type="submit" loading={isPending}>
        Enviar instruções
      </Button>

      <p className="auth-footer">
        <Link href="/login">Voltar para o login</Link>
      </p>
    </form>
  )
}
