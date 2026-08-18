'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import type { FilterOptions } from '@/modules/search/types'
import { Button } from '@/components/ui/button'

interface SearchFilterSidebarProps {
  filterOptions: FilterOptions
  currentNeighborhood?: string
}

export function SearchFilterSidebar({
  filterOptions,
  currentNeighborhood,
}: SearchFilterSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [selectedNeighborhood, setSelectedNeighborhood] = useState(
    currentNeighborhood || searchParams.get('bairro') || ''
  )
  const [minAge, setMinAge] = useState(searchParams.get('idade_min') || '')
  const [maxAge, setMaxAge] = useState(searchParams.get('idade_max') || '')
  const [hairColor, setHairColor] = useState(searchParams.get('cabelo') || '')
  const [eyeColor, setEyeColor] = useState(searchParams.get('olhos') || '')
  const [bodyType, setBodyType] = useState(searchParams.get('corpo') || '')

  const handleApplyFilters = () => {
    const params = new URLSearchParams()
    if (minAge) params.set('idade_min', minAge)
    if (maxAge) params.set('idade_max', maxAge)
    if (hairColor) params.set('cabelo', hairColor)
    if (eyeColor) params.set('olhos', eyeColor)
    if (bodyType) params.set('corpo', bodyType)

    // Base URL depending on whether neighborhood is selected
    const baseUrl = selectedNeighborhood
      ? `/${filterOptions.city.slug}/${selectedNeighborhood}`
      : `/${filterOptions.city.slug}`

    const queryString = params.toString()
    router.push(queryString ? `${baseUrl}?${queryString}` : baseUrl)
  }

  const handleClearFilters = () => {
    setSelectedNeighborhood('')
    setMinAge('')
    setMaxAge('')
    setHairColor('')
    setEyeColor('')
    setBodyType('')
    router.push(`/${filterOptions.city.slug}`)
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="font-bold text-gray-900 text-sm">Filtros de Busca</h3>
        <button
          type="button"
          onClick={handleClearFilters}
          className="text-xs text-blue-600 hover:underline cursor-pointer"
        >
          Limpar
        </button>
      </div>

      {/* Neighborhood / Bairro */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
          Bairro em {filterOptions.city.name}
        </label>
        <select
          value={selectedNeighborhood}
          onChange={(e) => setSelectedNeighborhood(e.target.value)}
          className="w-full text-xs p-2.5 border border-gray-300 rounded-lg bg-white"
        >
          <option value="">Todos os Bairros</option>
          {Object.entries(filterOptions.locationsByZone).map(([zone, locs]) => (
            <optgroup key={zone} label={zone}>
              {locs.map((loc) => (
                <option key={loc.id} value={loc.slug}>
                  {loc.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Age range */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
          Idade Pública
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min (18)"
            min={18}
            max={99}
            value={minAge}
            onChange={(e) => setMinAge(e.target.value)}
            className="w-full text-xs p-2 border border-gray-300 rounded-lg"
          />
          <input
            type="number"
            placeholder="Max (99)"
            min={18}
            max={99}
            value={maxAge}
            onChange={(e) => setMaxAge(e.target.value)}
            className="w-full text-xs p-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Hair Color */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
          Cor do Cabelo
        </label>
        <select
          value={hairColor}
          onChange={(e) => setHairColor(e.target.value)}
          className="w-full text-xs p-2.5 border border-gray-300 rounded-lg bg-white"
        >
          <option value="">Todos</option>
          <option value="BLACK">Preto</option>
          <option value="BRUNETTE">Castanho</option>
          <option value="BLONDE">Loiro</option>
          <option value="REDHEAD">Ruivo</option>
          <option value="OTHER">Outro</option>
        </select>
      </div>

      {/* Eye Color */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
          Cor dos Olhos
        </label>
        <select
          value={eyeColor}
          onChange={(e) => setEyeColor(e.target.value)}
          className="w-full text-xs p-2.5 border border-gray-300 rounded-lg bg-white"
        >
          <option value="">Todos</option>
          <option value="BLACK">Pretos</option>
          <option value="BROWN">Castanhos</option>
          <option value="GREEN">Verdes</option>
          <option value="BLUE">Azuis</option>
          <option value="HAZEL">Mel/Avelã</option>
          <option value="OTHER">Outro</option>
        </select>
      </div>

      {/* Body Type */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
          Tipo de Corpo
        </label>
        <select
          value={bodyType}
          onChange={(e) => setBodyType(e.target.value)}
          className="w-full text-xs p-2.5 border border-gray-300 rounded-lg bg-white"
        >
          <option value="">Todos</option>
          <option value="SLIM">Magra</option>
          <option value="ATHLETIC">Atlética</option>
          <option value="CURVY">Curvilínea</option>
          <option value="AVERAGE">Convencional</option>
          <option value="PLUS_SIZE">Plus Size</option>
          <option value="OTHER">Outro</option>
        </select>
      </div>

      <Button onClick={handleApplyFilters} className="w-full">
        Aplicar Filtros
      </Button>
    </div>
  )
}
