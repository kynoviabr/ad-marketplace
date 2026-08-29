import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { after } from 'next/server'
import { headers } from 'next/headers'
import { executeSearch, getFilterOptions } from '@/modules/search/dal'
import { isReservedSlug } from '@/modules/search/schemas'
import { recordSearchPerformedEvent } from '@/modules/analytics/write'
import { PublicSearchFilters } from '@/components/search/public-search-filters'
import { PublicProfileCard } from '@/components/public/public-profile-card'
import { resolveProfilesWithMedia } from '@/modules/media/delivery'
import {
  getCitySeoData,
  constructCityMetadata,
  hasSearchFilters,
  parsePageNumber,
  generateBreadcrumbJsonLd,
  getSeoConfig,
  isSearchCrawler,
} from '@/modules/seo'
import { JsonLd } from '@/components/seo/json-ld'
import { PublicHeader } from '@/components/public/public-header'
import { PublicFooter } from '@/components/public/public-footer'

interface CitySearchPageProps {
  params: Promise<{ city: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params, searchParams }: CitySearchPageProps): Promise<Metadata> {
  const { city: citySlug } = await params
  if (isReservedSlug(citySlug)) {
    return { robots: { index: false, follow: false } }
  }

  const seoData = await getCitySeoData(citySlug)
  if (!seoData) {
    return { robots: { index: false, follow: false } }
  }

  const resolvedSearchParams = await searchParams
  const hasFilters = hasSearchFilters(resolvedSearchParams)
  const pageNum = parsePageNumber(resolvedSearchParams.page)

  return constructCityMetadata({
    city: seoData.city,
    eligibleProfileCount: seoData.eligibleProfileCount,
    hasFilters,
    page: pageNum,
    lastModified: seoData.lastModified,
  })
}

export default async function CitySearchPage({ params, searchParams }: CitySearchPageProps) {
  const { city: citySlug } = await params
  if (isReservedSlug(citySlug)) {
    notFound()
  }

  const resolvedSearchParams = await searchParams

  const filterOptions = await getFilterOptions(citySlug)
  if (!filterOptions) {
    notFound()
  }

  const minAge = resolvedSearchParams.idade_min
    ? Number(resolvedSearchParams.idade_min)
    : undefined
  const maxAge = resolvedSearchParams.idade_max
    ? Number(resolvedSearchParams.idade_max)
    : undefined
  const hairColor = resolvedSearchParams.cabelo as any
  const eyeColor = resolvedSearchParams.olhos as any
  const bodyType = resolvedSearchParams.corpo as any

  const hasFilters = Boolean(
    minAge !== undefined ||
    maxAge !== undefined ||
    hairColor ||
    eyeColor ||
    bodyType
  )

  const page = parsePageNumber(resolvedSearchParams.page)

  const searchResponse = await executeSearch({
    citySlug,
    page,
    minAge,
    maxAge,
    hairColor: hairColor ? [hairColor] : undefined,
    eyeColor: eyeColor ? [eyeColor] : undefined,
    bodyType: bodyType ? [bodyType] : undefined,
    includePreview: true, // Allows preview during development
  })

  // Check User-Agent to suppress analytics for search engine crawlers (Zero Cloaking Invariant)
  const headersList = await headers()
  const userAgent = headersList.get('user-agent')
  const isCrawler = isSearchCrawler(userAgent)

  // FASE 09/10: Schedule non-blocking SEARCH_PERFORMED analytics event for human visitors
  after(async () => {
    if (isCrawler) return

    try {
      await recordSearchPerformedEvent({
        cityId: searchResponse.city.id,
        locationId: searchResponse.selectedLocation?.id ?? null,
        resultPage: searchResponse.page,
        totalProfiles: searchResponse.totalProfiles,
        sponsoredCount: searchResponse.sponsoredCount,
        hasFilters,
      })
    } catch (err: any) {
      console.error('[analytics:search] Error recording search event:', err?.message)
    }
  })

  const seoConfig = getSeoConfig()
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Home', url: `${seoConfig.siteUrl}/` },
    { name: filterOptions.city.name, url: `${seoConfig.siteUrl}/${citySlug}` },
  ])

  // FASE 12.2C: Resolve approved primary media for search profiles
  const profilesWithMedia = await resolveProfilesWithMedia(searchResponse.results)

  return (
    <div className="velvet-public-shell">
      <PublicHeader />
      <main className="velvet-explore">
      <JsonLd data={breadcrumbJsonLd} />

      {/* Header and Filters (Desktop + Mobile) */}
      <header className="velvet-explore-header">
          <div>
            <div>
              <p className="velvet-overline">{filterOptions.city.name.toUpperCase()} · EXPLORAR</p>
              <h1>
                Profissionais em {filterOptions.city.name}
              </h1>
              <p>Uma curadoria de perfis verificados em São Paulo.</p>
            </div>

            {/* Horizontal Desktop Filters / Mobile Filter Trigger */}
            <div>
              <PublicSearchFilters filterOptions={filterOptions} />
            </div>
          </div>
      </header>

      {/* Results Grid */}
      <div className="velvet-explore-results">
        <div className="velvet-explore-summary">
          <span>
            {searchResponse.totalProfiles}{' '}
            {searchResponse.totalProfiles === 1 ? 'perfil encontrado' : 'perfis encontrados'}
          </span>
        </div>

        {profilesWithMedia.length === 0 ? (
          <div className="velvet-explore-empty">
            <p>
              Nenhum perfil encontrado com os filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="velvet-explore-grid">
            {profilesWithMedia.map((profile, index) => (
              <PublicProfileCard
                key={profile.id}
                profile={profile}
                mediaUrl={profile.mediaUrl}
                priority={index < 4}
              />
            ))}
          </div>
        )}

        {/* Simple Pagination Nav */}
        {searchResponse.totalPages > 1 && (
          <div className="velvet-explore-pagination">
            {searchResponse.page > 1 && (
              <a
                href={`/${citySlug}?page=${searchResponse.page - 1}`}
              >
                Anterior
              </a>
            )}
            <span>
              Página {searchResponse.page} de {searchResponse.totalPages}
            </span>
            {searchResponse.page < searchResponse.totalPages && (
              <a
                href={`/${citySlug}?page=${searchResponse.page + 1}`}
              >
                Próxima
              </a>
            )}
          </div>
        )}
      </div>
      </main>
      <PublicFooter />
    </div>
  )
}
