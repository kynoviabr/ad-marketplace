'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { FilterOptions } from '@/modules/search/types'
import { useI18n } from '@/components/i18n'

interface PublicSearchFiltersProps {
  filterOptions: FilterOptions
  currentNeighborhood?: string
}

export function PublicSearchFilters({
  filterOptions,
  currentNeighborhood,
}: PublicSearchFiltersProps) {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  const [selectedNeighborhood, setSelectedNeighborhood] = useState(
    currentNeighborhood || searchParams.get('bairro') || ''
  )
  const [minAge, setMinAge] = useState(searchParams.get('idade_min') || '')
  const [maxAge, setMaxAge] = useState(searchParams.get('idade_max') || '')
  const [hairColor, setHairColor] = useState(searchParams.get('cabelo') || '')
  const [eyeColor, setEyeColor] = useState(searchParams.get('olhos') || '')
  const [bodyType, setBodyType] = useState(searchParams.get('corpo') || '')

  useEffect(() => {
    if (isFiltersOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isFiltersOpen])

  const handleApplyFilters = () => {
    const params = new URLSearchParams()
    if (minAge) params.set('idade_min', minAge)
    if (maxAge) params.set('idade_max', maxAge)
    if (hairColor) params.set('cabelo', hairColor)
    if (eyeColor) params.set('olhos', eyeColor)
    if (bodyType) params.set('corpo', bodyType)

    const baseUrl = selectedNeighborhood
      ? `/${filterOptions.city.slug}/${selectedNeighborhood}`
      : `/${filterOptions.city.slug}`

    const queryString = params.toString()
    setIsFiltersOpen(false)
    router.push(queryString ? `${baseUrl}?${queryString}` : baseUrl)
  }

  const handleClearFilters = () => {
    setSelectedNeighborhood('')
    setMinAge('')
    setMaxAge('')
    setHairColor('')
    setEyeColor('')
    setBodyType('')
    setIsFiltersOpen(false)
    router.push(`/${filterOptions.city.slug}`)
  }

  const hasActiveFilters = Boolean(minAge || maxAge || hairColor || eyeColor || bodyType || (selectedNeighborhood && selectedNeighborhood !== currentNeighborhood))

  return (
    <div className="velvet-search-filters">

      <div className="velvet-search-filter-row">
        <button
          onClick={() => setIsFiltersOpen(true)}
          className={`velvet-filter-trigger${hasActiveFilters ? ' is-active' : ''}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          {t('search.filters')} {hasActiveFilters && '•'}
        </button>

        <div className="velvet-search-quick-filters">
          {[t('search.verified18'), t('search.age'), t('search.hair'), t('search.eyes'), t('search.body')].map(label => (
            <button
              key={label}
              onClick={() => setIsFiltersOpen(true)}
              className="velvet-filter-option"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile & Desktop Drawer/Modal for Filters */}
      {isFiltersOpen && (
        <div className="velvet-filter-backdrop">
          <div className="velvet-filter-sheet" role="dialog" aria-modal="true" aria-labelledby="velvet-filter-title">

            <div className="velvet-filter-head">
              <div><p>{t('search.refine')}</p><h3 id="velvet-filter-title">{t('search.filters')}</h3></div>
              <button onClick={() => setIsFiltersOpen(false)} aria-label={t('search.closeFilters')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="velvet-filter-body">

              <div className="velvet-filter-group">
                <label>{t('search.neighborhood')}</label>
                <select
                  value={selectedNeighborhood}
                  onChange={(e) => setSelectedNeighborhood(e.target.value)}
                  className="velvet-filter-select"
                >
                  <option value="">{t('search.allNeighborhoods', { city: filterOptions.city.name })}</option>
                  {Object.entries(filterOptions.locationsByZone).map(([zone, locs]) => (
                    <optgroup key={zone} label={zone}>
                      {locs.map((loc) => (
                        <option key={loc.id} value={loc.slug}>{loc.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="velvet-filter-group">
                <label>{t('search.age')}</label>
                <div className="velvet-filter-age">
                  <input
                    type="number"
                    placeholder={t('search.min')}
                    value={minAge}
                    onChange={(e) => setMinAge(e.target.value)}
                    className="velvet-filter-input"
                  />
                  <span>—</span>
                  <input
                    type="number"
                    placeholder={t('search.max')}
                    value={maxAge}
                    onChange={(e) => setMaxAge(e.target.value)}
                    className="velvet-filter-input"
                  />
                </div>
              </div>

              <div className="velvet-filter-group">
                <label>{t('search.characteristics')}</label>
                <div className="velvet-filter-characteristics">
                  <select
                    value={hairColor}
                    onChange={(e) => setHairColor(e.target.value)}
                    className="velvet-filter-select"
                  >
                    <option value="">{t('search.hairColor')}</option>
                    <option value="BLACK">Preto</option>
                    <option value="BRUNETTE">Castanho</option>
                    <option value="BLONDE">Loiro</option>
                    <option value="REDHEAD">Ruivo</option>
                  </select>
                  <select
                    value={eyeColor}
                    onChange={(e) => setEyeColor(e.target.value)}
                    className="velvet-filter-select"
                  >
                    <option value="">{t('search.eyeColor')}</option>
                    <option value="BROWN">Castanhos</option>
                    <option value="GREEN">Verdes</option>
                    <option value="BLUE">Azuis</option>
                  </select>
                  <select
                    value={bodyType}
                    onChange={(e) => setBodyType(e.target.value)}
                    className="velvet-filter-select"
                  >
                    <option value="">{t('search.body')}</option>
                    <option value="SLIM">Magra</option>
                    <option value="CURVY">Curvilínea</option>
                    <option value="ATHLETIC">Atlética</option>
                  </select>
                </div>
              </div>

            </div>

            <div className="velvet-filter-actions">
              <button
                onClick={handleClearFilters}
              >
                {t('search.clear')}
              </button>
              <button
                onClick={handleApplyFilters}
              >
                {t('search.showResults')}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
