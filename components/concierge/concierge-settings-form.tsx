'use client'

import { useState } from 'react'
import { updateConciergeSettingsAction } from '@/modules/concierge/actions'
import type { ConciergeTone, ProfessionalConciergeSettings } from '@/modules/concierge/types'

interface ConciergeSettingsFormProps {
  profileId: string
  initialSettings: ProfessionalConciergeSettings
  locale?: string
}

export function ConciergeSettingsForm({
  profileId,
  initialSettings,
  locale = 'pt-BR',
}: ConciergeSettingsFormProps) {
  const isPt = locale === 'pt-BR'

  const [settings, setSettings] = useState<ProfessionalConciergeSettings>(initialSettings)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [displayName, setDisplayName] = useState(settings.assistant_display_name || 'Assistente Virtual')
  const [welcomeMessage, setWelcomeMessage] = useState(settings.welcome_message || '')
  const [tone, setTone] = useState<ConciergeTone>(settings.tone || 'PROFESSIONAL')
  const [qualificationEnabled, setQualificationEnabled] = useState(settings.qualification_enabled)
  const [handoffEnabled, setHandoffEnabled] = useState(settings.handoff_enabled)
  const [enabled, setEnabled] = useState(settings.enabled)

  const handleMasterToggle = async () => {
    const nextState = !enabled
    setEnabled(nextState)
    setIsSubmitting(true)
    setFeedback(null)

    try {
      const res = await updateConciergeSettingsAction(profileId, {
        enabled: nextState,
        assistant_display_name: displayName,
        welcome_message: welcomeMessage,
        tone,
        qualification_enabled: qualificationEnabled,
        handoff_enabled: handoffEnabled,
      })

      if (res.success && res.data) {
        setSettings(res.data)
        setFeedback({
          type: 'success',
          message: nextState
            ? isPt
              ? 'Concierge ativado com sucesso.'
              : 'Concierge enabled successfully.'
            : isPt
              ? 'Concierge pausado.'
              : 'Concierge paused.',
        })
      } else {
        setEnabled(!nextState)
        setFeedback({
          type: 'error',
          message: res.error || (isPt ? 'Erro ao alternar status.' : 'Failed to toggle status.'),
        })
      }
    } catch {
      setEnabled(!nextState)
      setFeedback({
        type: 'error',
        message: isPt ? 'Erro inesperado.' : 'Unexpected error.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFeedback(null)

    try {
      const res = await updateConciergeSettingsAction(profileId, {
        enabled,
        assistant_display_name: displayName,
        welcome_message: welcomeMessage,
        tone,
        qualification_enabled: qualificationEnabled,
        handoff_enabled: handoffEnabled,
      })

      if (res.success && res.data) {
        setSettings(res.data)
        setFeedback({
          type: 'success',
          message: isPt
            ? 'Configurações do Concierge salvas com sucesso.'
            : 'Concierge settings saved successfully.',
        })
      } else {
        setFeedback({
          type: 'error',
          message: res.error || (isPt ? 'Erro ao salvar configurações.' : 'Failed to save settings.'),
        })
      }
    } catch {
      setFeedback({
        type: 'error',
        message: isPt ? 'Erro inesperado ao salvar.' : 'Unexpected error while saving.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="velvet-card velvet-concierge-settings-card">
      <div className="velvet-status-main">
        <div className="velvet-status-info">
          <p className="dashboard-eyebrow">
            {isPt ? 'DISPONIBILIDADE DO CONCIERGE' : 'CONCIERGE AVAILABILITY'}
          </p>
          <h2>{enabled ? (isPt ? 'Concierge Ativo' : 'Concierge Active') : (isPt ? 'Concierge Pausado' : 'Concierge Paused')}</h2>
          <p className="velvet-status-desc">
            {enabled
              ? isPt
                ? 'Seu assistente virtual está pronto para responder perguntas públicas e orientar visitantes.'
                : 'Your virtual assistant is active to answer public inquiries and guide visitors.'
              : isPt
                ? 'O assistente está pausado. Nenhuma resposta automatizada será gerada para contatos.'
                : 'The assistant is paused. No automated replies will be generated for inquiries.'}
          </p>
        </div>

        <div className="velvet-status-switch-wrap">
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={isPt ? 'Habilitar assistente virtual' : 'Enable virtual assistant'}
            disabled={isSubmitting}
            onClick={handleMasterToggle}
            className={`velvet-master-switch ${enabled ? 'is-active' : 'is-inactive'}`}
          >
            <span className="switch-indicator" aria-hidden="true" />
            <span className="switch-text">{enabled ? (isPt ? 'ATIVO' : 'ACTIVE') : (isPt ? 'PAUSADO' : 'PAUSED')}</span>
          </button>
        </div>
      </div>

      <hr className="velvet-divider" />

      <form onSubmit={handleSubmit} className="velvet-concierge-form">
        {feedback && (
          <div
            role="alert"
            className={`velvet-feedback ${feedback.type === 'success' ? 'feedback-success' : 'feedback-error'}`}
          >
            {feedback.message}
          </div>
        )}

        <div className="velvet-form-group">
          <label htmlFor="assistant-name" className="velvet-label">
            {isPt ? 'Nome de exibição do assistente' : 'Assistant display name'}
          </label>
          <input
            id="assistant-name"
            type="text"
            maxLength={50}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="velvet-input"
            placeholder={isPt ? 'Assistente Virtual' : 'Virtual Assistant'}
          />
          <span className="velvet-field-hint">
            {isPt
              ? 'Como o assistente se apresentará aos visitantes (máx. 50 caracteres).'
              : 'How the assistant introduces itself to visitors (max 50 characters).'}
          </span>
        </div>

        <div className="velvet-form-group">
          <label htmlFor="welcome-message" className="velvet-label">
            {isPt ? 'Mensagem de boas-vindas' : 'Welcome message'}
          </label>
          <textarea
            id="welcome-message"
            rows={3}
            maxLength={500}
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            className="velvet-textarea"
            placeholder={
              isPt
                ? 'Olá! Sou o assistente virtual. Como posso ajudar você hoje?'
                : 'Hello! I am the virtual assistant. How can I help you today?'
            }
          />
          <span className="velvet-field-hint">
            {isPt
              ? 'Primeira mensagem enviada quando o visitante abre o atendimento (máx. 500 caracteres).'
              : 'First message sent when a visitor opens the chat (max 500 characters).'}
          </span>
        </div>

        <div className="velvet-form-group">
          <label htmlFor="tone-select" className="velvet-label">
            {isPt ? 'Tom da conversa' : 'Conversation tone'}
          </label>
          <select
            id="tone-select"
            value={tone}
            onChange={(e) => setTone(e.target.value as ConciergeTone)}
            className="velvet-select"
          >
            <option value="PROFESSIONAL">
              {isPt ? 'Profissional e polido' : 'Professional & polished'}
            </option>
            <option value="WARM">
              {isPt ? 'Caloroso e acolhedor' : 'Warm & welcoming'}
            </option>
            <option value="DIRECT">
              {isPt ? 'Direto e conciso' : 'Direct & concise'}
            </option>
            <option value="DISCREET">
              {isPt ? 'Discreto e reservado' : 'Discreet & reserved'}
            </option>
          </select>
          <span className="velvet-field-hint">
            {isPt
              ? 'Define o estilo e o vocabulário das respostas geradas pelo assistente.'
              : 'Defines the tone and phrasing style of generated assistant replies.'}
          </span>
        </div>

        <div className="velvet-concierge-toggle-row">
          <label className="velvet-checkbox-label">
            <input
              type="checkbox"
              checked={qualificationEnabled}
              onChange={(e) => setQualificationEnabled(e.target.checked)}
            />
            <div className="checkbox-text">
              <strong>{isPt ? 'Qualificação de interesse' : 'Inquiry qualification'}</strong>
              <p>
                {isPt
                  ? 'Identifica intenções e preferências do contato (bairro, horários, canal) antes da transferência.'
                  : 'Identifies inquiry preferences (area, schedule, channel) before direct contact.'}
              </p>
            </div>
          </label>
        </div>

        <div className="velvet-concierge-toggle-row">
          <label className="velvet-checkbox-label">
            <input
              type="checkbox"
              checked={handoffEnabled}
              onChange={(e) => setHandoffEnabled(e.target.checked)}
            />
            <div className="checkbox-text">
              <strong>{isPt ? 'Transferência para contato humano' : 'Human handoff'}</strong>
              <p>
                {isPt
                  ? 'Permite que o assistente oriente o cliente a continuar a conversa com você no WhatsApp.'
                  : 'Allows the assistant to guide the visitor to continue the conversation directly on WhatsApp.'}
              </p>
            </div>
          </label>
        </div>

        <div className="velvet-form-actions">
          <button
            type="submit"
            disabled={isSubmitting}
            className="velvet-button velvet-button-primary"
          >
            {isSubmitting
              ? isPt
                ? 'Salvando...'
                : 'Saving...'
              : isPt
                ? 'Salvar configurações'
                : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
