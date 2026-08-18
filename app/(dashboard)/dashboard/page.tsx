/**
 * Dashboard page — FASE 01
 *
 * Minimal authenticated area. Shows account status and onboarding state.
 * No analytics, no cards, no photos — strictly FASE 01 scope.
 *
 * This is a Server Component. Data is fetched server-side.
 * Authorization is enforced by the parent layout (requireAccount).
 */

import { getAccount, getSession } from '@/modules/auth/dal'
import { logoutAction, startOnboardingFormAction } from '@/modules/auth/actions'

import Link from 'next/link'
import { getVerificationSafe } from '@/modules/verification/dal'

export const metadata = {
  title: 'Dashboard — AD-Marketplace',
  robots: 'noindex, nofollow',
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativa',
  SUSPENDED: 'Suspensa',
  DELETED: 'Excluída',
}

const ONBOARDING_LABELS: Record<string, string> = {
  NOT_STARTED: 'Não iniciado',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluído',
}

const VERIFICATION_LABELS: Record<string, string> = {
  NOT_STARTED: 'Não iniciada',
  PENDING: 'Iniciada (aguardando)',
  IN_PROGRESS: 'Em andamento',
  IN_REVIEW: 'Em análise manual',
  VERIFIED: 'Aprovada (Identidade & 18+ confirmados)',
  REJECTED: 'Não aprovada',
  EXPIRED: 'Expirada',
}

export default async function DashboardPage() {
  const [user, account] = await Promise.all([getSession(), getAccount()])
  const verification = account ? await getVerificationSafe(account.id) : null

  return (
    <div className="dashboard-card">
      <h1 className="dashboard-title">AD-Marketplace</h1>

      <p className="dashboard-greeting">
        Olá{user?.email ? `, ${user.email}` : ''}
      </p>

      <div className="dashboard-section">
        <span className="dashboard-label">Status da conta:</span>
        <span className="dashboard-value">
          {account ? (STATUS_LABELS[account.status] ?? account.status) : '—'}
        </span>
      </div>

      <div className="dashboard-section">
        <span className="dashboard-label">Onboarding:</span>
        <span className="dashboard-value">
          {account
            ? (ONBOARDING_LABELS[account.onboarding_status] ?? account.onboarding_status)
            : '—'}
        </span>
      </div>

      <div className="dashboard-section">
        <span className="dashboard-label">Verificação (KYC):</span>
        <span className="dashboard-value">
          {verification
            ? (VERIFICATION_LABELS[verification.status] ?? verification.status)
            : 'Não iniciada'}
        </span>
      </div>

      {account?.onboarding_status === 'NOT_STARTED' && (
        <form action={startOnboardingFormAction}>
          <button type="submit" className="btn btn--primary">
            Começar
          </button>
        </form>
      )}

      {account?.onboarding_status === 'IN_PROGRESS' && (
        <div className="space-y-3 my-4">
          <p className="dashboard-note">
            Onboarding em andamento (etapa {account.onboarding_step}).
          </p>
          {verification?.status !== 'VERIFIED' ? (
            <Link
              href="/onboarding/verification"
              className="btn btn--primary block text-center"
            >
              {verification?.status === 'REJECTED'
                ? 'Tentar Verificação Novamente'
                : 'Verificar Identidade & Maioridade'}
            </Link>
          ) : (
            <p className="text-sm text-emerald-600 font-medium">
              ✓ Identidade e maioridade aprovadas. Aguardando fase de Perfil (FASE 03).
            </p>
          )}
        </div>
      )}

      <form action={logoutAction} className="dashboard-logout">
        <button type="submit" className="btn btn--ghost">
          Sair
        </button>
      </form>
    </div>
  )
}
