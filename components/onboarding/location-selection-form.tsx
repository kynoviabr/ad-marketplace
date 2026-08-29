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

const initialState: OnboardingLocationsActionState = { success: false, error: '' }
const zoneOrder = ['Centro', 'Zona Sul', 'Zona Oeste', 'Zona Norte', 'Zona Leste']

interface LocationSelectionFormProps {
  locations: MarketplaceLocation[]
  initialSelections: ProfileLocation[]
}

export function LocationSelectionForm({ locations, initialSelections }: LocationSelectionFormProps) {
  const [state, formAction, isPending] = useActionState(saveOnboardingLocationsAction, initialState)
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState(() => initialSelections.map((item) => item.location_id))
  const [primaryId, setPrimaryId] = useState(() => initialSelections.find((item) => item.is_primary)?.location_id ?? initialSelections[0]?.location_id ?? '')

  const locationById = useMemo(() => new Map([
    ...locations.map((location) => [location.id, location] as const),
    ...initialSelections.flatMap((item) => item.location ? [[item.location_id, item.location] as const] : []),
  ]), [locations, initialSelections])

  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
  const groupedLocations = useMemo(() => {
    const filtered = locations.filter((location) => location.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery))
    const groups = new Map<string, MarketplaceLocation[]>()
    for (const location of filtered) groups.set(location.zone, [...(groups.get(location.zone) ?? []), location])
    return [...groups.entries()].sort(([zoneA], [zoneB]) => zoneOrder.indexOf(zoneA) - zoneOrder.indexOf(zoneB))
  }, [locations, normalizedQuery])

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
        <span>regiões selecionadas</span>
      </div>

      {selectedIds.length > 0 && (
        <section className="selected-locations" aria-labelledby="selected-locations-title">
          <h2 id="selected-locations-title">Suas regiões</h2>
          <p>Escolha como principal a região onde atende com mais frequência.</p>
          <ul>
            {selectedIds.map((id) => {
              const location = locationById.get(id)
              if (!location) return null
              return (
                <li key={id} className={!location.active ? 'is-inactive' : ''}>
                  <button type="button" className="selected-location-remove" onClick={() => toggleLocation(id)} aria-label={`Remover ${location.name}`}>×</button>
                  <span><b>{location.name}</b><small>{location.active ? location.zone : 'Região indisponível — remova para continuar'}</small></span>
                  <label className="primary-location-control">
                    <input type="radio" name="primary_visual" checked={primaryId === id} onChange={() => setPrimaryId(id)} disabled={!location.active} />
                    <span>{primaryId === id ? 'Principal' : 'Tornar principal'}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {legacySelections.length > 0 && <p className="location-limit-note" role="status">Remova regiões indisponíveis antes de continuar. Elas não serão apagadas até você salvar.</p>}

      <div className="location-search-field">
        <label htmlFor="location-search">Buscar região</label>
        <input id="location-search" type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Buscar bairro ou região…" autoComplete="off" />
      </div>

      <p className="location-limit-note">Você pode selecionar até {MAX_SERVICE_AREAS} regiões. Ao atingir o limite, remova uma para escolher outra.</p>

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
                      <b>{selected ? 'Selecionada ✓' : disabled ? 'Limite atingido' : 'Selecionar'}</b>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
        {groupedLocations.length === 0 && <p className="location-empty">Nenhuma região encontrada para “{query}”.</p>}
      </div>

      <div className="onboarding-actions">
        <Link href="/onboarding/seu-perfil" className="onboarding-secondary">← Voltar</Link>
        <button type="submit" className="onboarding-primary" disabled={isPending || selectedIds.length === 0 || legacySelections.length > 0}>
          {isPending ? 'Salvando…' : 'Continuar'}<span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  )
}
