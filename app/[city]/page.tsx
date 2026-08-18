import { notFound } from 'next/navigation'
import { executeSearch, getFilterOptions } from '@/modules/search/dal'
import { SearchFilterSidebar } from '@/components/search/search-filter-sidebar'
import { SearchResultCard } from '@/components/search/search-result-card'

interface CitySearchPageProps {
  params: Promise<{ city: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const metadata = {
  robots: 'noindex, follow', // Foundation search page; noindex until FASE 05 media
}

export default async function CitySearchPage({ params, searchParams }: CitySearchPageProps) {
  const { city: citySlug } = await params
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

  const searchResponse = await executeSearch({
    citySlug,
    minAge,
    maxAge,
    hairColor: hairColor ? [hairColor] : undefined,
    eyeColor: eyeColor ? [eyeColor] : undefined,
    bodyType: bodyType ? [bodyType] : undefined,
    includePreview: true, // Allows preview during development
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
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
              {searchResponse.total}{' '}
              {searchResponse.total === 1 ? 'perfil encontrado' : 'perfis encontrados'}
            </span>
            <span>Cidade: {filterOptions.city.name}</span>
          </div>

          {searchResponse.results.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-xl">
                🔍
              </div>
              <h3 className="font-bold text-gray-800 text-base">
                Nenhum perfil encontrado para estes filtros
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Tente ajustar seus filtros de busca ou selecionar outros bairros em{' '}
                {filterOptions.city.name}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {searchResponse.results.map((profile) => (
                <SearchResultCard key={profile.id} profile={profile} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
