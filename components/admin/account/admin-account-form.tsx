'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LanguageSelector } from '@/components/i18n'
import {
  updateAdminDisplayNameAction,
  updateAdminPasswordAction,
  type AdminNavbarUser,
} from '@/modules/admin/actions'

export interface AdminAccountFormProps {
  initialName: string
  email: string
  role: 'ADMIN'
}

export function AdminAccountForm({ initialName, email, role }: AdminAccountFormProps) {
  const router = useRouter()

  // Display Name State
  const [name, setName] = useState(initialName)
  const [isSavingName, startNameTransition] = useTransition()
  const [nameFeedback, setNameFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Password State
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSavingPassword, startPasswordTransition] = useTransition()
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function handleUpdateName(e: React.FormEvent) {
    e.preventDefault()
    setNameFeedback(null)

    const trimmed = name.trim()
    if (!trimmed) {
      setNameFeedback({ type: 'error', message: 'O nome de exibição não pode estar vazio.' })
      return
    }

    if (trimmed.length > 60) {
      setNameFeedback({ type: 'error', message: 'O nome de exibição deve ter no máximo 60 caracteres.' })
      return
    }

    startNameTransition(async () => {
      try {
        const res = await updateAdminDisplayNameAction({ name: trimmed })
        if (res.success) {
          setNameFeedback({ type: 'success', message: res.message || 'Nome atualizado.' })
          setName(res.name || trimmed)

          // Notify AdminNavbar immediately for instant reactive avatar/name update
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent<Partial<AdminNavbarUser>>('admin-user-updated', {
                detail: { name: res.name || trimmed },
              })
            )
          }
          router.refresh()
        } else {
          setNameFeedback({ type: 'error', message: res.message || 'Falha ao atualizar nome.' })
        }
      } catch (err: any) {
        console.error('[AdminAccountForm:name] Exception:', err)
        setNameFeedback({ type: 'error', message: err?.message || 'Erro ao processar atualização do nome.' })
      }
    })
  }

  function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordFeedback(null)

    if (!password || password.length < 8) {
      setPasswordFeedback({ type: 'error', message: 'A nova senha deve ter no mínimo 8 caracteres.' })
      return
    }

    if (password !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'As senhas não coincidem.' })
      return
    }

    startPasswordTransition(async () => {
      try {
        const res = await updateAdminPasswordAction({ password, confirmPassword })
        if (res.success) {
          setPasswordFeedback({ type: 'success', message: res.message || 'Senha alterada com sucesso.' })
          setPassword('')
          setConfirmPassword('')
        } else {
          setPasswordFeedback({ type: 'error', message: res.message || 'Falha ao alterar senha.' })
        }
      } catch (err: any) {
        console.error('[AdminAccountForm:password] Exception:', err)
        setPasswordFeedback({ type: 'error', message: err?.message || 'Erro ao processar atualização de senha.' })
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '720px' }}>
      {/* SECTION 1: Perfil da conta */}
      <section
        aria-labelledby="section-profile"
        style={{
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div style={{ borderBottom: '1px solid #374151', paddingBottom: '0.75rem' }}>
          <h2 id="section-profile" style={{ fontSize: '1.125rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>
            Perfil da conta
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#9ca3af', margin: '0.25rem 0 0' }}>
            Informações cadastrais e identidade pública do administrador.
          </p>
        </div>

        {/* Form: Display Name */}
        <form onSubmit={handleUpdateName} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label
              htmlFor="displayNameInput"
              style={{ fontSize: '0.875rem', fontWeight: 500, color: '#d1d5db' }}
            >
              Nome de exibição
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                id="displayNameInput"
                name="displayName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                disabled={isSavingName}
                placeholder="Ex.: Administrador Operacional"
                style={{
                  flex: '1 1 240px',
                  backgroundColor: '#111827',
                  border: '1px solid #4b5563',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 0.75rem',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={isSavingName || name.trim() === initialName}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  backgroundColor:
                    isSavingName || name.trim() === initialName ? '#4b5563' : '#f59e0b',
                  color:
                    isSavingName || name.trim() === initialName ? '#9ca3af' : '#111827',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor:
                    isSavingName || name.trim() === initialName ? 'not-allowed' : 'pointer',
                  transition: 'background-color 150ms ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {isSavingName ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
            {nameFeedback && (
              <div
                role="status"
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  marginTop: '0.25rem',
                  color: nameFeedback.type === 'success' ? '#34d399' : '#f87171',
                }}
              >
                {nameFeedback.message}
              </div>
            )}
          </div>
        </form>

        {/* Field: E-mail (Read-only) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label
            htmlFor="emailInput"
            style={{ fontSize: '0.875rem', fontWeight: 500, color: '#d1d5db' }}
          >
            E-mail
          </label>
          <input
            id="emailInput"
            type="email"
            value={email}
            readOnly
            disabled
            style={{
              backgroundColor: '#111827',
              border: '1px solid #374151',
              borderRadius: '0.375rem',
              padding: '0.5rem 0.75rem',
              color: '#9ca3af',
              fontSize: '0.875rem',
              cursor: 'not-allowed',
            }}
          />
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            Este é o e-mail usado para entrar na sua conta.
          </span>
        </div>

        {/* Field: Perfil de acesso (Read-only) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#d1d5db' }}>
            Perfil de acesso
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                padding: '0.2rem 0.625rem',
                borderRadius: '9999px',
                fontWeight: 700,
                fontSize: '0.75rem',
                letterSpacing: '0.05em',
                display: 'inline-block',
              }}
            >
              {role}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              Acesso administrativo irrestrito ao sistema.
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 2: Segurança */}
      <section
        aria-labelledby="section-security"
        style={{
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div style={{ borderBottom: '1px solid #374151', paddingBottom: '0.75rem' }}>
          <h2 id="section-security" style={{ fontSize: '1.125rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>
            Segurança
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#9ca3af', margin: '0.25rem 0 0' }}>
            Alteração de senha e credenciais de acesso ao painel.
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label
              htmlFor="newPasswordInput"
              style={{ fontSize: '0.875rem', fontWeight: 500, color: '#d1d5db' }}
            >
              Nova senha
            </label>
            <input
              id="newPasswordInput"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSavingPassword}
              placeholder="No mínimo 8 caracteres"
              style={{
                backgroundColor: '#111827',
                border: '1px solid #4b5563',
                borderRadius: '0.375rem',
                padding: '0.5rem 0.75rem',
                color: '#ffffff',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label
              htmlFor="confirmPasswordInput"
              style={{ fontSize: '0.875rem', fontWeight: 500, color: '#d1d5db' }}
            >
              Confirmar nova senha
            </label>
            <input
              id="confirmPasswordInput"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSavingPassword}
              placeholder="Repita a nova senha"
              style={{
                backgroundColor: '#111827',
                border: '1px solid #4b5563',
                borderRadius: '0.375rem',
                padding: '0.5rem 0.75rem',
                color: '#ffffff',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          {passwordFeedback && (
            <div
              role="status"
              style={{
                fontSize: '0.8125rem',
                fontWeight: 500,
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                backgroundColor: passwordFeedback.type === 'success' ? '#064e3b' : '#7f1d1d',
                border: `1px solid ${passwordFeedback.type === 'success' ? '#059669' : '#dc2626'}`,
                color: passwordFeedback.type === 'success' ? '#34d399' : '#f87171',
              }}
            >
              {passwordFeedback.message}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSavingPassword || !password || !confirmPassword}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '0.375rem',
                border: 'none',
                backgroundColor:
                  isSavingPassword || !password || !confirmPassword ? '#4b5563' : '#f59e0b',
                color:
                  isSavingPassword || !password || !confirmPassword ? '#9ca3af' : '#111827',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor:
                  isSavingPassword || !password || !confirmPassword ? 'not-allowed' : 'pointer',
                transition: 'background-color 150ms ease',
              }}
            >
              {isSavingPassword ? 'Alterando senha...' : 'Alterar senha'}
            </button>
          </div>
        </form>
      </section>

      {/* SECTION 3: Preferências */}
      <section
        aria-labelledby="section-preferences"
        style={{
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div style={{ borderBottom: '1px solid #374151', paddingBottom: '0.75rem' }}>
          <h2 id="section-preferences" style={{ fontSize: '1.125rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>
            Preferências
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#9ca3af', margin: '0.25rem 0 0' }}>
            Configurações regionais e de experiência no painel administrativo.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#d1d5db' }}>
            Idioma
          </span>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>
            Selecione o idioma de preferência para os textos da interface administrativa.
          </p>
          <div style={{ marginTop: '0.25rem' }}>
            <LanguageSelector compact={false} variant="popover" theme="dark" showLabel={true} />
          </div>
        </div>
      </section>
    </div>
  )
}
