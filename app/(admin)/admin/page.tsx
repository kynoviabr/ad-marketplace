import Link from 'next/link'
import { requireAdmin } from '@/modules/moderation/guards'
import { getAdminOperationsOverview } from '@/modules/admin/dal'
import { getTranslations } from '@/lib/i18n/server'
import { formatDate } from '@/lib/i18n/format'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Operações — Painel Administrativo',
  robots: 'noindex, nofollow',
}

export default async function AdminOperationsPage() {
  await requireAdmin()
  const { locale } = await getTranslations()
  const isPt = locale === 'pt-BR'

  const overview = await getAdminOperationsOverview()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <header>
        <p style={{ color: '#f59e0b', fontSize: '.75rem', textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 .25rem' }}>
          {isPt ? 'OPERAÇÕES VELVET.' : 'VELVET. OPERATIONS'}
        </p>
        <h1 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 700, margin: '0 0 .5rem' }}>
          {isPt ? 'Centro de Operações Administrativas' : 'Administrative Operations Center'}
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '.875rem', margin: 0 }}>
          {isPt
            ? 'Monitor operacional em tempo real para moderação, triagem e controle de acesso.'
            : 'Real-time operational monitor for moderation, triage, and access control.'}
        </p>
      </header>

      {/* Real Count Metric Summary Cards */}
      <section
        aria-label={isPt ? 'Métricas operacionais' : 'Operational metrics'}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}
      >
        <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '.5rem', padding: '1rem' }}>
          <span style={{ color: '#9ca3af', fontSize: '.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
            {isPt ? 'Perfis requerendo atenção' : 'Profiles requiring attention'}
          </span>
          <strong style={{ display: 'block', color: overview.profilesRequiringAttention.count > 0 ? '#f59e0b' : '#fff', fontSize: '1.75rem', marginTop: '.35rem' }}>
            {overview.profilesRequiringAttention.count}
          </strong>
          <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>
            {isPt ? 'Aguardando revisão ou sinalizados' : 'Awaiting review or flagged'}
          </span>
        </div>

        <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '.5rem', padding: '1rem' }}>
          <span style={{ color: '#9ca3af', fontSize: '.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
            {isPt ? 'Mídias pendentes' : 'Pending media'}
          </span>
          <strong style={{ display: 'block', color: overview.mediaRequiringAttention.totalCount > 0 ? '#f59e0b' : '#fff', fontSize: '1.75rem', marginTop: '.35rem' }}>
            {overview.mediaRequiringAttention.totalCount}
          </strong>
          <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>
            {overview.mediaRequiringAttention.photosCount} {isPt ? 'fotos' : 'photos'} · {overview.mediaRequiringAttention.videosCount} {isPt ? 'vídeos' : 'videos'}
          </span>
        </div>

        <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '.5rem', padding: '1rem' }}>
          <span style={{ color: '#9ca3af', fontSize: '.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
            {isPt ? 'Perfis suspensos' : 'Suspended profiles'}
          </span>
          <strong style={{ display: 'block', color: overview.suspendedProfiles.count > 0 ? '#ef4444' : '#fff', fontSize: '1.75rem', marginTop: '.35rem' }}>
            {overview.suspendedProfiles.count}
          </strong>
          <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>
            {isPt ? 'Bloqueados administrativamente' : 'Administratively blocked'}
          </span>
        </div>

        <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '.5rem', padding: '1rem' }}>
          <span style={{ color: '#9ca3af', fontSize: '.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
            {isPt ? 'Ações recentes' : 'Recent actions'}
          </span>
          <strong style={{ display: 'block', color: '#fff', fontSize: '1.75rem', marginTop: '.35rem' }}>
            {overview.recentActivity.length}
          </strong>
          <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>
            {isPt ? 'Últimos eventos registrados' : 'Latest recorded events'}
          </span>
        </div>
      </section>

      {/* Grid: Profiles Requiring Attention & Media Requiring Attention */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem' }}>
        {/* Section 1: Profiles Requiring Attention */}
        <section
          style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '.5rem', padding: '1.25rem' }}
          aria-labelledby="profiles-attention-title"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 id="profiles-attention-title" style={{ color: '#fff', fontSize: '1.1rem', margin: 0 }}>
                {isPt ? 'Perfis que requerem atenção' : 'Profiles requiring attention'}
              </h2>
              <span style={{ color: '#9ca3af', fontSize: '.8rem' }}>
                {overview.profilesRequiringAttention.count} {isPt ? 'no total' : 'total'}
              </span>
            </div>
            <Link
              href="/admin/profiles"
              style={{ color: '#93c5fd', fontSize: '.875rem', textDecoration: 'none', fontWeight: 500 }}
            >
              {isPt ? 'Ver fila completa →' : 'View full queue →'}
            </Link>
          </div>

          {overview.profilesRequiringAttention.items.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '.875rem', fontStyle: 'italic', margin: '1rem 0' }}>
              {isPt ? 'Nenhum perfil requer atenção no momento.' : 'No profiles currently require attention.'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem', color: '#d1d5db' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #374151', textAlign: 'left' }}>
                    <th style={{ padding: '.5rem .75rem', color: '#9ca3af', fontWeight: 600 }}>{isPt ? 'Profissional' : 'Professional'}</th>
                    <th style={{ padding: '.5rem .75rem', color: '#9ca3af', fontWeight: 600 }}>{isPt ? 'Status' : 'Status'}</th>
                    <th style={{ padding: '.5rem .75rem', color: '#9ca3af', fontWeight: 600 }}>{isPt ? 'Moderação' : 'Moderation'}</th>
                    <th style={{ padding: '.5rem .75rem', textAlign: 'right', color: '#9ca3af', fontWeight: 600 }}>{isPt ? 'Ação' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.profilesRequiringAttention.items.map((p) => (
                    <tr key={p.profileId} style={{ borderBottom: '1px solid #283548' }}>
                      <td style={{ padding: '.65rem .75rem', color: '#fff', fontWeight: 500 }}>
                        {p.stageName}
                      </td>
                      <td style={{ padding: '.65rem .75rem' }}>
                        <span style={{
                          fontSize: '.75rem',
                          padding: '.2rem .5rem',
                          borderRadius: '.25rem',
                          background: p.profileStatus === 'READY_FOR_REVIEW' ? '#854d0e' : '#374151',
                          color: p.profileStatus === 'READY_FOR_REVIEW' ? '#fef08a' : '#d1d5db',
                        }}>
                          {p.profileStatus}
                        </span>
                      </td>
                      <td style={{ padding: '.65rem .75rem' }}>
                        <span style={{
                          fontSize: '.75rem',
                          padding: '.2rem .5rem',
                          borderRadius: '.25rem',
                          background: p.contentModerationStatus === 'FLAGGED' ? '#991b1b' : '#374151',
                          color: p.contentModerationStatus === 'FLAGGED' ? '#fecaca' : '#d1d5db',
                        }}>
                          {p.contentModerationStatus}
                        </span>
                      </td>
                      <td style={{ padding: '.65rem .75rem', textAlign: 'right' }}>
                        <Link
                          href={`/admin/profiles?profile=${p.profileId}`}
                          style={{ color: '#f59e0b', textDecoration: 'none', fontWeight: 600 }}
                        >
                          {isPt ? 'Revisar' : 'Review'} ↗
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Section 2: Media Requiring Attention */}
        <section
          style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '.5rem', padding: '1.25rem' }}
          aria-labelledby="media-attention-title"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 id="media-attention-title" style={{ color: '#fff', fontSize: '1.1rem', margin: 0 }}>
                {isPt ? 'Mídias aguardando moderação' : 'Media awaiting moderation'}
              </h2>
              <span style={{ color: '#9ca3af', fontSize: '.8rem' }}>
                {overview.mediaRequiringAttention.totalCount} {isPt ? 'itens pendentes' : 'pending items'}
              </span>
            </div>
            <Link
              href="/admin/moderation"
              style={{ color: '#93c5fd', fontSize: '.875rem', textDecoration: 'none', fontWeight: 500 }}
            >
              {isPt ? 'Ir para moderação →' : 'Go to moderation →'}
            </Link>
          </div>

          {overview.mediaRequiringAttention.items.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '.875rem', fontStyle: 'italic', margin: '1rem 0' }}>
              {isPt ? 'Nenhuma mídia aguardando moderação no momento.' : 'No media currently awaiting moderation.'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem', color: '#d1d5db' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #374151', textAlign: 'left' }}>
                    <th style={{ padding: '.5rem .75rem', color: '#9ca3af', fontWeight: 600 }}>{isPt ? 'Tipo' : 'Type'}</th>
                    <th style={{ padding: '.5rem .75rem', color: '#9ca3af', fontWeight: 600 }}>ID</th>
                    <th style={{ padding: '.5rem .75rem', color: '#9ca3af', fontWeight: 600 }}>{isPt ? 'Enviado em' : 'Submitted at'}</th>
                    <th style={{ padding: '.5rem .75rem', textAlign: 'right', color: '#9ca3af', fontWeight: 600 }}>{isPt ? 'Ação' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.mediaRequiringAttention.items.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #283548' }}>
                      <td style={{ padding: '.65rem .75rem' }}>
                        <span style={{
                          fontSize: '.75rem',
                          padding: '.2rem .5rem',
                          borderRadius: '.25rem',
                          background: m.type === 'VIDEO' ? '#1e3a8a' : '#065f46',
                          color: '#fff',
                          fontWeight: 600,
                        }}>
                          {m.type === 'VIDEO' ? (isPt ? 'VÍDEO' : 'VIDEO') : (isPt ? 'FOTO' : 'PHOTO')}
                        </span>
                      </td>
                      <td style={{ padding: '.65rem .75rem', fontFamily: 'monospace', fontSize: '.8rem', color: '#9ca3af' }}>
                        {m.id.slice(0, 8)}…
                      </td>
                      <td style={{ padding: '.65rem .75rem', fontSize: '.8rem' }}>
                        {formatDate(m.createdAt, locale, { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '.65rem .75rem', textAlign: 'right' }}>
                        <Link
                          href="/admin/moderation"
                          style={{ color: '#f59e0b', textDecoration: 'none', fontWeight: 600 }}
                        >
                          {isPt ? 'Moderar' : 'Moderate'} ↗
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Grid: Suspended Profiles & Recent Administrative Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem' }}>
        {/* Section 3: Suspended Profiles */}
        <section
          style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '.5rem', padding: '1.25rem' }}
          aria-labelledby="suspended-profiles-title"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 id="suspended-profiles-title" style={{ color: '#fff', fontSize: '1.1rem', margin: 0 }}>
                {isPt ? 'Perfis suspensos' : 'Suspended profiles'}
              </h2>
              <span style={{ color: '#9ca3af', fontSize: '.8rem' }}>
                {overview.suspendedProfiles.count} {isPt ? 'perfis suspensos' : 'suspended profiles'}
              </span>
            </div>
            <Link
              href="/admin/profiles"
              style={{ color: '#93c5fd', fontSize: '.875rem', textDecoration: 'none', fontWeight: 500 }}
            >
              {isPt ? 'Gerenciar →' : 'Manage →'}
            </Link>
          </div>

          {overview.suspendedProfiles.items.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '.875rem', fontStyle: 'italic', margin: '1rem 0' }}>
              {isPt ? 'Nenhum perfil suspenso no momento.' : 'No profiles are currently suspended.'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem', color: '#d1d5db' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #374151', textAlign: 'left' }}>
                    <th style={{ padding: '.5rem .75rem', color: '#9ca3af', fontWeight: 600 }}>{isPt ? 'Profissional' : 'Professional'}</th>
                    <th style={{ padding: '.5rem .75rem', color: '#9ca3af', fontWeight: 600 }}>{isPt ? 'Status' : 'Status'}</th>
                    <th style={{ padding: '.5rem .75rem', color: '#9ca3af', fontWeight: 600 }}>{isPt ? 'Atualizado em' : 'Updated at'}</th>
                    <th style={{ padding: '.5rem .75rem', textAlign: 'right', color: '#9ca3af', fontWeight: 600 }}>{isPt ? 'Ação' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.suspendedProfiles.items.map((s) => (
                    <tr key={s.profileId} style={{ borderBottom: '1px solid #283548' }}>
                      <td style={{ padding: '.65rem .75rem', color: '#fff', fontWeight: 500 }}>
                        {s.stageName}
                      </td>
                      <td style={{ padding: '.65rem .75rem' }}>
                        <span style={{
                          fontSize: '.75rem',
                          padding: '.2rem .5rem',
                          borderRadius: '.25rem',
                          background: '#7f1d1d',
                          color: '#fecaca',
                          fontWeight: 600,
                        }}>
                          SUSPENDED
                        </span>
                      </td>
                      <td style={{ padding: '.65rem .75rem', fontSize: '.8rem' }}>
                        {formatDate(s.updatedAt, locale, { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '.65rem .75rem', textAlign: 'right' }}>
                        <Link
                          href={`/admin/professionals/${s.accountUserId}`}
                          style={{ color: '#93c5fd', textDecoration: 'none', fontWeight: 600 }}
                        >
                          {isPt ? 'Detalhes' : 'Details'} ↗
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Section 4: Recent Administrative Activity */}
        <section
          style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '.5rem', padding: '1.25rem' }}
          aria-labelledby="recent-activity-title"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 id="recent-activity-title" style={{ color: '#fff', fontSize: '1.1rem', margin: 0 }}>
                {isPt ? 'Atividade administrativa recente' : 'Recent administrative activity'}
              </h2>
              <span style={{ color: '#9ca3af', fontSize: '.8rem' }}>
                {isPt ? 'Registro em tempo real de auditoria' : 'Real-time audit log'}
              </span>
            </div>
          </div>

          {overview.recentActivity.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '.875rem', fontStyle: 'italic', margin: '1rem 0' }}>
              {isPt ? 'Nenhum registro de atividade administrativa recente.' : 'No recent administrative activity recorded.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
              {overview.recentActivity.map((act) => (
                <div
                  key={act.id}
                  style={{
                    background: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '.375rem',
                    padding: '.75rem .9rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: '.875rem' }}>
                      {act.action}
                    </span>
                    <time style={{ color: '#9ca3af', fontSize: '.75rem' }}>
                      {formatDate(act.timestamp, locale, { dateStyle: 'short', timeStyle: 'short' })}
                    </time>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', color: '#9ca3af' }}>
                    <span>{act.subject}</span>
                    {act.notes ? <span style={{ fontStyle: 'italic', maxWidth: '50%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>&ldquo;{act.notes}&rdquo;</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
