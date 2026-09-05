import Link from 'next/link'
import { requireAdmin } from '@/modules/moderation/guards'
import { getSystemHealthSnapshot, type SystemHealthSnapshot } from '@/modules/observability/health'
import { generateRequestId } from '@/modules/observability/request-id'
import { getTranslations } from '@/lib/i18n/server'
import { HealthDashboard } from '@/components/admin/health/health-dashboard'
import { logger } from '@/modules/observability/logger'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Saúde do Sistema — Painel Administrativo',
  robots: 'noindex, nofollow',
}

export default async function AdminHealthPage() {
  // 1. Strict Server-side Admin Authorization Boundary
  await requireAdmin()

  const { locale } = await getTranslations()
  const isPt = locale === 'pt-BR'
  const correlationId = generateRequestId()

  let snapshot: SystemHealthSnapshot | null = null

  try {
    // 2. Obtain canonical platform health snapshot (exactly once per page load)
    snapshot = await getSystemHealthSnapshot({
      correlationId,
      timeoutMs: 4000,
    })
  } catch (error: unknown) {
    // 3. Safe server-side structured logging
    logger.error('admin.health.page_failed', {
      subsystem: 'SYSTEM',
      requestId: correlationId,
      outcome: 'FAILURE',
      error,
    })
  }

  // 4. Safe operator-facing error UI in case of unexpected evaluator failure
  if (!snapshot) {
    return (
      <div
        role="alert"
        style={{
          backgroundColor: '#1f2937',
          border: '1px solid #b91c1c',
          borderRadius: '0.5rem',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem', color: '#f87171' }}>✕</span>
          <h1 style={{ color: '#ffffff', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
            {isPt ? 'Falha na Avaliação de Saúde do Sistema' : 'System Health Assessment Failed'}
          </h1>
        </div>

        <p style={{ color: '#e5e7eb', margin: 0, fontSize: '0.95rem' }}>
          {isPt
            ? 'Ocorreu um erro interno inesperado durante a execução das sondas de subsistema. Nenhuma informação confidencial foi exposta.'
            : 'An unexpected internal error occurred while executing subsystem probes. No sensitive information has been exposed.'}
        </p>

        <div style={{ backgroundColor: '#111827', padding: '0.75rem 1rem', borderRadius: '0.375rem', fontSize: '0.8rem', color: '#9ca3af' }}>
          <strong style={{ color: '#d1d5db' }}>{isPt ? 'ID de Correlação' : 'Correlation ID'}: </strong>
          <span style={{ fontFamily: 'monospace' }}>{correlationId}</span>
        </div>

        <div>
          <Link
            href="/admin/health"
            style={{
              display: 'inline-block',
              backgroundColor: '#f59e0b',
              color: '#111827',
              fontWeight: 700,
              fontSize: '0.875rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              textDecoration: 'none',
            }}
          >
            {isPt ? 'Tentar Novamente' : 'Try Again'}
          </Link>
        </div>
      </div>
    )
  }

  return <HealthDashboard initialSnapshot={snapshot} locale={locale} />
}
