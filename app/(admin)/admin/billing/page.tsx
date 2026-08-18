import { requireAdmin } from '@/modules/moderation/guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { BillingOverview } from '@/components/admin/billing-overview'
import { OverrideForm, type BillingOverrideItem } from '@/components/admin/override-form'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Gestão de Assinaturas — Painel Administrativo',
  robots: 'noindex, nofollow',
}

export default async function AdminBillingPage() {
  await requireAdmin()

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const [
    { count: activeCount },
    { count: pastDueCount },
    { count: graceCount },
    { count: expiredCount },
    { count: incompleteCount },
    { count: overridesCount },
    { data: activeOverrides },
    { data: recentSubscriptions },
  ] = await Promise.all([
    admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'PAST_DUE'),
    admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'GRACE_PERIOD'),
    admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'EXPIRED'),
    admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'INCOMPLETE'),
    admin
      .from('billing_overrides')
      .select('*', { count: 'exact', head: true })
      .is('revoked_at', null)
      .or(`expires_at.is.null,expires_at.gt.${now}`),
    admin
      .from('billing_overrides')
      .select('*')
      .is('revoked_at', null)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false })
      .limit(25),
    admin
      .from('subscriptions')
      .select(`
        id,
        account_user_id,
        status,
        provider,
        cancel_at_period_end,
        current_period_end,
        created_at,
        subscription_plans (
          name,
          code
        ),
        plan_prices (
          amount_minor,
          currency,
          billing_interval
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const stats = {
    totalActive: activeCount ?? 0,
    totalTrialing: incompleteCount ?? 0,
    totalPastDue: (pastDueCount ?? 0) + (graceCount ?? 0),
    totalExpired: expiredCount ?? 0,
    totalOverrides: overridesCount ?? 0,
  }

  const overridesList: BillingOverrideItem[] = (activeOverrides ?? []).map((o) => ({
    id: o.id,
    account_user_id: o.account_user_id,
    reason: o.reason,
    granted_by: o.granted_by,
    expires_at: o.expires_at,
    revoked_at: o.revoked_at,
    created_at: o.created_at,
  }))

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleString('pt-BR')
    } catch {
      return dateStr
    }
  }

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { bg: '#064e3b', color: '#a7f3d0', border: '#10b981' }
      case 'PAST_DUE':
      case 'GRACE_PERIOD':
        return { bg: '#78350f', color: '#fde68a', border: '#f59e0b' }
      case 'EXPIRED':
        return { bg: '#7f1d1d', color: '#fecaca', border: '#ef4444' }
      default:
        return { bg: '#374151', color: '#d1d5db', border: '#6b7280' }
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '0.5rem' }}>
          Gestão de Assinaturas & Cobrança
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
          Monitore o estado financeiro da plataforma, assinaturas ativas e conceda isenções manuais.
        </p>
      </div>

      <BillingOverview stats={stats} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '2.5rem' }}>
        <OverrideForm accountUserId="" initialOverrides={overridesList} />
      </div>

      <div style={{ backgroundColor: '#1f2937', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #374151' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#ffffff', marginBottom: '1rem' }}>
          Últimas Assinaturas Registradas
        </h3>

        {!recentSubscriptions || recentSubscriptions.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: 0 }}>
            Nenhuma assinatura encontrada.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#111827', color: '#9ca3af', borderBottom: '1px solid #374151' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>ID do Anunciante</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Plano</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Provedor</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Fim do Período</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Criada em</th>
                </tr>
              </thead>
              <tbody>
                {recentSubscriptions.map((sub: any) => {
                  const badgeStyle = getStatusBadgeStyle(sub.status)
                  const planName = sub.subscription_plans?.name || '—'

                  return (
                    <tr
                      key={sub.id}
                      style={{ borderBottom: '1px solid #374151' }}
                    >
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#d1d5db', fontSize: '0.8125rem' }}>
                        {sub.account_user_id}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#ffffff', fontWeight: 500 }}>
                        {planName}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#9ca3af' }}>
                        {sub.provider ? sub.provider.toUpperCase() : 'LANÇAMENTO (GRÁTIS)'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span
                          style={{
                            backgroundColor: badgeStyle.bg,
                            color: badgeStyle.color,
                            border: `1px solid ${badgeStyle.border}`,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '9999px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#9ca3af', fontSize: '0.8125rem' }}>
                        {formatDate(sub.current_period_end)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#9ca3af', fontSize: '0.8125rem' }}>
                        {formatDate(sub.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
