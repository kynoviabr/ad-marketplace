import Link from 'next/link'
import Image from 'next/image'
import { requireAdmin } from '@/modules/moderation/guards'
import { getAdminMediaQueue, getAdminMediaDetail } from '@/modules/admin/dal'
import type { AdminMediaQueueFilter, AdminMediaType } from '@/modules/admin/types'
import { getTranslations } from '@/lib/i18n/server'
import { formatDate } from '@/lib/i18n/format'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Moderação de Mídias — Painel Administrativo',
  robots: 'noindex, nofollow',
}

interface PageProps {
  searchParams: Promise<{
    filter?: string
    q?: string
    page?: string
    detail?: string
    type?: string
  }>
}

function getStatusBadgeStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'PENDING_MODERATION':
      return { backgroundColor: '#78350f', color: '#fde68a', border: '1px solid #b45309' }
    case 'APPROVED':
      return { backgroundColor: '#064e3b', color: '#a7f3d0', border: '1px solid #059669' }
    case 'REJECTED':
    case 'QUARANTINED':
      return { backgroundColor: '#7f1d1d', color: '#fecaca', border: '1px solid #b91c1c' }
    default:
      return { backgroundColor: '#374151', color: '#d1d5db', border: '1px solid #4b5563' }
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

export default async function AdminMediaReviewPage({ searchParams }: PageProps) {
  await requireAdmin()

  const { locale, t } = await getTranslations()
  const isPt = locale === 'pt-BR'

  const resolvedParams = await searchParams
  const rawFilter = resolvedParams.filter?.toUpperCase()
  const validFilters: AdminMediaQueueFilter[] = [
    'PENDING',
    'PHOTOS',
    'VIDEOS',
    'APPROVED',
    'REJECTED',
    'ALL',
  ]
  const currentFilter: AdminMediaQueueFilter = validFilters.includes(rawFilter as AdminMediaQueueFilter)
    ? (rawFilter as AdminMediaQueueFilter)
    : 'PENDING'

  const currentSearch = resolvedParams.q?.trim() || ''
  const currentPage = Math.max(1, Number(resolvedParams.page) || 1)
  const detailMediaId = resolvedParams.detail?.trim() || null
  const detailMediaType = resolvedParams.type?.toUpperCase() as AdminMediaType | undefined

  const queueResult = await getAdminMediaQueue({
    filter: currentFilter,
    search: currentSearch,
    page: currentPage,
    pageSize: 12,
  })

  // Safe detail inspection if requested
  const safeDetail = detailMediaId ? await getAdminMediaDetail(detailMediaId, detailMediaType) : null

  const filterTabs: Array<{ key: AdminMediaQueueFilter; label: string }> = [
    { key: 'PENDING', label: t('admin.pendingReview') },
    { key: 'PHOTOS', label: t('admin.photos') },
    { key: 'VIDEOS', label: t('admin.videos') },
    { key: 'APPROVED', label: t('admin.approved') },
    { key: 'REJECTED', label: t('admin.rejected') },
    { key: 'ALL', label: t('admin.allMedia') },
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
          {t('admin.mediaReviewTitle')}
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '.875rem', margin: 0 }}>
          {t('admin.mediaReviewSubtitle')} {t('admin.noSensitiveData')}
        </p>
      </header>

      {/* Search and Filters Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Search Input */}
        <form
          method="GET"
          action="/admin/media/review"
          style={{ display: 'flex', gap: '.5rem', maxWidth: '600px' }}
        >
          {currentFilter !== 'PENDING' && <input type="hidden" name="filter" value={currentFilter} />}
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
              href={`/admin/media/review${buildQueryString({ filter: currentFilter !== 'PENDING' ? currentFilter : undefined })}`}
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
          aria-label={isPt ? 'Filtros da fila de mídias' : 'Media queue filters'}
          style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}
        >
          {filterTabs.map((tab) => {
            const isActive = currentFilter === tab.key
            return (
              <Link
                key={tab.key}
                href={`/admin/media/review${buildQueryString({
                  filter: tab.key !== 'PENDING' ? tab.key : undefined,
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

      {/* Safe Detail Modal / Inspector (“Revisar mídia”) */}
      {safeDetail && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="media-detail-title"
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
                {t('admin.reviewMedia')} — {safeDetail.item.mediaType}
              </p>
              <h2 id="media-detail-title" style={{ color: '#fff', fontSize: '1.5rem', margin: '.25rem 0 0' }}>
                {safeDetail.item.stageName} {safeDetail.item.isPrimary ? '⭐ (Foto Principal)' : ''}
              </h2>
            </div>
            <Link
              href={`/admin/media/review${buildQueryString({
                filter: currentFilter !== 'PENDING' ? currentFilter : undefined,
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
            🛡️ {t('admin.safeMediaDisclaimer')}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Visual Media Container */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#030712', borderRadius: '.5rem', padding: '1rem', border: '1px solid #374151' }}>
              {safeDetail.item.mediaType === 'PHOTO' ? (
                safeDetail.item.previewUrl ? (
                  <div style={{ position: 'relative', width: '100%', maxWidth: '400px', height: '450px' }}>
                    <Image
                      src={safeDetail.item.previewUrl}
                      alt={`Mídia de ${safeDetail.item.stageName}`}
                      fill
                      unoptimized
                      style={{ objectFit: 'contain', borderRadius: '.375rem' }}
                    />
                  </div>
                ) : (
                  <p style={{ color: '#9ca3af', fontSize: '.875rem' }}>Preview indisponível</p>
                )
              ) : (
                <div style={{ width: '100%', maxWidth: '450px' }}>
                  {safeDetail.item.videoUrl ? (
                    <video
                      controls
                      autoPlay={false}
                      preload="metadata"
                      poster={safeDetail.item.posterUrl || undefined}
                      src={safeDetail.item.videoUrl}
                      style={{ width: '100%', maxHeight: '420px', borderRadius: '.375rem', backgroundColor: '#000' }}
                    >
                      <track kind="captions" />
                      Seu navegador não suporta a tag de vídeo.
                    </video>
                  ) : safeDetail.item.posterUrl ? (
                    <div style={{ position: 'relative', width: '100%', height: '350px' }}>
                      <Image
                        src={safeDetail.item.posterUrl}
                        alt={`Poster de ${safeDetail.item.stageName}`}
                        fill
                        unoptimized
                        style={{ objectFit: 'contain', borderRadius: '.375rem' }}
                      />
                    </div>
                  ) : (
                    <p style={{ color: '#9ca3af', fontSize: '.875rem' }}>Vídeo indisponível</p>
                  )}
                  <p style={{ color: '#9ca3af', fontSize: '.75rem', marginTop: '.5rem', textAlign: 'center' }}>
                    {isPt ? 'Reprodução de vídeo controlada (sem autoplay).' : 'Controlled video playback (no autoplay).'}
                  </p>
                </div>
              )}
            </div>

            {/* Metadata & Safe Profile Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Media Metadata */}
              <div style={{ backgroundColor: '#1f2937', padding: '1rem', borderRadius: '.5rem', border: '1px solid #374151' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', margin: '0 0 .75rem' }}>Metadados da Mídia</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '.75rem', fontSize: '.8rem' }}>
                  <div>
                    <span style={{ color: '#9ca3af', display: 'block' }}>ID da Mídia:</span>
                    <span style={{ color: '#fff', fontFamily: 'monospace' }}>{safeDetail.item.id}</span>
                  </div>
                  <div>
                    <span style={{ color: '#9ca3af', display: 'block' }}>Tipo:</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{safeDetail.item.mediaType}</span>
                  </div>
                  <div>
                    <span style={{ color: '#9ca3af', display: 'block' }}>Status:</span>
                    <span style={{ ...getStatusBadgeStyle(safeDetail.item.status), padding: '0.1rem .35rem', borderRadius: '4px', fontSize: '.75rem' }}>
                      {safeDetail.item.status}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#9ca3af', display: 'block' }}>Principal:</span>
                    <span style={{ color: '#fff' }}>{safeDetail.item.isPrimary ? 'Sim' : 'Não'}</span>
                  </div>
                  {safeDetail.item.durationSeconds && (
                    <div>
                      <span style={{ color: '#9ca3af', display: 'block' }}>Duração:</span>
                      <span style={{ color: '#fff' }}>{safeDetail.item.durationSeconds}s</span>
                    </div>
                  )}
                  <div>
                    <span style={{ color: '#9ca3af', display: 'block' }}>Submetida em:</span>
                    <span style={{ color: '#fff' }}>{formatDate(safeDetail.item.createdAt, locale)}</span>
                  </div>
                </div>
              </div>

              {/* Safe Profile Summary */}
              {safeDetail.profileSummary && (
                <div style={{ backgroundColor: '#1f2937', padding: '1rem', borderRadius: '.5rem', border: '1px solid #374151' }}>
                  <h3 style={{ color: '#fff', fontSize: '1rem', margin: '0 0 .75rem' }}>Resumo Operacional do Perfil</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '.75rem', fontSize: '.8rem' }}>
                    <div>
                      <span style={{ color: '#9ca3af', display: 'block' }}>Nome Artístico:</span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{safeDetail.profileSummary.stageName}</span>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af', display: 'block' }}>Status do Perfil:</span>
                      <span style={{ color: '#fff' }}>{safeDetail.profileSummary.profileStatus}</span>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af', display: 'block' }}>Verificação KYC:</span>
                      <span style={{ color: '#fff' }}>{safeDetail.profileSummary.verificationStatus}</span>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af', display: 'block' }}>Status da Conta:</span>
                      <span style={{ color: '#fff' }}>{safeDetail.profileSummary.accountStatus}</span>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af', display: 'block' }}>Publicação:</span>
                      <span style={{ color: '#fff' }}>{safeDetail.profileSummary.publicationState}</span>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af', display: 'block' }}>Localização:</span>
                      <span style={{ color: '#fff' }}>{safeDetail.profileSummary.primaryLocation || 'Não informada'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Media Queue Results */}
      <section style={{ border: '1px solid #374151', borderRadius: '.5rem', overflow: 'hidden' }}>
        <div style={{ padding: '.75rem 1rem', backgroundColor: '#1f2937', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#fff', fontSize: '.875rem', fontWeight: 600 }}>
            {isPt ? 'Mídias na Fila' : 'Media in Queue'} ({queueResult.total})
          </span>
          <span style={{ color: '#9ca3af', fontSize: '.8rem' }}>
            {isPt
              ? `Página ${queueResult.page} de ${queueResult.totalPages}`
              : `Page ${queueResult.page} of ${queueResult.totalPages}`}
          </span>
        </div>

        {queueResult.items.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#9ca3af' }}>
            {isPt ? 'Nenhuma mídia encontrada para os filtros selecionados.' : 'No media found for the selected filters.'}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1rem',
              padding: '1rem',
              backgroundColor: '#111827',
            }}
          >
            {queueResult.items.map((item) => {
              const isSelected = detailMediaId === item.id
              const statusStyle = getStatusBadgeStyle(item.status)
              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: isSelected ? '#1e293b' : '#1f2937',
                    border: isSelected ? '2px solid #f59e0b' : '1px solid #374151',
                    borderRadius: '.5rem',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Thumbnail / Poster Preview */}
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '200px',
                      backgroundColor: '#030712',
                    }}
                  >
                    {item.previewUrl ? (
                      <Image
                        src={item.previewUrl}
                        alt={`Mídia de ${item.stageName}`}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, 260px"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: '.8rem' }}>
                        {item.mediaType === 'VIDEO' ? 'Vídeo sem poster' : 'Imagem indisponível'}
                      </div>
                    )}

                    {/* Media Type Tag */}
                    <span
                      style={{
                        position: 'absolute',
                        top: '.5rem',
                        left: '.5rem',
                        backgroundColor: item.mediaType === 'PHOTO' ? '#1e40af' : '#6b21a8',
                        color: '#fff',
                        fontSize: '.7rem',
                        fontWeight: 700,
                        padding: '.15rem .4rem',
                        borderRadius: '4px',
                      }}
                    >
                      {item.mediaType}
                    </span>

                    {/* Primary Badge */}
                    {item.isPrimary && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '.5rem',
                          right: '.5rem',
                          backgroundColor: '#b45309',
                          color: '#fff',
                          fontSize: '.7rem',
                          fontWeight: 700,
                          padding: '.15rem .4rem',
                          borderRadius: '4px',
                        }}
                      >
                        ⭐ {isPt ? 'Principal' : 'Primary'}
                      </span>
                    )}
                  </div>

                  {/* Metadata Info */}
                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '.5rem', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ color: '#fff', margin: 0, fontSize: '.95rem' }}>{item.stageName}</h4>
                        <span style={{ color: '#9ca3af', fontSize: '.75rem', fontFamily: 'monospace' }}>
                          ID: {item.id.slice(0, 8)}...
                        </span>
                      </div>
                      <span style={{ ...statusStyle, fontSize: '.7rem', padding: '.15rem .35rem', borderRadius: '4px', fontWeight: 600 }}>
                        {item.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '.75rem', color: '#9ca3af', marginTop: 'auto' }}>
                      <p style={{ margin: '0 0 .25rem' }}>
                        {isPt ? 'Submetido em:' : 'Submitted:'} {formatDate(item.createdAt, locale)}
                      </p>
                      {item.durationSeconds && (
                        <p style={{ margin: 0 }}>
                          {isPt ? 'Duração:' : 'Duration:'} {item.durationSeconds}s
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/admin/media/review${buildQueryString({
                        filter: currentFilter !== 'PENDING' ? currentFilter : undefined,
                        q: currentSearch || undefined,
                        page: currentPage > 1 ? currentPage : undefined,
                        detail: item.id,
                        type: item.mediaType,
                      })}`}
                      style={{
                        marginTop: '.5rem',
                        textAlign: 'center',
                        backgroundColor: '#374151',
                        color: '#f59e0b',
                        padding: '.4rem .75rem',
                        borderRadius: '.375rem',
                        textDecoration: 'none',
                        fontSize: '.8rem',
                        fontWeight: 600,
                      }}
                    >
                      {t('admin.reviewMedia')} →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

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
                  href={`/admin/media/review${buildQueryString({
                    filter: currentFilter !== 'PENDING' ? currentFilter : undefined,
                    q: currentSearch || undefined,
                    page: currentPage - 1,
                    detail: detailMediaId || undefined,
                    type: detailMediaType || undefined,
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
                  href={`/admin/media/review${buildQueryString({
                    filter: currentFilter !== 'PENDING' ? currentFilter : undefined,
                    q: currentSearch || undefined,
                    page: currentPage + 1,
                    detail: detailMediaId || undefined,
                    type: detailMediaType || undefined,
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
