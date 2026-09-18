import Link from 'next/link'
import Image from 'next/image'
import { requireAdmin } from '@/modules/moderation/guards'
import { getAdminProfileQueue, getAdminProfileDetailedReview } from '@/modules/admin/dal'
import { getOperationalStatusLabel } from '@/modules/admin/operational-status'
import type { AdminProfileQueueFilter, OperationalClassification } from '@/modules/admin/types'
import { getTranslations } from '@/lib/i18n/server'
import { formatDate } from '@/lib/i18n/format'
import { AdminProfileReviewPanel } from '@/components/admin/admin-profile-review-panel'

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
  
  // Detail profile ID: explicit or fallback to first profile if available
  const explicitDetailProfileId = resolvedParams.detail?.trim() || null

  const queueResult = await getAdminProfileQueue({
    filter: currentFilter,
    search: currentSearch,
    page: currentPage,
    pageSize: 10,
  })

  const selectedProfileId = explicitDetailProfileId || queueResult.items[0]?.profileId || null

  // Fetch rich detailed review for the selected profile
  const detailedReview = selectedProfileId ? await getAdminProfileDetailedReview(selectedProfileId) : null

  const filterTabs: Array<{ key: AdminProfileQueueFilter; label: string }> = [
    { key: 'ALL', label: t('admin.allOperational') },
    { key: 'NEEDS_REVIEW', label: t('admin.needsReview') },
    { key: 'SUSPENDED', label: t('admin.suspended') },
    { key: 'PAUSED', label: t('admin.paused') },
    { key: 'BLOCKED_OR_INELIGIBLE', label: t('admin.blockedOrIneligible') },
  ]

  const returnUrl = `/admin/profiles/review${buildQueryString({
    filter: currentFilter !== 'ALL' ? currentFilter : undefined,
    q: currentSearch || undefined,
    page: currentPage > 1 ? currentPage : undefined,
    detail: selectedProfileId || undefined,
  })}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minHeight: 'calc(100vh - 120px)' }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <form
            method="GET"
            action="/admin/profiles/review"
            style={{ display: 'flex', gap: '.5rem', flex: '1 1 300px', maxWidth: '500px' }}
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
                    padding: '.4rem .65rem',
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
      </div>

      {/* Main Split Layout: Left Column = Queue, Right Column = Review Panel */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 380px) 1fr',
          gap: '1.25rem',
          alignItems: 'start',
        }}
        className="admin-queue-split-container"
      >
        {/* Left Column: Profiles List */}
        <section
          style={{
            backgroundColor: '#111827',
            border: '1px solid #374151',
            borderRadius: '.5rem',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          aria-label={isPt ? 'Lista de perfis na fila' : 'Profiles in queue list'}
        >
          <div
            style={{
              padding: '.75rem 1rem',
              backgroundColor: '#1f2937',
              borderBottom: '1px solid #374151',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ color: '#fff', fontSize: '.875rem', fontWeight: 600 }}>
              {isPt ? 'Fila Operacional' : 'Operational Queue'} ({queueResult.total})
            </span>
            <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>
              {isPt
                ? `Página ${queueResult.page}/${queueResult.totalPages || 1}`
                : `Page ${queueResult.page}/${queueResult.totalPages || 1}`}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '720px', overflowY: 'auto' }}>
            {queueResult.items.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#9ca3af', fontSize: '.875rem' }}>
                {isPt ? 'Nenhum perfil encontrado.' : 'No profiles found.'}
              </div>
            ) : (
              queueResult.items.map((item) => {
                const badgeStyle = getBadgeStyle(item.operationalClassification)
                const isSelected = selectedProfileId === item.profileId

                return (
                  <Link
                    key={item.profileId}
                    href={`/admin/profiles/review${buildQueryString({
                      filter: currentFilter !== 'ALL' ? currentFilter : undefined,
                      q: currentSearch || undefined,
                      page: currentPage > 1 ? currentPage : undefined,
                      detail: item.profileId,
                    })}`}
                    style={{
                      display: 'flex',
                      gap: '.75rem',
                      padding: '.85rem 1rem',
                      borderBottom: '1px solid #1f2937',
                      backgroundColor: isSelected ? '#1e293b' : 'transparent',
                      borderLeft: isSelected ? '4px solid #f59e0b' : '4px solid transparent',
                      textDecoration: 'none',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    {/* Thumbnail / Avatar */}
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '6px',
                        backgroundColor: '#374151',
                        flexShrink: 0,
                        overflow: 'hidden',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.avatarUrl ? (
                        <Image
                          src={item.avatarUrl}
                          alt={item.stageName}
                          fill
                          sizes="48px"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: '1.25rem', color: '#9ca3af' }}>👤</span>
                      )}
                    </div>

                    {/* Meta info */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '.5rem' }}>
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: '.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.stageName}
                        </span>
                        <span style={{ color: '#9ca3af', fontSize: '.7rem', flexShrink: 0 }}>
                          {formatDate(item.updatedAt, locale)}
                        </span>
                      </div>

                      {item.slug && (
                        <span style={{ color: '#9ca3af', fontSize: '.75rem', fontFamily: 'monospace' }}>
                          /{item.slug}
                        </span>
                      )}

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem', marginTop: '.2rem', alignItems: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '.15rem .4rem',
                            borderRadius: '3px',
                            fontSize: '.7rem',
                            fontWeight: 600,
                            ...badgeStyle,
                          }}
                        >
                          {getOperationalStatusLabel(item.operationalClassification, locale)}
                        </span>

                        <span
                          style={{
                            fontSize: '.7rem',
                            padding: '.15rem .4rem',
                            borderRadius: '3px',
                            backgroundColor: item.verificationStatus === 'VERIFIED' ? '#064e3b' : '#374151',
                            color: item.verificationStatus === 'VERIFIED' ? '#a7f3d0' : '#d1d5db',
                            fontWeight: 500,
                          }}
                        >
                          {item.verificationStatus}
                        </span>

                        {((item.pendingPhotosCount ?? 0) > 0 || (item.pendingVideosCount ?? 0) > 0) && (
                          <span
                            style={{
                              fontSize: '.7rem',
                              padding: '.15rem .4rem',
                              borderRadius: '3px',
                              backgroundColor: '#78350f',
                              color: '#fde68a',
                              fontWeight: 600,
                            }}
                          >
                            📷 {(item.pendingPhotosCount ?? 0) + (item.pendingVideosCount ?? 0)} {isPt ? 'pendente(s)' : 'pending'}
                          </span>
                        )}
                      </div>

                      {item.primaryLocation && (
                        <span style={{ color: '#9ca3af', fontSize: '.75rem', marginTop: '.1rem' }}>
                          📍 {item.primaryLocation}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })
            )}
          </div>

          {/* Pagination */}
          {queueResult.totalPages > 1 && (
            <div
              style={{
                padding: '.65rem .75rem',
                backgroundColor: '#1f2937',
                borderTop: '1px solid #374151',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {currentPage > 1 ? (
                <Link
                  href={`/admin/profiles/review${buildQueryString({
                    filter: currentFilter !== 'ALL' ? currentFilter : undefined,
                    q: currentSearch || undefined,
                    page: currentPage - 1,
                  })}`}
                  style={{
                    backgroundColor: '#374151',
                    color: '#fff',
                    padding: '.25rem .5rem',
                    borderRadius: '.25rem',
                    textDecoration: 'none',
                    fontSize: '.75rem',
                  }}
                >
                  ← {isPt ? 'Anterior' : 'Prev'}
                </Link>
              ) : (
                <span style={{ color: '#4b5563', fontSize: '.75rem', padding: '.25rem .5rem' }}>← {isPt ? 'Anterior' : 'Prev'}</span>
              )}

              <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>
                {currentPage} / {queueResult.totalPages}
              </span>

              {currentPage < queueResult.totalPages ? (
                <Link
                  href={`/admin/profiles/review${buildQueryString({
                    filter: currentFilter !== 'ALL' ? currentFilter : undefined,
                    q: currentSearch || undefined,
                    page: currentPage + 1,
                  })}`}
                  style={{
                    backgroundColor: '#374151',
                    color: '#fff',
                    padding: '.25rem .5rem',
                    borderRadius: '.25rem',
                    textDecoration: 'none',
                    fontSize: '.75rem',
                  }}
                >
                  {isPt ? 'Próx' : 'Next'} →
                </Link>
              ) : (
                <span style={{ color: '#4b5563', fontSize: '.75rem', padding: '.25rem .5rem' }}>{isPt ? 'Próx' : 'Next'} →</span>
              )}
            </div>
          )}
        </section>

        {/* Right Column: Review Panel */}
        <section style={{ minWidth: 0 }} aria-label={isPt ? 'Painel de revisão detalhada' : 'Detailed review panel'}>
          {detailedReview ? (
            <AdminProfileReviewPanel
              detail={detailedReview}
              onSuccessUrl={returnUrl}
            />
          ) : (
            <div
              style={{
                backgroundColor: '#111827',
                border: '1px solid #374151',
                borderRadius: '.5rem',
                padding: '3rem 2rem',
                textAlign: 'center',
                color: '#9ca3af',
              }}
            >
              <p style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>📋</p>
              <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '0 0 .5rem' }}>
                {isPt ? 'Nenhum perfil selecionado' : 'No profile selected'}
              </h3>
              <p style={{ fontSize: '.875rem', margin: 0 }}>
                {isPt
                  ? 'Selecione um perfil na fila à esquerda para abrir a ferramenta de revisão.'
                  : 'Select a profile from the left queue to open the operational review tool.'}
              </p>
            </div>
          )}
        </section>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .admin-queue-split-container {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
