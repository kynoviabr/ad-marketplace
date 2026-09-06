'use client'

import { useState, useTransition } from 'react'
import {
  deleteAvailabilityExceptionAction,
  restoreTodayAvailabilityAction,
  saveAvailabilitySettingsAction,
  saveWeeklyScheduleAction,
  setUnavailableTodayAction,
} from '@/modules/agenda/actions'
import type {
  AvailabilityException,
  AvailabilitySettings,
  DayOfWeek,
  ProfessionalAvailabilityDashboardDTO,
  WeeklyAvailabilityRule,
} from '@/modules/agenda/types'
import { AddExceptionModal } from './add-exception-modal'

const DAY_NAMES_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface AvailabilityManagerProps {
  initialData: ProfessionalAvailabilityDashboardDTO
  locale?: string
}

export function AvailabilityManager({ initialData, locale = 'pt-BR' }: AvailabilityManagerProps) {
  const isPt = locale === 'pt-BR'
  const dayNames = isPt ? DAY_NAMES_PT : DAY_NAMES_EN

  // 1. Settings state
  const [settings, setSettings] = useState<AvailabilitySettings>(initialData.settings)
  const [isTogglingMaster, setIsTogglingMaster] = useState(false)
  const [settingsForm, setSettingsForm] = useState({
    slotDurationMinutes: initialData.settings.slotDurationMinutes,
    slotIntervalMinutes: initialData.settings.slotIntervalMinutes,
    minimumNoticeMinutes: initialData.settings.minimumNoticeMinutes,
    maximumAdvanceDays: initialData.settings.maximumAdvanceDays,
    bufferBeforeMinutes: initialData.settings.bufferBeforeMinutes,
    bufferAfterMinutes: initialData.settings.bufferAfterMinutes,
  })
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [settingsFeedback, setSettingsFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // 2. Quick action state
  const [isUnavailableToday, setIsUnavailableToday] = useState(initialData.isUnavailableToday)
  const [isTogglingToday, setIsTogglingToday] = useState(false)

  // 3. Weekly editor state
  const [weeklyRules, setWeeklyRules] = useState<WeeklyAvailabilityRule[]>(initialData.weeklyRules)
  const [selectedLocationScope, setSelectedLocationScope] = useState<string>('GLOBAL')
  const [isWeeklyDirty, setIsWeeklyDirty] = useState(false)
  const [isSavingWeekly, setIsSavingWeekly] = useState(false)
  const [weeklyFeedback, setWeeklyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // 4. Exceptions state
  const [exceptions, setExceptions] = useState<AvailabilityException[]>(initialData.upcomingExceptions)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingExceptionId, setDeletingExceptionId] = useState<string | null>(null)

  // 5. Preview state
  const [previewSlots, setPreviewSlots] = useState(initialData.previewSlots)
  const [, startTransition] = useTransition()

  // Master enable/disable toggle
  const handleToggleMaster = async () => {
    setIsTogglingMaster(true)
    setSettingsFeedback(null)
    const newEnabled = !settings.enabled
    try {
      const res = await saveAvailabilitySettingsAction(initialData.profileId, { enabled: newEnabled })
      if (res.success && res.data) {
        setSettings(res.data)
        if (!newEnabled) {
          setPreviewSlots([])
        }
      } else {
        setSettingsFeedback({ type: 'error', message: res.error || (isPt ? 'Erro ao alterar disponibilidade.' : 'Failed to update availability.') })
      }
    } catch {
      setSettingsFeedback({ type: 'error', message: isPt ? 'Erro inesperado ao alterar status.' : 'Unexpected error updating status.' })
    } finally {
      setIsTogglingMaster(false)
    }
  }

  // Quick Action: Indisponível hoje
  const handleToggleTodayUnavailable = async () => {
    setIsTogglingToday(true)
    try {
      if (isUnavailableToday) {
        const res = await restoreTodayAvailabilityAction(initialData.profileId)
        if (res.success) {
          setIsUnavailableToday(false)
          setExceptions((prev) =>
            prev.filter((ex) => !(ex.exceptionDate === initialData.todayDate && ex.exceptionType === 'CLOSED_DAY' && !ex.locationId))
          )
        }
      } else {
        const res = await setUnavailableTodayAction(initialData.profileId)
        if (res.success && res.data) {
          setIsUnavailableToday(true)
          setExceptions((prev) => {
            const filtered = prev.filter((ex) => !(ex.exceptionDate === initialData.todayDate && ex.exceptionType === 'CLOSED_DAY' && !ex.locationId))
            return [res.data!, ...filtered].sort((a, b) => a.exceptionDate.localeCompare(b.exceptionDate))
          })
          // Remove today's slots from preview
          setPreviewSlots((prev) => prev.filter((s) => s.localDate !== initialData.todayDate))
        }
      }
    } finally {
      setIsTogglingToday(false)
    }
  }

  // Weekly editor helpers
  const targetLocationId = selectedLocationScope === 'GLOBAL' ? null : selectedLocationScope

  // Filter rules for currently selected location scope
  const scopedRules = weeklyRules.filter((r) =>
    targetLocationId ? r.locationId === targetLocationId : r.locationId === null || r.locationId === undefined
  )

  const handleAddWindow = (dayOfWeek: DayOfWeek) => {
    const newRule: WeeklyAvailabilityRule = {
      profileId: initialData.profileId,
      dayOfWeek,
      startTime: '09:00',
      endTime: '18:00',
      locationId: targetLocationId,
    }
    setWeeklyRules((prev) => [...prev, newRule])
    setIsWeeklyDirty(true)
    setWeeklyFeedback(null)
  }

  const handleRemoveWindow = (dayOfWeek: DayOfWeek, indexInDay: number) => {
    // Find all rules for this day and scope
    const dayRules = scopedRules.filter((r) => r.dayOfWeek === dayOfWeek)
    const target = dayRules[indexInDay]
    if (!target) return

    setWeeklyRules((prev) => {
      const idx = prev.findIndex(
        (r) =>
          r.dayOfWeek === target.dayOfWeek &&
          r.startTime === target.startTime &&
          r.endTime === target.endTime &&
          (r.locationId ?? null) === (target.locationId ?? null)
      )
      if (idx === -1) return prev
      const clone = [...prev]
      clone.splice(idx, 1)
      return clone
    })
    setIsWeeklyDirty(true)
    setWeeklyFeedback(null)
  }

  const handleUpdateTime = (
    dayOfWeek: DayOfWeek,
    indexInDay: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    const dayRules = scopedRules.filter((r) => r.dayOfWeek === dayOfWeek)
    const target = dayRules[indexInDay]
    if (!target) return

    setWeeklyRules((prev) => {
      const idx = prev.findIndex(
        (r) =>
          r.dayOfWeek === target.dayOfWeek &&
          r.startTime === target.startTime &&
          r.endTime === target.endTime &&
          (r.locationId ?? null) === (target.locationId ?? null)
      )
      if (idx === -1) return prev
      const updated = { ...prev[idx], [field]: value }
      const clone = [...prev]
      clone[idx] = updated
      return clone
    })
    setIsWeeklyDirty(true)
    setWeeklyFeedback(null)
  }

  // Save weekly schedule
  const handleSaveWeekly = async () => {
    setIsSavingWeekly(true)
    setWeeklyFeedback(null)

    // Validate intervals
    for (const rule of weeklyRules) {
      if (rule.startTime >= rule.endTime) {
        setWeeklyFeedback({
          type: 'error',
          message: isPt
            ? `No dia ${dayNames[rule.dayOfWeek]}, o início (${rule.startTime}) deve ser anterior ao término (${rule.endTime}).`
            : `On ${dayNames[rule.dayOfWeek]}, start time (${rule.startTime}) must be before end time (${rule.endTime}).`,
        })
        setIsSavingWeekly(false)
        return
      }
    }

    try {
      const rulesToSave = weeklyRules.map((r) => ({
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        locationId: r.locationId ?? null,
      }))

      const res = await saveWeeklyScheduleAction(initialData.profileId, rulesToSave)
      if (res.success && res.data) {
        setWeeklyRules(res.data)
        setIsWeeklyDirty(false)
        setWeeklyFeedback({
          type: 'success',
          message: isPt ? 'Horários da semana salvos com sucesso.' : 'Weekly hours saved successfully.',
        })
      } else {
        setWeeklyFeedback({
          type: 'error',
          message: res.error || (isPt ? 'Erro ao salvar horários.' : 'Failed to save hours.'),
        })
      }
    } catch {
      setWeeklyFeedback({
        type: 'error',
        message: isPt ? 'Erro inesperado ao salvar semana.' : 'Unexpected error saving weekly hours.',
      })
    } finally {
      setIsSavingWeekly(false)
    }
  }

  // Save advanced settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingSettings(true)
    setSettingsFeedback(null)

    try {
      const res = await saveAvailabilitySettingsAction(initialData.profileId, settingsForm)
      if (res.success && res.data) {
        setSettings(res.data)
        setSettingsFeedback({
          type: 'success',
          message: isPt ? 'Configurações salvas com sucesso.' : 'Settings saved successfully.',
        })
      } else {
        setSettingsFeedback({
          type: 'error',
          message: res.error || (isPt ? 'Erro ao salvar configurações.' : 'Failed to save settings.'),
        })
      }
    } catch {
      setSettingsFeedback({
        type: 'error',
        message: isPt ? 'Erro inesperado ao salvar configurações.' : 'Unexpected error saving settings.',
      })
    } finally {
      setIsSavingSettings(false)
    }
  }

  // Delete exception
  const handleDeleteException = async (exceptionId?: string) => {
    if (!exceptionId) return
    const confirmed = window.confirm(isPt ? 'Deseja remover esta exceção?' : 'Remove this exception?')
    if (!confirmed) return

    setDeletingExceptionId(exceptionId)
    try {
      const res = await deleteAvailabilityExceptionAction(initialData.profileId, exceptionId)
      if (res.success) {
        setExceptions((prev) => prev.filter((ex) => ex.id !== exceptionId))
      }
    } finally {
      setDeletingExceptionId(null)
    }
  }

  return (
    <div className="velvet-agenda-container">
      {/* SECTION A: STATUS / MASTER CONTROL & QUICK ACTION */}
      <section className="velvet-card velvet-status-card" aria-labelledby="status-title">
        <div className="velvet-status-main">
          <div className="velvet-status-info">
            <p className="dashboard-eyebrow">{isPt ? 'STATUS DA DISPONIBILIDADE' : 'AVAILABILITY STATUS'}</p>
            <h2 id="status-title">
              {settings.enabled
                ? (isPt ? 'Disponibilidade ativa' : 'Availability active')
                : (isPt ? 'Disponibilidade pausada' : 'Availability paused')}
            </h2>
            <p className="velvet-status-desc">
              {settings.enabled
                ? (isPt
                    ? 'Quando ativa, a Velvet pode usar seus horários configurados para mostrar sinais discretos de disponibilidade e, futuramente, auxiliar no atendimento.'
                    : 'When active, Velvet may use your configured hours to show discreet availability signals and assist with future inquiry workflows.')
                : (isPt
                    ? 'Seus horários configurados continuam salvos, mas nenhum sinal ou horário é exibido publicamente enquanto pausada.'
                    : 'Your configured schedule remains saved, but no signals or hours are shown publicly while paused.')}
            </p>
            <p className="velvet-timezone-meta">
              <span>🌐</span> {isPt ? 'Fuso horário:' : 'Timezone:'} <strong>Brasília (America/Sao_Paulo)</strong>
            </p>
          </div>

          <div className="velvet-status-switch-wrap">
            <button
              type="button"
              role="switch"
              aria-checked={settings.enabled}
              aria-label={isPt ? 'Ativar ou pausar disponibilidade' : 'Toggle availability'}
              onClick={handleToggleMaster}
              disabled={isTogglingMaster}
              className={`velvet-master-switch ${settings.enabled ? 'is-active' : ''}`}
            >
              <span className="velvet-switch-slider" />
              <span className="velvet-switch-text">
                {settings.enabled ? (isPt ? 'ATIVA' : 'ON') : (isPt ? 'PAUSADA' : 'OFF')}
              </span>
            </button>
          </div>
        </div>

        {/* Quick Action: Indisponível Hoje */}
        <div className="velvet-quick-action-bar">
          <div className="velvet-quick-action-info">
            <strong>{isPt ? 'Ação rápida:' : 'Quick action:'}</strong>
            <span>
              {isUnavailableToday
                ? (isPt ? 'Você está marcada como indisponível hoje.' : 'You are currently marked unavailable today.')
                : (isPt ? 'Precisa de uma folga hoje? Bloqueie com um clique.' : 'Need today off? Block with one click.')}
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleTodayUnavailable}
            disabled={isTogglingToday}
            className={`velvet-btn ${isUnavailableToday ? 'velvet-btn-outline' : 'velvet-btn-quick-off'}`}
          >
            {isTogglingToday
              ? (isPt ? 'Atualizando...' : 'Updating...')
              : isUnavailableToday
              ? (isPt ? 'Restaurar disponibilidade de hoje' : 'Restore today’s availability')
              : (isPt ? 'Indisponível hoje' : 'Unavailable today')}
          </button>
        </div>
      </section>

      {/* SECTION B: STANDARD WEEKLY HOURS */}
      <section className="velvet-card velvet-weekly-card" aria-labelledby="weekly-title">
        <div className="velvet-card-header">
          <div>
            <p className="dashboard-eyebrow">{isPt ? 'ROTINA SEMANAL' : 'WEEKLY ROUTINE'}</p>
            <h2 id="weekly-title">{isPt ? 'Semana padrão' : 'Standard weekly hours'}</h2>
            <p className="velvet-card-subtitle">
              {isPt
                ? 'Defina os dias e períodos em que você costuma estar disponível para atendimento.'
                : 'Set the days and time windows when you are usually available.'}
            </p>
          </div>

          {/* Location Scope Selector */}
          {initialData.serviceAreas.length > 0 && (
            <div className="velvet-scope-control">
              <label htmlFor="scope-select" className="velvet-label-inline">
                {isPt ? 'Região:' : 'Scope:'}
              </label>
              <select
                id="scope-select"
                value={selectedLocationScope}
                onChange={(e) => {
                  setSelectedLocationScope(e.target.value)
                  setWeeklyFeedback(null)
                }}
                className="velvet-select velvet-select-compact"
              >
                <option value="GLOBAL">{isPt ? 'Todas as regiões (Padrão geral)' : 'All regions (General default)'}</option>
                {initialData.serviceAreas.map((sa) => (
                  <option key={sa.id} value={sa.id}>
                    {sa.name} {sa.isPrimary ? (isPt ? '(Principal)' : '(Primary)') : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {initialData.serviceAreas.length > 0 && selectedLocationScope !== 'GLOBAL' && (
          <div className="velvet-scope-notice">
            <span>ℹ️</span> {isPt
              ? 'Horários específicos de uma região substituem os horários gerais nessa região.'
              : 'Specific hours for a region override general hours in that region.'}
          </div>
        )}

        {/* Days List */}
        <div className="velvet-days-list">
          {([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]).map((dow) => {
            const dayWindows = scopedRules.filter((r) => r.dayOfWeek === dow)
            const hasWindows = dayWindows.length > 0

            return (
              <div key={dow} className={`velvet-day-row ${hasWindows ? 'is-open' : 'is-closed'}`}>
                <div className="velvet-day-header">
                  <span className="velvet-day-name">{dayNames[dow]}</span>
                  <span className="velvet-day-status-pill">
                    {hasWindows ? (isPt ? 'Ativo' : 'Active') : (isPt ? 'Sem atendimento' : 'Closed')}
                  </span>
                </div>

                <div className="velvet-day-content">
                  {hasWindows ? (
                    <div className="velvet-windows-list">
                      {dayWindows.map((win, idx) => {
                        const isInvalid = win.startTime >= win.endTime
                        return (
                          <div key={idx} className="velvet-window-item">
                            <div className="velvet-time-inputs">
                              <input
                                type="time"
                                className="velvet-time-input"
                                value={win.startTime}
                                aria-label={`${dayNames[dow]} início`}
                                onChange={(e) => handleUpdateTime(dow, idx, 'startTime', e.target.value)}
                              />
                              <span className="velvet-time-separator">{isPt ? 'até' : 'to'}</span>
                              <input
                                type="time"
                                className="velvet-time-input"
                                value={win.endTime}
                                aria-label={`${dayNames[dow]} término`}
                                onChange={(e) => handleUpdateTime(dow, idx, 'endTime', e.target.value)}
                              />
                            </div>

                            <button
                              type="button"
                              className="velvet-remove-btn"
                              onClick={() => handleRemoveWindow(dow, idx)}
                              aria-label={`${isPt ? 'Remover horário de' : 'Remove slot on'} ${dayNames[dow]}`}
                            >
                              ✕
                            </button>

                            {isInvalid && (
                              <p className="velvet-input-warning">
                                {isPt ? 'Início deve ser menor que o fim.' : 'Start must be before end.'}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="velvet-empty-day-note">
                      {isPt ? 'Nenhum horário cadastrado para este dia.' : 'No hours configured for this day.'}
                    </p>
                  )}

                  <div className="velvet-day-actions">
                    <button
                      type="button"
                      className="velvet-add-window-btn"
                      onClick={() => handleAddWindow(dow)}
                    >
                      {isPt ? '+ Adicionar horário' : '+ Add time slot'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Weekly Save Controls */}
        <div className="velvet-save-bar">
          <div className="velvet-save-status">
            {isWeeklyDirty && (
              <span className="velvet-dirty-badge">
                ● {isPt ? 'Alterações não salvas' : 'Unsaved changes'}
              </span>
            )}
            {weeklyFeedback && (
              <span className={`velvet-feedback-badge is-${weeklyFeedback.type}`}>
                {weeklyFeedback.message}
              </span>
            )}
          </div>

          <button
            type="button"
            className="velvet-btn velvet-btn-primary velvet-btn-lg"
            onClick={handleSaveWeekly}
            disabled={!isWeeklyDirty || isSavingWeekly}
          >
            {isSavingWeekly
              ? (isPt ? 'Salvando...' : 'Saving...')
              : (isPt ? 'Salvar horários' : 'Save hours')}
          </button>
        </div>
      </section>

      {/* SECTION C: UPCOMING CALCULATED PREVIEW */}
      <section className="velvet-card velvet-preview-card" aria-labelledby="preview-title">
        <div className="velvet-card-header">
          <div>
            <p className="dashboard-eyebrow">{isPt ? 'PRÉVIA DA DISPONIBILIDADE' : 'AVAILABILITY PREVIEW'}</p>
            <h2 id="preview-title">{isPt ? 'Próximos horários calculados' : 'Upcoming calculated times'}</h2>
            <p className="velvet-card-subtitle">
              {isPt
                ? 'Prévia dos seus próximos horários gerados pelo motor de agenda para os próximos 7 dias.'
                : 'Preview of your upcoming times generated by the availability engine for the next 7 days.'}
            </p>
          </div>
        </div>

        {!settings.enabled ? (
          <div className="velvet-preview-paused">
            <p>{isPt ? 'A disponibilidade está pausada. Nenhum horário é gerado ou exibido.' : 'Availability is paused. No slots are generated or shown.'}</p>
          </div>
        ) : previewSlots.length === 0 ? (
          <div className="velvet-preview-empty">
            <p>{isPt ? 'Nenhum horário disponível nos próximos dias. Adicione horários na semana padrão para calcular a prévia.' : 'No available slots in the next days. Add standard hours to calculate preview.'}</p>
          </div>
        ) : (
          <div className="velvet-slots-grid">
            {previewSlots.map((slot, i) => (
              <div key={i} className="velvet-slot-card">
                <div className="velvet-slot-date">
                  {slot.localDate === initialData.todayDate
                    ? (isPt ? 'Hoje' : 'Today')
                    : slot.localDate}
                </div>
                <div className="velvet-slot-time">
                  {slot.localStartTime} — {slot.localEndTime}
                </div>
                {slot.locationName && (
                  <div className="velvet-slot-loc">{slot.locationName}</div>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="velvet-preview-disclaimer">
          🔒 {isPt
            ? 'Esta é apenas uma prévia interna para você. Visitantes públicos não veem sua grade completa de horários, apenas sinais discretos de atendimento.'
            : 'This is an internal preview for you. Public visitors do not see your full schedule, only discreet availability signals.'}
        </p>
      </section>

      {/* SECTION D: EXCEPTIONS & BLOCKS */}
      <section className="velvet-card velvet-exceptions-card" aria-labelledby="exceptions-title">
        <div className="velvet-card-header">
          <div>
            <p className="dashboard-eyebrow">{isPt ? 'EXCEÇÕES PONTUAIS' : 'DATE EXCEPTIONS'}</p>
            <h2 id="exceptions-title">{isPt ? 'Exceções e bloqueios' : 'Exceptions & blocks'}</h2>
            <p className="velvet-card-subtitle">
              {isPt
                ? 'Datas específicas com dias de folga, intervalos bloqueados ou horários especiais.'
                : 'Specific dates with days off, blocked intervals, or custom hours.'}
            </p>
          </div>
          <button
            type="button"
            className="velvet-btn velvet-btn-secondary"
            onClick={() => setIsModalOpen(true)}
          >
            {isPt ? '+ Nova exceção' : '+ New exception'}
          </button>
        </div>

        {exceptions.length === 0 ? (
          <p className="velvet-empty-text">
            {isPt ? 'Nenhuma exceção futura cadastrada.' : 'No upcoming exceptions scheduled.'}
          </p>
        ) : (
          <div className="velvet-exceptions-list">
            {exceptions.map((ex) => (
              <div key={ex.id} className="velvet-exception-item">
                <div className="velvet-exception-info">
                  <div className="velvet-exception-date">{ex.exceptionDate}</div>
                  <div className="velvet-exception-meta">
                    <span className={`velvet-badge velvet-badge--${ex.exceptionType === 'CLOSED_DAY' ? 'danger' : ex.exceptionType === 'BLOCKED_INTERVAL' ? 'warning' : 'neutral'}`}>
                      {ex.exceptionType === 'CLOSED_DAY'
                        ? (isPt ? 'Dia indisponível' : 'Full day off')
                        : ex.exceptionType === 'BLOCKED_INTERVAL'
                        ? (isPt ? `Bloqueio: ${ex.startTime}–${ex.endTime}` : `Block: ${ex.startTime}–${ex.endTime}`)
                        : (isPt ? `Horário especial: ${ex.startTime}–${ex.endTime}` : `Custom hours: ${ex.startTime}–${ex.endTime}`)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="velvet-remove-btn"
                  onClick={() => handleDeleteException(ex.id)}
                  disabled={deletingExceptionId === ex.id}
                  aria-label={isPt ? 'Excluir exceção' : 'Delete exception'}
                >
                  {deletingExceptionId === ex.id ? '...' : '✕'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION E: ADVANCED SETTINGS (COLLAPSIBLE) */}
      <details className="velvet-card velvet-advanced-details">
        <summary className="velvet-advanced-summary">
          <div>
            <p className="dashboard-eyebrow">{isPt ? 'PREFERÊNCIAS OPERACIONAIS' : 'OPERATING PREFERENCES'}</p>
            <h2>{isPt ? 'Configurações avançadas' : 'Advanced settings'}</h2>
          </div>
          <span className="velvet-summary-arrow">▼</span>
        </summary>

        <form onSubmit={handleSaveSettings} className="velvet-advanced-form">
          <div className="velvet-form-grid">
            <div className="velvet-form-group">
              <label htmlFor="slot-duration" className="velvet-label">{isPt ? 'Duração do horário' : 'Slot duration'}</label>
              <select
                id="slot-duration"
                className="velvet-select"
                value={settingsForm.slotDurationMinutes}
                onChange={(e) => setSettingsForm({ ...settingsForm, slotDurationMinutes: Number(e.target.value) })}
              >
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min (1 hora)</option>
                <option value={90}>90 min (1h 30m)</option>
                <option value={120}>120 min (2 horas)</option>
              </select>
            </div>

            <div className="velvet-form-group">
              <label htmlFor="slot-interval" className="velvet-label">{isPt ? 'Intervalo entre inícios' : 'Slot interval'}</label>
              <select
                id="slot-interval"
                className="velvet-select"
                value={settingsForm.slotIntervalMinutes}
                onChange={(e) => setSettingsForm({ ...settingsForm, slotIntervalMinutes: Number(e.target.value) })}
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
              </select>
              <p className="velvet-help-text">{isPt ? 'A cada quanto tempo um novo horário pode começar.' : 'How often a new slot can start.'}</p>
            </div>

            <div className="velvet-form-group">
              <label htmlFor="min-notice" className="velvet-label">{isPt ? 'Antecedência mínima' : 'Minimum notice'}</label>
              <select
                id="min-notice"
                className="velvet-select"
                value={settingsForm.minimumNoticeMinutes}
                onChange={(e) => setSettingsForm({ ...settingsForm, minimumNoticeMinutes: Number(e.target.value) })}
              >
                <option value={0}>{isPt ? 'Sem mínimo' : 'No minimum'}</option>
                <option value={60}>{isPt ? '1 hora' : '1 hour'}</option>
                <option value={120}>{isPt ? '2 horas (padrão)' : '2 hours (default)'}</option>
                <option value={240}>{isPt ? '4 horas' : '4 hours'}</option>
                <option value={720}>{isPt ? '12 horas' : '12 hours'}</option>
                <option value={1440}>{isPt ? '24 horas' : '24 hours'}</option>
              </select>
            </div>

            <div className="velvet-form-group">
              <label htmlFor="max-advance" className="velvet-label">{isPt ? 'Mostrar disponibilidade até' : 'Maximum advance days'}</label>
              <select
                id="max-advance"
                className="velvet-select"
                value={settingsForm.maximumAdvanceDays}
                onChange={(e) => setSettingsForm({ ...settingsForm, maximumAdvanceDays: Number(e.target.value) })}
              >
                <option value={7}>{isPt ? '7 dias' : '7 days'}</option>
                <option value={14}>{isPt ? '14 dias' : '14 days'}</option>
                <option value={30}>{isPt ? '30 dias (padrão)' : '30 days (default)'}</option>
                <option value={60}>{isPt ? '60 dias' : '60 days'}</option>
                <option value={90}>{isPt ? '90 dias' : '90 days'}</option>
              </select>
            </div>

            <div className="velvet-form-group">
              <label htmlFor="buffer-before" className="velvet-label">{isPt ? 'Margem antes (preparação)' : 'Buffer before'}</label>
              <select
                id="buffer-before"
                className="velvet-select"
                value={settingsForm.bufferBeforeMinutes}
                onChange={(e) => setSettingsForm({ ...settingsForm, bufferBeforeMinutes: Number(e.target.value) })}
              >
                <option value={0}>0 min</option>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>

            <div className="velvet-form-group">
              <label htmlFor="buffer-after" className="velvet-label">{isPt ? 'Margem depois (descanso)' : 'Buffer after'}</label>
              <select
                id="buffer-after"
                className="velvet-select"
                value={settingsForm.bufferAfterMinutes}
                onChange={(e) => setSettingsForm({ ...settingsForm, bufferAfterMinutes: Number(e.target.value) })}
              >
                <option value={0}>0 min</option>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>
          </div>

          <p className="velvet-help-text velvet-buffer-explainer">
            {isPt
              ? 'Preparação para futuras integrações de agenda. Esses valores serão usados ao considerar períodos ocupados.'
              : 'Preparation for future calendar integrations. These values will be applied when evaluating busy intervals.'}
          </p>

          <div className="velvet-save-bar">
            {settingsFeedback && (
              <span className={`velvet-feedback-badge is-${settingsFeedback.type}`}>
                {settingsFeedback.message}
              </span>
            )}
            <button
              type="submit"
              className="velvet-btn velvet-btn-primary"
              disabled={isSavingSettings}
            >
              {isSavingSettings
                ? (isPt ? 'Salvando...' : 'Saving...')
                : (isPt ? 'Salvar configurações' : 'Save settings')}
            </button>
          </div>
        </form>
      </details>

      {/* Add Exception Modal Dialog */}
      <AddExceptionModal
        profileId={initialData.profileId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newEx) => {
          setExceptions((prev) => [...prev, newEx].sort((a, b) => a.exceptionDate.localeCompare(b.exceptionDate)))
        }}
        serviceAreas={initialData.serviceAreas}
        todayDate={initialData.todayDate}
        isPt={isPt}
      />
    </div>
  )
}
