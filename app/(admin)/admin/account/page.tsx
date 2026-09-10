import { requireAdmin } from '@/modules/moderation/guards'
import { createServerClient } from '@/lib/supabase/server'
import { AdminAccountForm } from '@/components/admin/account/admin-account-form'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Minha conta — Painel Administrativo',
  robots: 'noindex, nofollow',
}

export default async function AdminAccountPage() {
  // 1. Strict Server-side Admin Authorization Boundary
  await requireAdmin()

  // 2. Resolve authenticated user identity safely from Supabase Auth session
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const rawName = user?.user_metadata?.name || user?.user_metadata?.full_name || null
  const initialName = typeof rawName === 'string' && rawName.trim().length > 0 ? rawName.trim() : ''
  const email = user?.email || ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <div
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: '#f59e0b',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '0.375rem',
          }}
        >
          CONTA
        </div>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: '#ffffff',
            margin: '0 0 0.5rem',
            letterSpacing: '-0.02em',
          }}
        >
          Minha conta
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0, maxWidth: '640px' }}>
          Gerencie as informações básicas da sua conta e suas preferências de acesso.
        </p>
      </div>

      {/* Account Management Surface */}
      <AdminAccountForm initialName={initialName} email={email} role="ADMIN" />
    </div>
  )
}
