import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { after } from 'next/server'
import { headers } from 'next/headers'
import { executeSearch, getFilterOptions } from '@/modules/search/dal'
import { isReservedSlug } from '@/modules/search/schemas'
import { recordSearchPerformedEvent } from '@/modules/analytics/write'
import { SearchFilterSidebar } from '@/components/search/search-filter-sidebar'
import { SearchResultCard } from '@/components/search/search-result-card'
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <JsonLd data={breadcrumbJsonLd} />

      {/* Header */}
      <div className="border-b pb-6 mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">
          Acompanhantes em {filterOptions.city.name}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Anunciantes verificadas com maioridade confirmada (18+)
        </p>
      </div>

      {/* Main Layout: Sidebar + Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filter Sidebar */}
        <div className="lg:col-span-1">
          <SearchFilterSidebar filterOptions={filterOptions} />
        </div>

        {/* Results Grid */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {searchResponse.totalProfiles}{' '}
              {searchResponse.totalProfiles === 1 ? 'perfil encontrado' : 'perfis encontrados'}
            </span>
            <span>
              Página {searchResponse.page} de {Math.max(1, searchResponse.totalPages)}
            </span>
          </div>

          {searchResponse.results.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <p className="text-gray-500 text-sm">
                Nenhum perfil encontrado com os filtros selecionados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {searchResponse.results.map((profile, index) => (
                <SearchResultCard
                  key={profile.id}
                  profile={profile}
                  citySlug={citySlug}
                  resultPage={searchResponse.page}
                  resultPosition={index + 1}
                />
              ))}
            </div>
          )}

          {/* Simple Pagination Nav */}
          {searchResponse.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6 border-t">
              {searchResponse.page > 1 && (
                <a
                  href={`/${citySlug}?page=${searchResponse.page - 1}`}
                  className="px-3 py-1.5 text-xs font-medium border rounded hover:bg-gray-50"
                >
                  Anterior
                </a>
              )}
              <span className="text-xs text-gray-600">
                Página {searchResponse.page} de {searchResponse.totalPages}
              </span>
              {searchResponse.page < searchResponse.totalPages && (
                <a
                  href={`/${citySlug}?page=${searchResponse.page + 1}`}
                  className="px-3 py-1.5 text-xs font-medium border rounded hover:bg-gray-50"
                >
                  Próxima
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
