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
import { getProfileByAccountUserId } from '@/modules/profiles/dal'

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

const PROFILE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho em preenchimento',
  READY_FOR_REVIEW: 'Dados completos (Pronto para fotos)',
  ACTIVE: 'Publicado',
  PAUSED: 'Pausado',
  SUSPENDED: 'Suspenso',
}

export default async function DashboardPage() {
  const [user, account] = await Promise.all([getSession(), getAccount()])
  const [verification, profile] = await Promise.all([
    account ? getVerificationSafe(account.id) : null,
    account ? getProfileByAccountUserId(account.id) : null,
  ])

  const isKycVerified = verification?.status === 'VERIFIED'

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

      {isKycVerified && (
        <div className="dashboard-section">
          <span className="dashboard-label">Perfil Profissional:</span>
          <span className="dashboard-value">
            {profile
              ? (PROFILE_STATUS_LABELS[profile.status] ?? profile.status)
              : 'Não iniciado'}
          </span>
        </div>
      )}

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

          {!isKycVerified ? (
            <Link
              href="/onboarding/verification"
              className="btn btn--primary block text-center"
            >
              {verification?.status === 'REJECTED'
                ? 'Tentar Verificação Novamente'
                : 'Verificar Identidade & Maioridade'}
            </Link>
          ) : !profile ? (
            <Link
              href="/onboarding/profile"
              className="btn btn--primary block text-center"
            >
              Criar Perfil Profissional
            </Link>
          ) : profile.status === 'DRAFT' ? (
            <Link
              href="/onboarding/profile"
              className="btn btn--primary block text-center"
            >
              Continuar Preenchimento do Perfil
            </Link>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-emerald-600 font-medium">
                ✓ Dados do perfil profissional concluídos ({profile.stage_name}).
              </p>
              <Link
                href="/dashboard/photos"
                className="btn btn--primary block text-center"
              >
                Gerenciar Fotos do Anúncio (FASE 05)
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard/analytics"
                  className="btn btn--secondary block text-center text-xs py-2"
                >
                  📊 Ver Métricas
                </Link>
                <Link
                  href="/dashboard/boosts"
                  className="btn btn--secondary block text-center text-xs py-2"
                >
                  🚀 Destaques
                </Link>
              </div>
              <Link
                href="/onboarding/profile"
                className="btn btn--ghost block text-center text-xs"
              >
                Editar Informações do Perfil
              </Link>
            </div>
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
