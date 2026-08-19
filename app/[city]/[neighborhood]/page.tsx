import { notFound } from 'next/navigation'
import { after } from 'next/server'
import { executeSearch, getFilterOptions } from '@/modules/search/dal'
import { isReservedSlug } from '@/modules/search/schemas'
import { recordSearchPerformedEvent } from '@/modules/analytics/write'
import { SearchFilterSidebar } from '@/components/search/search-filter-sidebar'
import { SearchResultCard } from '@/components/search/search-result-card'

interface NeighborhoodSearchPageProps {
  params: Promise<{ city: string; neighborhood: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const metadata = {
  robots: 'noindex, follow', // Foundation search page
}

export default async function NeighborhoodSearchPage({
  params,
  searchParams,
}: NeighborhoodSearchPageProps) {
  const { city: citySlug, neighborhood: neighborhoodSlug } = await params
  if (isReservedSlug(citySlug) || isReservedSlug(neighborhoodSlug)) {
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

  const searchResponse = await executeSearch({
    citySlug,
    locationSlug: neighborhoodSlug,
    minAge,
    maxAge,
    hairColor: hairColor ? [hairColor] : undefined,
    eyeColor: eyeColor ? [eyeColor] : undefined,
    bodyType: bodyType ? [bodyType] : undefined,
    includePreview: true,
  })

  // FASE 09: Schedule non-blocking SEARCH_PERFORMED analytics event
  after(async () => {
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

  const locationName = searchResponse.selectedLocation?.name || neighborhoodSlug

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="border-b pb-6 mb-8">
        <div className="text-xs text-gray-500 mb-1">
          <span>{filterOptions.city.name}</span> &gt; <span>{locationName}</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900">
          Acompanhantes em {locationName}, {filterOptions.city.name}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Anunciantes verificadas que atendem na região de {locationName}
        </p>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filter Sidebar */}
        <div className="lg:col-span-1">
          <SearchFilterSidebar
            filterOptions={filterOptions}
            currentNeighborhood={neighborhoodSlug}
          />
        </div>

        {/* Results Grid */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {searchResponse.totalProfiles}{' '}
              {searchResponse.totalProfiles === 1 ? 'perfil encontrado' : 'perfis encontrados'}
            </span>
            <span>Bairro: {locationName}</span>
          </div>

          {searchResponse.results.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-xl">
                📍
              </div>
              <h3 className="font-bold text-gray-800 text-base">
                Nenhum perfil ativo em {locationName}
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Tente buscar em outros bairros próximos de {filterOptions.city.name} ou remova alguns
                filtros de características.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {searchResponse.results.map((profile, index) => (
                <SearchResultCard
                  key={profile.id}
                  profile={profile}
                  citySlug={citySlug}
                  locationSlug={neighborhoodSlug}
                  resultPage={searchResponse.page}
                  resultPosition={index}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
