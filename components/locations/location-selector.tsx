'use client'

import { useState, useTransition } from 'react'
import type { Location, ProfileLocation } from '@/modules/locations/types'
import { saveProfileLocationsAction } from '@/modules/locations/actions'
import { Button } from '@/components/ui/button'

interface LocationSelectorProps {
  availableLocations: Location[]
  initialSelectedLocations: ProfileLocation[]
  onSaved?: () => void
}

export function LocationSelector({
  availableLocations,
  initialSelectedLocations,
  onSaved,
}: LocationSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialSelectedLocations.map((l) => l.location_id)
  )
  const initialPrimary = initialSelectedLocations.find((l) => l.is_primary)?.location_id
  const [primaryId, setPrimaryId] = useState<string>(initialPrimary || selectedIds[0] || '')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  )

  // Group locations by zone
  const locationsByZone: Record<string, Location[]> = {}
  for (const loc of availableLocations) {
    if (!locationsByZone[loc.zone]) {
      locationsByZone[loc.zone] = []
    }
    locationsByZone[loc.zone].push(loc)
  }

  const handleToggle = (id: string) => {
    setFeedback(null)
    if (selectedIds.includes(id)) {
      if (selectedIds.length === 1) {
        setFeedback({ type: 'error', message: 'Você deve manter pelo menos um bairro selecionado.' })
        return
      }
      const newSelected = selectedIds.filter((item) => item !== id)
      setSelectedIds(newSelected)
      if (primaryId === id) {
        setPrimaryId(newSelected[0] || '')
      }
    } else {
      if (selectedIds.length >= 5) {
        setFeedback({ type: 'error', message: 'Limite máximo de 5 bairros atingido.' })
        return
      }
      const newSelected = [...selectedIds, id]
      setSelectedIds(newSelected)
      if (!primaryId) {
        setPrimaryId(id)
      }
    }
  }

  const handleSave = () => {
    if (selectedIds.length === 0 || !primaryId) {
      setFeedback({ type: 'error', message: 'Selecione pelo menos um bairro e defina o principal.' })
      return
    }

    setFeedback(null)
    startTransition(async () => {
      const result = await saveProfileLocationsAction({
        location_ids: selectedIds,
        primary_location_id: primaryId,
      })

      if (result.success) {
        setFeedback({ type: 'success', message: 'Localizações de atendimento salvas com sucesso!' })
        if (onSaved) onSaved()
      } else {
        setFeedback({ type: 'error', message: result.error })
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h4 className="text-base font-bold text-gray-900">Bairros de Atendimento em São Paulo</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            Selecione até 5 bairros onde você atende e marque a <strong>estrela (★)</strong> no seu bairro principal.
          </p>
        </div>
        <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
          {selectedIds.length}/5 selecionados
        </span>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Zones list */}
      <div className="space-y-4">
        {Object.entries(locationsByZone).map(([zone, locs]) => (
          <div key={zone} className="space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400">{zone}</h5>
            <div className="flex flex-wrap gap-2">
              {locs.map((loc) => {
                const isSelected = selectedIds.includes(loc.id)
                const isPrimary = primaryId === loc.id

                return (
                  <div
                    key={loc.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggle(loc.id)}
                      className="cursor-pointer select-none"
                    >
                      {loc.name}
                    </button>

                    {isSelected && (
                      <button
                        type="button"
                        onClick={() => setPrimaryId(loc.id)}
                        title={isPrimary ? 'Bairro Principal' : 'Clique para tornar Bairro Principal'}
                        className={`ml-1 text-xs cursor-pointer p-0.5 rounded ${
                          isPrimary ? 'text-amber-500 font-bold' : 'text-gray-300 hover:text-amber-400'
                        }`}
                      >
                        ★
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-3 border-t">
        <Button onClick={handleSave} disabled={isPending || selectedIds.length === 0}>
          {isPending ? 'Salvando Bairros...' : 'Salvar Bairros de Atendimento'}
        </Button>
      </div>
    </div>
  )
}
