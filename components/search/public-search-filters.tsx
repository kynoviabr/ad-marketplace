'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { FilterOptions } from '@/modules/search/types'
import { useI18n } from '@/components/i18n'
import { localizePathname } from '@/lib/i18n/routing'
import type { Locale } from '@/lib/i18n/config'

interface PublicSearchFiltersProps {
  filterOptions: FilterOptions
  currentNeighborhood?: string
  locale: Locale
  resultCount: number
}

const FILTER_KEYS = ['idade_min', 'idade_max', 'cabelo', 'olhos', 'corpo'] as const
type FilterKey = (typeof FILTER_KEYS)[number]

export function PublicSearchFilters({ filterOptions, currentNeighborhood, locale, resultCount }: PublicSearchFiltersProps) {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [neighborhood, setNeighborhood] = useState(currentNeighborhood || '')
  const [minAge, setMinAge] = useState(searchParams.get('idade_min') || '')
  const [maxAge, setMaxAge] = useState(searchParams.get('idade_max') || '')
  const [hair, setHair] = useState(searchParams.get('cabelo') || '')
  const [eyes, setEyes] = useState(searchParams.get('olhos') || '')
  const [body, setBody] = useState(searchParams.get('corpo') || '')

  const close = () => {
    setIsOpen(false)
    window.requestAnimationFrame(() => triggerRef.current?.focus())
  }

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button, select, input, [href], [tabindex]:not([tabindex="-1"])') ?? [])
    focusable()[0]?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      } else if (event.key === 'Tab') {
        const items = focusable()
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first?.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  const buildUrl = (location: string, params: URLSearchParams) => {
    params.delete('page')
    const path = location ? `/${filterOptions.city.slug}/${location}` : `/${filterOptions.city.slug}`
    const query = params.toString()
    return `${localizePathname(path, locale)}${query ? `?${query}` : ''}`
  }

  const apply = () => {
    const params = new URLSearchParams(searchParams.toString())
    const values = { idade_min: minAge, idade_max: maxAge, cabelo: hair, olhos: eyes, corpo: body }
    Object.entries(values).forEach(([key, value]) => value ? params.set(key, value) : params.delete(key))
    setIsOpen(false)
    router.push(buildUrl(neighborhood, params))
  }

  const clear = () => {
    const params = new URLSearchParams(searchParams.toString())
    FILTER_KEYS.forEach((key) => params.delete(key))
    setNeighborhood(''); setMinAge(''); setMaxAge(''); setHair(''); setEyes(''); setBody(''); setIsOpen(false)
    router.push(buildUrl('', params))
  }

  const remove = (key: FilterKey | 'neighborhood') => {
    const params = new URLSearchParams(searchParams.toString())
    if (key === 'neighborhood') router.push(buildUrl('', params))
    else { params.delete(key); router.push(buildUrl(currentNeighborhood || '', params)) }
  }

  const locationName = currentNeighborhood
    ? Object.values(filterOptions.locationsByZone).flat().find((item) => item.slug === currentNeighborhood)?.name
    : null
  const optionLabels: Record<string, string> = {
    BLACK: t('search.option.hair.black'), BRUNETTE: t('search.option.hair.brunette'), BLONDE: t('search.option.hair.blonde'), REDHEAD: t('search.option.hair.redhead'),
    BROWN: t('search.option.eyes.brown'), GREEN: t('search.option.eyes.green'), BLUE: t('search.option.eyes.blue'),
    SLIM: t('search.option.body.slim'), CURVY: t('search.option.body.curvy'), ATHLETIC: t('search.option.body.athletic'),
  }
  const chips = [
    locationName ? { key: 'neighborhood' as const, label: locationName } : null,
    minAge ? { key: 'idade_min' as const, label: t('search.chip.minAge', { age: minAge }) } : null,
    maxAge ? { key: 'idade_max' as const, label: t('search.chip.maxAge', { age: maxAge }) } : null,
    hair ? { key: 'cabelo' as const, label: optionLabels[hair] || hair } : null,
    eyes ? { key: 'olhos' as const, label: optionLabels[eyes] || eyes } : null,
    body ? { key: 'corpo' as const, label: optionLabels[body] || body } : null,
  ].filter(Boolean) as Array<{ key: FilterKey | 'neighborhood'; label: string }>

  return <div className="velvet-search-filters">
    <div className="velvet-search-filter-row">
      <button ref={triggerRef} type="button" onClick={() => setIsOpen(true)} className={`velvet-filter-trigger${chips.length ? ' is-active' : ''}`} aria-expanded={isOpen} aria-controls="velvet-filter-dialog">
        <span aria-hidden="true">☰</span>{t('search.filters')}{chips.length ? ` (${chips.length})` : ''}
      </button>
      {chips.length ? <div className="velvet-active-filters" aria-label={t('search.activeFilters')}>
        {chips.map((chip) => <button key={chip.key} type="button" onClick={() => remove(chip.key)}>{chip.label}<span aria-hidden="true">×</span><span className="sr-only">{t('search.removeFilter', { filter: chip.label })}</span></button>)}
        <button type="button" className="velvet-clear-filters" onClick={clear}>{t('search.clear')}</button>
      </div> : null}
    </div>

    {isOpen ? <div className="velvet-filter-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
      <div ref={dialogRef} id="velvet-filter-dialog" className="velvet-filter-sheet" role="dialog" aria-modal="true" aria-labelledby="velvet-filter-title">
        <div className="velvet-filter-head"><div><p>{t('search.refine')}</p><h2 id="velvet-filter-title">{t('search.filters')}</h2></div><button type="button" onClick={close} aria-label={t('search.closeFilters')}>×</button></div>
        <div className="velvet-filter-body">
          <div className="velvet-filter-group"><label htmlFor="filter-neighborhood">{t('search.neighborhood')}</label><select id="filter-neighborhood" value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} className="velvet-filter-select"><option value="">{t('search.allNeighborhoods', { city: filterOptions.city.name })}</option>{Object.entries(filterOptions.locationsByZone).map(([zone, locations]) => <optgroup key={zone} label={zone}>{locations.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</optgroup>)}</select></div>
          <fieldset className="velvet-filter-group"><legend>{t('search.age')}</legend><div className="velvet-filter-age"><label><span>{t('search.min')}</span><input type="number" min="18" max="99" value={minAge} onChange={(event) => setMinAge(event.target.value)} className="velvet-filter-input" /></label><span aria-hidden="true">—</span><label><span>{t('search.max')}</span><input type="number" min="18" max="99" value={maxAge} onChange={(event) => setMaxAge(event.target.value)} className="velvet-filter-input" /></label></div></fieldset>
          <fieldset className="velvet-filter-group"><legend>{t('search.characteristics')}</legend><div className="velvet-filter-characteristics">
            <label><span>{t('search.hairColor')}</span><select value={hair} onChange={(event) => setHair(event.target.value)} className="velvet-filter-select"><option value="">{t('search.any')}</option><option value="BLACK">{optionLabels.BLACK}</option><option value="BRUNETTE">{optionLabels.BRUNETTE}</option><option value="BLONDE">{optionLabels.BLONDE}</option><option value="REDHEAD">{optionLabels.REDHEAD}</option></select></label>
            <label><span>{t('search.eyeColor')}</span><select value={eyes} onChange={(event) => setEyes(event.target.value)} className="velvet-filter-select"><option value="">{t('search.any')}</option><option value="BROWN">{optionLabels.BROWN}</option><option value="GREEN">{optionLabels.GREEN}</option><option value="BLUE">{optionLabels.BLUE}</option></select></label>
            <label><span>{t('search.body')}</span><select value={body} onChange={(event) => setBody(event.target.value)} className="velvet-filter-select"><option value="">{t('search.any')}</option><option value="SLIM">{optionLabels.SLIM}</option><option value="CURVY">{optionLabels.CURVY}</option><option value="ATHLETIC">{optionLabels.ATHLETIC}</option></select></label>
          </div></fieldset>
        </div>
        <div className="velvet-filter-actions"><button type="button" onClick={clear}>{t('search.clear')}</button><button type="button" onClick={apply}>{t(resultCount === 1 ? 'search.showOne' : 'search.showCount', { count: resultCount })}</button></div>
      </div>
    </div> : null}
  </div>
}
