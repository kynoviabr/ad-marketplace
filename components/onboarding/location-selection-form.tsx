'use client'

import { useActionState, useMemo, useState } from 'react'
import Link from 'next/link'
import { FormMessage } from '@/components/ui/form-message'
import { MAX_SERVICE_AREAS } from '@/modules/locations/schemas'
import {
  saveOnboardingLocationsAction,
  type OnboardingLocationsActionState,
} from '@/modules/locations/actions'
import type { MarketplaceLocation, ProfileLocation } from '@/modules/locations/types'
import { useI18n } from '@/components/i18n'

const initialState: OnboardingLocationsActionState = { success: false, error: '' }
const zoneOrder = ['Centro', 'Zona Sul', 'Zona Oeste', 'Zona Norte', 'Zona Leste']

interface LocationSelectionFormProps {
  locations: MarketplaceLocation[]
  initialSelections: ProfileLocation[]
}

export function LocationSelectionForm({ locations, initialSelections }: LocationSelectionFormProps) {
  const { locale, t } = useI18n()
  const [state, formAction, isPending] = useActionState(saveOnboardingLocationsAction, initialState)
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState(() => initialSelections.map((item) => item.location_id))
  const [primaryId, setPrimaryId] = useState(() => initialSelections.find((item) => item.is_primary)?.location_id ?? initialSelections[0]?.location_id ?? '')

  const locationById = useMemo(() => new Map([
    ...locations.map((location) => [location.id, location] as const),
    ...initialSelections.flatMap((item) => item.location ? [[item.location_id, item.location] as const] : []),
  ]), [locations, initialSelections])

  const normalizedQuery = query.trim().toLocaleLowerCase(locale === 'en' ? 'en-US' : 'pt-BR')
  const groupedLocations = useMemo(() => {
    const filtered = locations.filter((location) => location.name.toLocaleLowerCase(locale === 'en' ? 'en-US' : 'pt-BR').includes(normalizedQuery))
    const groups = new Map<string, MarketplaceLocation[]>()
    for (const location of filtered) groups.set(location.zone, [...(groups.get(location.zone) ?? []), location])
    return [...groups.entries()].sort(([zoneA], [zoneB]) => zoneOrder.indexOf(zoneA) - zoneOrder.indexOf(zoneB))
  }, [locations, normalizedQuery, locale])

  const toggleLocation = (locationId: string) => {
    if (selectedIds.includes(locationId)) {
      const remaining = selectedIds.filter((id) => id !== locationId)
      setSelectedIds(remaining)
      if (primaryId === locationId) setPrimaryId(remaining[0] ?? '')
      return
    }
    if (selectedIds.length >= MAX_SERVICE_AREAS) return
    setSelectedIds([...selectedIds, locationId])
    if (!primaryId) setPrimaryId(locationId)
  }

  const atLimit = selectedIds.length >= MAX_SERVICE_AREAS
  const legacySelections = initialSelections.filter((item) => item.location && !item.location.active && selectedIds.includes(item.location_id))
  const selectionError = !state.success ? state.fieldErrors?.location_ids?.[0] ?? state.fieldErrors?.primary_location_id?.[0] : undefined

  return (
    <form action={formAction} className="location-selection-form" noValidate>
      {selectedIds.map((id) => <input key={id} type="hidden" name="location_ids" value={id} />)}
      <input type="hidden" name="primary_location_id" value={primaryId} />

      {!state.success && state.error && <FormMessage type="error" message={selectionError ?? state.error} />}

      <div className="location-selection-summary" aria-live="polite">
        <strong>{selectedIds.length} de {MAX_SERVICE_AREAS}</strong>
        <span>{t('locations.selected')}</span>
      </div>

      {selectedIds.length > 0 && (
        <section className="selected-locations" aria-labelledby="selected-locations-title">
          <h2 id="selected-locations-title">{t('locations.yourAreas')}</h2>
          <p>{t('locations.primaryHelp')}</p>
          <ul>
            {selectedIds.map((id) => {
              const location = locationById.get(id)
              if (!location) return null
              return (
                <li key={id} className={!location.active ? 'is-inactive' : ''}>
                  <button type="button" className="selected-location-remove" onClick={() => toggleLocation(id)} aria-label={`Remover ${location.name}`}>×</button>
                  <span><b>{location.name}</b><small>{location.active ? location.zone : t('locations.unavailable')}</small></span>
                  <label className="primary-location-control">
                    <input type="radio" name="primary_visual" checked={primaryId === id} onChange={() => setPrimaryId(id)} disabled={!location.active} />
                    <span>{primaryId === id ? t('locations.primary') : t('locations.makePrimary')}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {legacySelections.length > 0 && <p className="location-limit-note" role="status">{t('locations.removeUnavailable')}</p>}

      <div className="location-search-field">
        <label htmlFor="location-search">{t('locations.search')}</label>
        <input id="location-search" type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder={t('locations.searchPlaceholder')} autoComplete="off" />
      </div>

      <p className="location-limit-note">{t('locations.limit', { count: MAX_SERVICE_AREAS })}</p>

      <div className="location-groups">
        {groupedLocations.map(([zone, zoneLocations]) => (
          <section key={zone} className="location-zone" aria-labelledby={`zone-${zone.replaceAll(' ', '-').toLowerCase()}`}>
            <h2 id={`zone-${zone.replaceAll(' ', '-').toLowerCase()}`}>{zone}</h2>
            <ul>
              {zoneLocations.map((location) => {
                const selected = selectedIds.includes(location.id)
                const disabled = atLimit && !selected
                return (
                  <li key={location.id}>
                    <button type="button" className={`location-option ${selected ? 'is-selected' : ''}`} onClick={() => toggleLocation(location.id)} disabled={disabled} aria-pressed={selected}>
                      <span>{location.name}</span>
                      <b>{selected ? t('locations.chosen') : disabled ? t('locations.limitReached') : t('locations.select')}</b>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
        {groupedLocations.length === 0 && <p className="location-empty">{t('locations.empty', { query })}</p>}
      </div>

      <div className="onboarding-actions">
        <Link href="/onboarding/seu-perfil" className="onboarding-secondary">← {t('common.back')}</Link>
        <button type="submit" className="onboarding-primary" disabled={isPending || selectedIds.length === 0 || legacySelections.length > 0}>
          {isPending ? t('onboarding.saving') : t('common.continue')}<span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  )
}
