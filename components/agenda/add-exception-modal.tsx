'use client'

import { useState } from 'react'
import { createAvailabilityExceptionAction } from '@/modules/agenda/actions'
import type { AvailabilityException } from '@/modules/agenda/types'

interface AddExceptionModalProps {
  profileId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: (newException: AvailabilityException) => void
  serviceAreas: Array<{ id: string; name: string; slug: string }>
  todayDate: string
  isPt: boolean
}

export function AddExceptionModal({
  profileId,
  isOpen,
  onClose,
  onSuccess,
  serviceAreas,
  todayDate,
  isPt,
}: AddExceptionModalProps) {
  const [exceptionType, setExceptionType] = useState<AvailabilityException['exceptionType']>('CLOSED_DAY')
  const [date, setDate] = useState(todayDate)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')
  const [locationId, setLocationId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!date) {
      setError(isPt ? 'Selecione uma data válida.' : 'Please select a valid date.')
      return
    }

    if (exceptionType !== 'CLOSED_DAY') {
      if (!startTime || !endTime) {
        setError(isPt ? 'Informe os horários de início e término.' : 'Please enter start and end times.')
        return
      }
      if (startTime >= endTime) {
        setError(isPt ? 'Horário de início deve ser anterior ao de término.' : 'Start time must be before end time.')
        return
      }
    }

    setIsSubmitting(true)
    try {
      const res = await createAvailabilityExceptionAction(profileId, {
        exceptionDate: date,
        exceptionType,
        startTime: exceptionType === 'CLOSED_DAY' ? null : startTime,
        endTime: exceptionType === 'CLOSED_DAY' ? null : endTime,
        locationId: locationId || null,
      })

      if (!res.success || !res.data) {
        setError(res.error || (isPt ? 'Erro ao criar exceção.' : 'Failed to create exception.'))
        return
      }

      onSuccess(res.data)
      onClose()
    } catch {
      setError(isPt ? 'Erro inesperado ao salvar exceção.' : 'Unexpected error saving exception.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="velvet-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="velvet-modal-card">
        <div className="velvet-modal-header">
          <h3 id="modal-title">{isPt ? 'Adicionar exceção' : 'Add exception'}</h3>
          <button type="button" className="velvet-modal-close" onClick={onClose} aria-label={isPt ? 'Fechar' : 'Close'}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="velvet-modal-form">
          <div className="velvet-form-group">
            <label className="velvet-label">{isPt ? 'Tipo de exceção' : 'Exception type'}</label>
            <div className="velvet-type-selector">
              <label className={`velvet-type-option ${exceptionType === 'CLOSED_DAY' ? 'is-selected' : ''}`}>
                <input
                  type="radio"
                  name="exceptionType"
                  value="CLOSED_DAY"
                  checked={exceptionType === 'CLOSED_DAY'}
                  onChange={() => setExceptionType('CLOSED_DAY')}
                />
                <span className="velvet-type-title">{isPt ? 'Dia indisponível' : 'Full day off'}</span>
                <span className="velvet-type-desc">
                  {isPt ? 'Bloqueia o dia inteiro' : 'Blocks the entire day'}
                </span>
              </label>

              <label className={`velvet-type-option ${exceptionType === 'BLOCKED_INTERVAL' ? 'is-selected' : ''}`}>
                <input
                  type="radio"
                  name="exceptionType"
                  value="BLOCKED_INTERVAL"
                  checked={exceptionType === 'BLOCKED_INTERVAL'}
                  onChange={() => setExceptionType('BLOCKED_INTERVAL')}
                />
                <span className="velvet-type-title">{isPt ? 'Bloquear horário' : 'Block interval'}</span>
                <span className="velvet-type-desc">
                  {isPt ? 'Remove um intervalo de horas' : 'Removes a specific interval'}
                </span>
              </label>

              <label className={`velvet-type-option ${exceptionType === 'CUSTOM_HOURS' ? 'is-selected' : ''}`}>
                <input
                  type="radio"
                  name="exceptionType"
                  value="CUSTOM_HOURS"
                  checked={exceptionType === 'CUSTOM_HOURS'}
                  onChange={() => setExceptionType('CUSTOM_HOURS')}
                />
                <span className="velvet-type-title">{isPt ? 'Horário especial' : 'Custom hours'}</span>
                <span className="velvet-type-desc">
                  {isPt ? 'Substitui a semana nesta data' : 'Replaces standard hours on this date'}
                </span>
              </label>
            </div>
            <p className="velvet-help-text">
              {exceptionType === 'CLOSED_DAY' && (isPt ? 'O dia selecionado ficará completamente indisponível.' : 'The selected date will have no availability.')}
              {exceptionType === 'BLOCKED_INTERVAL' && (isPt ? 'Este período será removido dos horários disponíveis daquele dia.' : 'This period will be removed from available times on that day.')}
              {exceptionType === 'CUSTOM_HOURS' && (isPt ? 'Horários especiais substituem seus horários padrão nesta data.' : 'Custom hours replace standard recurring hours on this date.')}
            </p>
          </div>

          <div className="velvet-form-group">
            <label htmlFor="ex-date" className="velvet-label">{isPt ? 'Data' : 'Date'}</label>
            <input
              id="ex-date"
              type="date"
              className="velvet-input"
              value={date}
              min={todayDate}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {exceptionType !== 'CLOSED_DAY' && (
            <div className="velvet-form-row">
              <div className="velvet-form-group">
                <label htmlFor="ex-start" className="velvet-label">{isPt ? 'Início' : 'Start'}</label>
                <input
                  id="ex-start"
                  type="time"
                  className="velvet-input"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="velvet-form-group">
                <label htmlFor="ex-end" className="velvet-label">{isPt ? 'Término' : 'End'}</label>
                <input
                  id="ex-end"
                  type="time"
                  className="velvet-input"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {serviceAreas.length > 0 && (
            <div className="velvet-form-group">
              <label htmlFor="ex-location" className="velvet-label">{isPt ? 'Região afetada (opcional)' : 'Affected region (optional)'}</label>
              <select
                id="ex-location"
                className="velvet-select"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                <option value="">{isPt ? 'Todas as regiões de atendimento' : 'All service areas'}</option>
                {serviceAreas.map((sa) => (
                  <option key={sa.id} value={sa.id}>
                    {sa.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <div className="velvet-error-alert" role="alert">{error}</div>}

          <div className="velvet-modal-actions">
            <button type="button" className="velvet-btn velvet-btn-secondary" onClick={onClose} disabled={isSubmitting}>
              {isPt ? 'Cancelar' : 'Cancel'}
            </button>
            <button type="submit" className="velvet-btn velvet-btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (isPt ? 'Adicionando...' : 'Adding...') : (isPt ? 'Adicionar exceção' : 'Add exception')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
