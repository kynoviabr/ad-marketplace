'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { loginAction } from '@/modules/auth/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-message'
import type { ActionResult } from '@/modules/auth/types'

const initialState: ActionResult = { success: false, error: '' }

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState)

  return (
    <form action={formAction} className="auth-form" noValidate>
      <h1 className="auth-title">Entrar</h1>
      <p className="auth-subtitle">AD-Marketplace</p>

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

      <div className="form-group">
        <Label htmlFor="password" required>
          Senha
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Sua senha"
          required
        />
      </div>

      <div className="form-footer-link">
        <Link href="/forgot-password">Esqueci minha senha</Link>
      </div>

      <Button type="submit" loading={isPending}>
        Entrar
      </Button>

      <p className="auth-footer">
        Não tem conta?{' '}
        <Link href="/signup">Criar conta</Link>
      </p>
    </form>
  )
}
