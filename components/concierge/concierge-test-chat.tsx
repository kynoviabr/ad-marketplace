'use client'

import { useEffect, useRef, useState } from 'react'
import {
  getTestChatStateAction,
  resetTestConversationAction,
  sendTestChatMessageAction,
} from '@/modules/concierge/actions'
import type { ConciergeMessage, ConciergeRuntimeResult } from '@/modules/concierge/types'

interface ConciergeTestChatProps {
  profileId: string
  assistantDisplayName: string
  locale?: string
}

export function ConciergeTestChat({
  profileId,
  assistantDisplayName,
  locale = 'pt-BR',
}: ConciergeTestChatProps) {
  const isPt = locale === 'pt-BR'

  const [messages, setMessages] = useState<ConciergeMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [latestResult, setLatestResult] = useState<ConciergeRuntimeResult | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load test conversation state on mount
  useEffect(() => {
    let mounted = true
    async function loadTestChat() {
      setInitializing(true)
      try {
        const res = await getTestChatStateAction(profileId)
        if (mounted && res.success && res.data) {
          setMessages(res.data.messages)
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || (isPt ? 'Erro ao carregar chat de teste.' : 'Failed to load test chat.'))
        }
      } finally {
        if (mounted) setInitializing(false)
      }
    }

    loadTestChat()
    return () => {
      mounted = false
    }
  }, [profileId, isPt])

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = inputText.trim()
    if (!trimmed || loading) return

    setInputText('')
    setError(null)
    setLoading(true)

    // Optimistic visitor message
    const tempId = `temp_${Date.now()}`
    const optimisticMsg: ConciergeMessage = {
      id: tempId,
      conversation_id: 'test',
      role: 'VISITOR',
      message_type: 'TEXT',
      content: trimmed,
      metadata: {},
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, optimisticMsg])

    try {
      const res = await sendTestChatMessageAction(profileId, trimmed)
      if (res.success && res.data) {
        setLatestResult(res.data)
        const assistantMsg: ConciergeMessage = {
          id: res.data.assistantMessageId || `asst_${Date.now()}`,
          conversation_id: 'test',
          role: 'ASSISTANT',
          message_type: 'TEXT',
          content: res.data.replyText,
          metadata: {},
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, assistantMsg])
      } else {
        setError(res.error || (isPt ? 'Erro ao gerar resposta do assistente.' : 'Error generating assistant reply.'))
      }
    } catch {
      setError(isPt ? 'Erro inesperado na comunicação.' : 'Unexpected communication error.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetChat = async () => {
    if (!confirm(isPt ? 'Deseja reiniciar a conversa de teste?' : 'Do you want to reset the test conversation?')) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await resetTestConversationAction(profileId)
      if (res.success) {
        setMessages([])
        setLatestResult(null)
      } else {
        setError(res.error || (isPt ? 'Erro ao reiniciar conversa.' : 'Failed to reset chat.'))
      }
    } catch {
      setError(isPt ? 'Erro ao reiniciar conversa.' : 'Error resetting chat.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="velvet-card velvet-concierge-test-card">
      <div className="velvet-test-header">
        <div className="velvet-test-title-wrap">
          <div className="velvet-test-badge-row">
            <span className="velvet-badge velvet-badge-test">
              {isPt ? 'MODO DE TESTE' : 'TEST MODE'}
            </span>
            <span className="velvet-test-label">
              {assistantDisplayName || (isPt ? 'Assistente Virtual' : 'Virtual Assistant')}
            </span>
          </div>
          <h2>{isPt ? 'Simulador do Concierge' : 'Concierge Simulator'}</h2>
          <p className="velvet-test-disclaimer">
            {isPt
              ? 'Esta conversa é apenas uma prévia interna e não será enviada a clientes reais. Use para testar perguntas, tom de resposta e transferência.'
              : 'This conversation is an internal preview and will never be sent to real clients. Use it to test questions, tone, and handoff flows.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetChat}
          disabled={loading || messages.length === 0}
          className="velvet-button velvet-button-secondary velvet-btn-sm"
          title={isPt ? 'Limpar histórico e começar de novo' : 'Clear history and start fresh'}
        >
          {isPt ? 'Reiniciar Teste' : 'Reset Test'}
        </button>
      </div>

      {error && (
        <div role="alert" className="velvet-feedback feedback-error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Simulator Window */}
      <div className="velvet-chat-console" role="region" aria-label={isPt ? 'Área de mensagens de teste' : 'Test messages area'}>
        <div className="velvet-chat-messages">
          {initializing && (
            <p className="velvet-chat-placeholder">
              {isPt ? 'Carregando simulador...' : 'Loading simulator...'}
            </p>
          )}

          {!initializing && messages.length === 0 && (
            <div className="velvet-chat-placeholder">
              <p className="placeholder-title">
                {isPt ? 'Nenhuma mensagem enviada.' : 'No messages sent yet.'}
              </p>
              <p className="placeholder-desc">
                {isPt
                  ? 'Envie uma mensagem abaixo para simular a interação de um visitante (ex: "Onde você atende?", "Qual o horário?", "Quero falar no WhatsApp").'
                  : 'Send a message below to simulate a visitor interaction (e.g., "Where are you located?", "What are your hours?", "Can I talk on WhatsApp?").'}
              </p>
            </div>
          )}

          {messages.map((msg) => {
            const isVisitor = msg.role === 'VISITOR'
            return (
              <div
                key={msg.id}
                className={`velvet-chat-row ${isVisitor ? 'is-user' : 'is-assistant'}`}
              >
                <div className="velvet-chat-bubble">
                  <div className="bubble-author">
                    {isVisitor
                      ? isPt
                        ? 'Você (Visitante de Teste)'
                        : 'You (Test Visitor)'
                      : assistantDisplayName || (isPt ? 'Assistente' : 'Assistant')}
                  </div>
                  <div className="bubble-text">{msg.content}</div>
                </div>
              </div>
            )
          })}

          {loading && (
            <div className="velvet-chat-row is-assistant">
              <div className="velvet-chat-bubble is-loading">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Status / metadata inspection banner if intent or handoff occurred */}
        {latestResult && (
          <div className="velvet-chat-meta-bar">
            {latestResult.handoffRequested && (
              <span className="meta-pill pill-handoff">
                {isPt ? '⚡ Transferência Solicitada' : '⚡ Handoff Requested'}
              </span>
            )}
            {latestResult.qualification?.intentCategory && (
              <span className="meta-pill pill-intent">
                {isPt ? 'Intenção: ' : 'Intent: '}
                <code>{latestResult.qualification.intentCategory}</code>
              </span>
            )}
            {latestResult.qualification?.preferredArea && (
              <span className="meta-pill pill-area">
                {isPt ? 'Bairro: ' : 'Area: '}
                {latestResult.qualification.preferredArea}
              </span>
            )}
          </div>
        )}

        {/* Composer */}
        <form onSubmit={handleSendMessage} className="velvet-chat-composer">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isPt
                ? 'Digite uma mensagem de teste e pressione Enter...'
                : 'Type a test message and press Enter...'
            }
            maxLength={1000}
            disabled={loading}
            className="velvet-chat-input"
            aria-label={isPt ? 'Mensagem para o assistente de teste' : 'Message for test assistant'}
          />
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="velvet-chat-send-btn"
            aria-label={isPt ? 'Enviar mensagem' : 'Send message'}
          >
            {isPt ? 'Enviar' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}
