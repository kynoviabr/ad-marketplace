'use client'

import { useEffect, useRef, useState } from 'react'
import { sendPublicChatMessageAction } from '@/modules/concierge/actions'

interface PublicConciergeChatProps {
  profileId: string
  stageName: string
  locale?: string
}

interface ChatMessage {
  id: string
  role: 'assistant' | 'visitor'
  text: string
  handoffRequested?: boolean
}

export function PublicConciergeChat({
  profileId,
  stageName,
  locale = 'pt-BR',
}: PublicConciergeChatProps) {
  const isPt = locale === 'pt-BR'
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: isPt
        ? `Olá! Sou a assistente virtual de ${stageName}. Posso esclarecer dúvidas sobre os bairros de atendimento, serviços descritos no perfil e horários de disponibilidade pública. Como posso ajudar?`
        : `Hello! I am ${stageName}'s virtual assistant. I can answer questions about service areas, profile services, and public availability. How can I help?`,
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [visitorSessionId, setVisitorSessionId] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const getOrInitSession = () => {
    if (visitorSessionId) return visitorSessionId
    const storageKey = `velvet_visitor_session_${profileId}`
    let sid = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null
    if (!sid || sid.length < 16) {
      sid = `v_${Date.now()}_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, sid)
      }
    }
    setVisitorSessionId(sid)
    return sid
  }

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    const sid = getOrInitSession()
    if (!text || isLoading || !sid) return

    const userMsgId = `user_${Date.now()}`
    setMessages((prev) => [...prev, { id: userMsgId, role: 'visitor', text }])
    setInput('')
    setIsLoading(true)

    try {
      const res = await sendPublicChatMessageAction(profileId, sid, text)
      if (res.success && res.data) {
        setMessages((prev) => [
          ...prev,
          {
            id: res.data!.assistantMessageId || `ast_${Date.now()}`,
            role: 'assistant',
            text: res.data!.replyText,
            handoffRequested: res.data!.handoffRequested,
          },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            role: 'assistant',
            text:
              res.error ||
              (isPt
                ? 'Desculpe, não foi possível responder no momento. Por favor, utilize os canais diretos de contato do perfil.'
                : 'Sorry, unable to respond at this time. Please use direct profile contact channels.'),
          },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          text: isPt
            ? 'Erro de conexão. Por favor, tente novamente ou entre em contato diretamente.'
            : 'Connection error. Please try again or reach out directly.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Floating discreet trigger (Section 37) */}
      <aside className="velvet-concierge-floating-wrap" aria-label="Assistente Virtual">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="velvet-concierge-trigger"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <span className="concierge-trigger-icon" aria-hidden="true">
            ✦
          </span>
          <span className="concierge-trigger-text">
            {isPt ? 'Perguntar à assistente' : 'Ask assistant'}
          </span>
        </button>
      </aside>

      {/* Modal / Bottom Sheet Panel (Sections 38, 39) */}
      {isOpen && (
        <div
          className="velvet-concierge-modal-backdrop"
          onClick={() => setIsOpen(false)}
          role="presentation"
        >
          <div
            className="velvet-concierge-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="concierge-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="concierge-modal-header">
              <div className="concierge-modal-header-info">
                <span className="concierge-badge">
                  {isPt ? 'ASSISTENTE VIRTUAL' : 'VIRTUAL ASSISTANT'}
                </span>
                <h3 id="concierge-modal-title">
                  {isPt ? `Assistente de ${stageName}` : `${stageName}'s Assistant`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="concierge-modal-close"
                aria-label={isPt ? 'Fechar assistente' : 'Close assistant'}
              >
                ✕
              </button>
            </div>

            <div className="concierge-disclaimer-banner">
              {isPt
                ? '✦ A assistente tira dúvidas sobre serviços e disponibilidade. Valores e agendamentos são combinados diretamente com a profissional.'
                : '✦ Assistant answers service and availability questions. Rates and appointments are arranged directly with the professional.'}
            </div>

            <div className="concierge-messages-list">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`concierge-chat-msg ${msg.role === 'assistant' ? 'assistant' : 'visitor'}`}
                >
                  <div className="msg-bubble">
                    <p>{msg.text}</p>
                    {msg.handoffRequested && (
                      <div className="msg-handoff-action">
                        <small>
                          {isPt
                            ? 'Deseja atendimento direto?'
                            : 'Want direct contact?'}
                        </small>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="concierge-chat-msg assistant">
                  <div className="msg-bubble loading">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="concierge-input-form">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isPt
                    ? 'Ex: Tem horário disponível amanhã?'
                    : 'E.g. Are you available tomorrow?'
                }
                disabled={isLoading}
                maxLength={500}
                className="concierge-input"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="concierge-send-btn"
              >
                {isPt ? 'Enviar' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
