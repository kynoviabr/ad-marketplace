import Link from 'next/link'
import { requireAdmin } from '@/modules/moderation/guards'
import { getAdminProfileQueue, getAdminProfessionalSummary } from '@/modules/admin/dal'
import { getOperationalStatusLabel } from '@/modules/admin/operational-status'
import type { AdminProfileQueueFilter, OperationalClassification } from '@/modules/admin/types'
import { getTranslations } from '@/lib/i18n/server'
import { formatDate } from '@/lib/i18n/format'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Fila de Perfis — Painel Administrativo',
  robots: 'noindex, nofollow',
}

interface PageProps {
  searchParams: Promise<{
    filter?: string
    q?: string
    page?: string
    detail?: string
  }>
}

function getBadgeStyle(classification: OperationalClassification): React.CSSProperties {
  switch (classification) {
    case 'NEEDS_REVIEW':
      return { backgroundColor: '#78350f', color: '#fde68a', border: '1px solid #b45309' }
    case 'ACTIVE':
      return { backgroundColor: '#064e3b', color: '#a7f3d0', border: '1px solid #059669' }
    case 'PAUSED':
      return { backgroundColor: '#374151', color: '#d1d5db', border: '1px solid #4b5563' }
    case 'SUSPENDED':
      return { backgroundColor: '#7f1d1d', color: '#fecaca', border: '1px solid #b91c1c' }
    case 'BLOCKED_OR_INELIGIBLE':
      return { backgroundColor: '#4c1d95', color: '#ddd6fe', border: '1px solid #7c3aed' }
  }
}

function buildQueryString(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      sp.set(key, String(value))
    }
  }
  const str = sp.toString()
  return str ? `?${str}` : ''
}

export default async function AdminProfilesReviewPage({ searchParams }: PageProps) {
  await requireAdmin()

  const { locale, t } = await getTranslations()
  const isPt = locale === 'pt-BR'

  const resolvedParams = await searchParams
  const rawFilter = resolvedParams.filter?.toUpperCase()
  const validFilters: AdminProfileQueueFilter[] = [
    'ALL',
    'NEEDS_REVIEW',
    'SUSPENDED',
    'PAUSED',
    'BLOCKED_OR_INELIGIBLE',
  ]
  const currentFilter: AdminProfileQueueFilter = validFilters.includes(rawFilter as AdminProfileQueueFilter)
    ? (rawFilter as AdminProfileQueueFilter)
    : 'ALL'

  const currentSearch = resolvedParams.q?.trim() || ''
  const currentPage = Math.max(1, Number(resolvedParams.page) || 1)
  const detailProfileId = resolvedParams.detail?.trim() || null

  const queueResult = await getAdminProfileQueue({
    filter: currentFilter,
    search: currentSearch,
    page: currentPage,
    pageSize: 10,
  })

  // Safe detail inspection if requested
  const safeDetail = detailProfileId ? await getAdminProfessionalSummary(detailProfileId) : null

  const filterTabs: Array<{ key: AdminProfileQueueFilter; label: string }> = [
    { key: 'ALL', label: t('admin.allOperational') },
    { key: 'NEEDS_REVIEW', label: t('admin.needsReview') },
    { key: 'SUSPENDED', label: t('admin.suspended') },
    { key: 'PAUSED', label: t('admin.paused') },
    { key: 'BLOCKED_OR_INELIGIBLE', label: t('admin.blockedOrIneligible') },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.25rem' }}>
          <p style={{ color: '#f59e0b', fontSize: '.75rem', textTransform: 'uppercase', letterSpacing: '.08em', margin: 0 }}>
            {isPt ? 'OPERAÇÕES VELVET.' : 'VELVET. OPERATIONS'}
          </p>
          <span style={{ backgroundColor: '#374151', color: '#9ca3af', fontSize: '.7rem', padding: '0.1rem .4rem', borderRadius: '4px' }}>
            ADMIN ONLY
          </span>
        </div>
        <h1 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 700, margin: '0 0 .5rem' }}>
          {t('admin.profileQueueTitle')}
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '.875rem', margin: 0 }}>
          {t('admin.profileQueueSubtitle')} {t('admin.noSensitiveData')}
        </p>
      </header>

      {/* Search and Filters Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Search Input */}
        <form
          method="GET"
          action="/admin/profiles/review"
          style={{ display: 'flex', gap: '.5rem', maxWidth: '600px' }}
        >
          {currentFilter !== 'ALL' && <input type="hidden" name="filter" value={currentFilter} />}
          <input
            type="text"
            name="q"
            defaultValue={currentSearch}
            placeholder={t('admin.searchByName')}
            style={{
              flex: 1,
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '.375rem',
              color: '#fff',
              padding: '.5rem .75rem',
              fontSize: '.875rem',
            }}
          />
          <button
            type="submit"
            style={{
              backgroundColor: '#f59e0b',
              color: '#111827',
              fontWeight: 600,
              padding: '.5rem 1rem',
              borderRadius: '.375rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '.875rem',
            }}
          >
            {isPt ? 'Buscar' : 'Search'}
          </button>
          {currentSearch && (
            <Link
              href={`/admin/profiles/review${buildQueryString({ filter: currentFilter !== 'ALL' ? currentFilter : undefined })}`}
              style={{
                backgroundColor: '#374151',
                color: '#d1d5db',
                padding: '.5rem .75rem',
                borderRadius: '.375rem',
                textDecoration: 'none',
                fontSize: '.875rem',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {isPt ? 'Limpar' : 'Clear'}
            </Link>
          )}
        </form>

        {/* Filter Tabs */}
        <nav
          aria-label={isPt ? 'Filtros da fila' : 'Queue filters'}
          style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}
        >
          {filterTabs.map((tab) => {
            const isActive = currentFilter === tab.key
            return (
              <Link
                key={tab.key}
                href={`/admin/profiles/review${buildQueryString({
                  filter: tab.key !== 'ALL' ? tab.key : undefined,
                  q: currentSearch || undefined,
                })}`}
                style={{
                  color: isActive ? '#111827' : '#d1d5db',
                  backgroundColor: isActive ? '#f59e0b' : '#1f2937',
                  border: '1px solid #4b5563',
                  borderRadius: '.375rem',
                  padding: '.5rem .75rem',
                  textDecoration: 'none',
                  fontSize: '.8rem',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Safe Detail Inspection Drawer / Modal */}
      {safeDetail && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="safe-detail-title"
          style={{
            backgroundColor: '#111827',
            border: '2px solid #f59e0b',
            borderRadius: '.5rem',
            padding: '1.5rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <p style={{ color: '#f59e0b', fontSize: '.75rem', textTransform: 'uppercase', letterSpacing: '.08em', margin: 0 }}>
                {t('admin.safeProfileDetail')}
              </p>
              <h2 id="safe-detail-title" style={{ color: '#fff', fontSize: '1.5rem', margin: '.25rem 0 0' }}>
                {safeDetail.stageName}
              </h2>
            </div>
            <Link
              href={`/admin/profiles/review${buildQueryString({
                filter: currentFilter !== 'ALL' ? currentFilter : undefined,
                q: currentSearch || undefined,
                page: currentPage > 1 ? currentPage : undefined,
              })}`}
              style={{
                backgroundColor: '#374151',
                color: '#fff',
                padding: '.375rem .75rem',
                borderRadius: '.375rem',
                textDecoration: 'none',
                fontSize: '.8rem',
              }}
            >
              ✕ {t('admin.close')}
            </Link>
          </div>

          <div
            style={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '.375rem',
              padding: '.75rem 1rem',
              marginBottom: '1rem',
              color: '#9ca3af',
              fontSize: '.8rem',
            }}
          >
            🛡️ {t('admin.safeProfileDisclaimer')}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', fontSize: '.875rem' }}>
            <div style={{ backgroundColor: '#1f2937', padding: '.75rem', borderRadius: '.375rem' }}>
              <span style={{ color: '#9ca3af', fontSize: '.75rem', textTransform: 'uppercase' }}>ID do Perfil</span>
              <p style={{ color: '#fff', margin: '.25rem 0 0', fontFamily: 'monospace', fontSize: '.8rem' }}>{safeDetail.profileId}</p>
            </div>
            <div style={{ backgroundColor: '#1f2937', padding: '.75rem', borderRadius: '.375rem' }}>
              <span style={{ color: '#9ca3af', fontSize: '.75rem', textTransform: 'uppercase' }}>Status do Perfil</span>
              <p style={{ color: '#fff', margin: '.25rem 0 0', fontWeight: 600 }}>{safeDetail.profileStatus}</p>
            </div>
            <div style={{ backgroundColor: '#1f2937', padding: '.75rem', borderRadius: '.375rem' }}>
              <span style={{ color: '#9ca3af', fontSize: '.75rem', textTransform: 'uppercase' }}>Status de Verificação</span>
              <p style={{ color: '#fff', margin: '.25rem 0 0', fontWeight: 600 }}>{safeDetail.verificationStatus}</p>
            </div>
            <div style={{ backgroundColor: '#1f2937', padding: '.75rem', borderRadius: '.375rem' }}>
              <span style={{ color: '#9ca3af', fontSize: '.75rem', textTransform: 'uppercase' }}>Status da Conta</span>
              <p style={{ color: '#fff', margin: '.25rem 0 0', fontWeight: 600 }}>{safeDetail.accountStatus}</p>
            </div>
            <div style={{ backgroundColor: '#1f2937', padding: '.75rem', borderRadius: '.375rem' }}>
              <span style={{ color: '#9ca3af', fontSize: '.75rem', textTransform: 'uppercase' }}>Estado de Publicação</span>
              <p style={{ color: '#fff', margin: '.25rem 0 0', fontWeight: 600 }}>{safeDetail.publicationState}</p>
            </div>
            <div style={{ backgroundColor: '#1f2937', padding: '.75rem', borderRadius: '.375rem' }}>
              <span style={{ color: '#9ca3af', fontSize: '.75rem', textTransform: 'uppercase' }}>Localização Principal</span>
              <p style={{ color: '#fff', margin: '.25rem 0 0' }}>{safeDetail.primaryLocation || 'Não informada'}</p>
            </div>
            <div style={{ backgroundColor: '#1f2937', padding: '.75rem', borderRadius: '.375rem' }}>
              <span style={{ color: '#9ca3af', fontSize: '.75rem', textTransform: 'uppercase' }}>Criado em</span>
              <p style={{ color: '#fff', margin: '.25rem 0 0' }}>{formatDate(safeDetail.createdAt, locale)}</p>
            </div>
            <div style={{ backgroundColor: '#1f2937', padding: '.75rem', borderRadius: '.375rem' }}>
              <span style={{ color: '#9ca3af', fontSize: '.75rem', textTransform: 'uppercase' }}>Última Atualização</span>
              <p style={{ color: '#fff', margin: '.25rem 0 0' }}>{formatDate(safeDetail.updatedAt, locale)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Queue Results Table */}
      <section style={{ border: '1px solid #374151', borderRadius: '.5rem', overflow: 'hidden' }}>
        <div style={{ padding: '.75rem 1rem', backgroundColor: '#1f2937', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#fff', fontSize: '.875rem', fontWeight: 600 }}>
            {isPt ? 'Perfis na Fila' : 'Profiles in Queue'} ({queueResult.total})
          </span>
          <span style={{ color: '#9ca3af', fontSize: '.8rem' }}>
            {isPt
              ? `Página ${queueResult.page} de ${queueResult.totalPages}`
              : `Page ${queueResult.page} of ${queueResult.totalPages}`}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#111827', color: '#9ca3af', textAlign: 'left', borderBottom: '1px solid #374151' }}>
                <th style={{ padding: '.75rem 1rem' }}>{isPt ? 'Nome Artístico' : 'Stage Name'}</th>
                <th style={{ padding: '.75rem 1rem' }}>{isPt ? 'Classificação Operacional' : 'Operational Status'}</th>
                <th style={{ padding: '.75rem 1rem' }}>{isPt ? 'Status' : 'Status'}</th>
                <th style={{ padding: '.75rem 1rem' }}>{isPt ? 'Verificação' : 'Verification'}</th>
                <th style={{ padding: '.75rem 1rem' }}>{isPt ? 'Publicação' : 'Publication'}</th>
                <th style={{ padding: '.75rem 1rem' }}>{isPt ? 'Localização' : 'Location'}</th>
                <th style={{ padding: '.75rem 1rem' }}>{isPt ? 'Atualização' : 'Updated'}</th>
                <th style={{ padding: '.75rem 1rem', textAlign: 'right' }}>{isPt ? 'Ações' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {queueResult.items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#9ca3af' }}>
                    {isPt ? 'Nenhum perfil encontrado para os filtros selecionados.' : 'No profiles match the selected filters.'}
                  </td>
                </tr>
              ) : (
                queueResult.items.map((item) => {
                  const badgeStyle = getBadgeStyle(item.operationalClassification)
                  const isSelected = detailProfileId === item.profileId
                  return (
                    <tr
                      key={item.profileId}
                      style={{
                        borderBottom: '1px solid #374151',
                        backgroundColor: isSelected ? '#1e293b' : '#1f2937',
                        color: '#d1d5db',
                      }}
                    >
                      <td style={{ padding: '.75rem 1rem', color: '#fff', fontWeight: 600 }}>
                        {item.stageName}
                      </td>
                      <td style={{ padding: '.75rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '.2rem .5rem',
                            borderRadius: '4px',
                            fontSize: '.75rem',
                            fontWeight: 600,
                            ...badgeStyle,
                          }}
                        >
                          {getOperationalStatusLabel(item.operationalClassification, locale)}
                        </span>
                      </td>
                      <td style={{ padding: '.75rem 1rem', fontSize: '.8rem' }}>
                        {item.profileStatus}
                      </td>
                      <td style={{ padding: '.75rem 1rem', fontSize: '.8rem' }}>
                        {item.verificationStatus}
                      </td>
                      <td style={{ padding: '.75rem 1rem', fontSize: '.8rem' }}>
                        <span
                          style={{
                            color:
                              item.publicationState === 'PUBLIC'
                                ? '#34d399'
                                : item.publicationState === 'SUSPENDED'
                                ? '#f87171'
                                : '#fbbf24',
                            fontWeight: 600,
                          }}
                        >
                          {item.publicationState}
                        </span>
                      </td>
                      <td style={{ padding: '.75rem 1rem', fontSize: '.8rem', color: '#9ca3af' }}>
                        {item.primaryLocation || '—'}
                      </td>
                      <td style={{ padding: '.75rem 1rem', fontSize: '.8rem', color: '#9ca3af' }}>
                        {formatDate(item.updatedAt, locale)}
                      </td>
                      <td style={{ padding: '.75rem 1rem', textAlign: 'right' }}>
                        <Link
                          href={`/admin/profiles/review${buildQueryString({
                            filter: currentFilter !== 'ALL' ? currentFilter : undefined,
                            q: currentSearch || undefined,
                            page: currentPage > 1 ? currentPage : undefined,
                            detail: item.profileId,
                          })}`}
                          style={{
                            display: 'inline-block',
                            color: '#f59e0b',
                            textDecoration: 'none',
                            fontSize: '.8rem',
                            fontWeight: 600,
                            padding: '.25rem .5rem',
                            borderRadius: '4px',
                            backgroundColor: '#374151',
                          }}
                        >
                          {t('admin.viewOperationalProfile')}
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Controls */}
        {queueResult.totalPages > 1 && (
          <div
            style={{
              padding: '.75rem 1rem',
              backgroundColor: '#111827',
              borderTop: '1px solid #374151',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              {currentPage > 1 ? (
                <Link
                  href={`/admin/profiles/review${buildQueryString({
                    filter: currentFilter !== 'ALL' ? currentFilter : undefined,
                    q: currentSearch || undefined,
                    page: currentPage - 1,
                    detail: detailProfileId || undefined,
                  })}`}
                  style={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#fff',
                    padding: '.35rem .75rem',
                    borderRadius: '.375rem',
                    textDecoration: 'none',
                    fontSize: '.8rem',
                  }}
                >
                  ← {isPt ? 'Anterior' : 'Previous'}
                </Link>
              ) : (
                <span style={{ color: '#4b5563', padding: '.35rem .75rem', fontSize: '.8rem' }}>
                  ← {isPt ? 'Anterior' : 'Previous'}
                </span>
              )}
            </div>

            <span style={{ color: '#9ca3af', fontSize: '.8rem' }}>
              {isPt
                ? `Página ${queueResult.page} de ${queueResult.totalPages}`
                : `Page ${queueResult.page} of ${queueResult.totalPages}`}
            </span>

            <div>
              {currentPage < queueResult.totalPages ? (
                <Link
                  href={`/admin/profiles/review${buildQueryString({
                    filter: currentFilter !== 'ALL' ? currentFilter : undefined,
                    q: currentSearch || undefined,
                    page: currentPage + 1,
                    detail: detailProfileId || undefined,
                  })}`}
                  style={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#fff',
                    padding: '.35rem .75rem',
                    borderRadius: '.375rem',
                    textDecoration: 'none',
                    fontSize: '.8rem',
                  }}
                >
                  {isPt ? 'Próxima' : 'Next'} →
                </Link>
              ) : (
                <span style={{ color: '#4b5563', padding: '.35rem .75rem', fontSize: '.8rem' }}>
                  {isPt ? 'Próxima' : 'Next'} →
                </span>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
