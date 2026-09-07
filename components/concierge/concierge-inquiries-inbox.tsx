'use client'

import { useState } from 'react'
import {
  getProfessionalInquiriesAction,
  getProfessionalInquiryDetailAction,
  updateProfessionalInquiryStatusAction,
} from '@/modules/concierge/actions'
import type {
  ConciergeConversationStatus,
  ConciergeInquiryDetailDTO,
  ConciergeInquiryDTO,
} from '@/modules/concierge/types'

interface ConciergeInquiriesInboxProps {
  profileId: string
  initialInquiries: ConciergeInquiryDTO[]
  locale?: string
}

export function ConciergeInquiriesInbox({
  profileId,
  initialInquiries,
  locale = 'pt-BR',
}: ConciergeInquiriesInboxProps) {
  const isPt = locale === 'pt-BR'
  const [inquiries, setInquiries] = useState<ConciergeInquiryDTO[]>(initialInquiries)
  const [selectedInquiry, setSelectedInquiry] = useState<ConciergeInquiryDetailDTO | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [filter, setFilter] = useState<'ALL' | 'HANDOFF' | 'CLOSED'>('ALL')
  const [feedback, setFeedback] = useState<string | null>(null)

  const reloadInquiries = async () => {
    const res = await getProfessionalInquiriesAction(profileId)
    if (res.success && res.data) {
      setInquiries(res.data)
    }
  }

  const handleSelectInquiry = async (convId: string) => {
    setIsLoadingDetail(true)
    setFeedback(null)
    try {
      const res = await getProfessionalInquiryDetailAction(convId, profileId)
      if (res.success && res.data) {
        setSelectedInquiry(res.data)
      } else {
        setFeedback(res.error || (isPt ? 'Erro ao carregar detalhes.' : 'Error loading details.'))
      }
    } catch {
      setFeedback(isPt ? 'Erro ao carregar conversa.' : 'Error loading conversation.')
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const handleUpdateStatus = async (status: ConciergeConversationStatus) => {
    if (!selectedInquiry) return
    setIsUpdatingStatus(true)
    try {
      const res = await updateProfessionalInquiryStatusAction(
        selectedInquiry.conversation.id,
        profileId,
        status
      )
      if (res.success) {
        setSelectedInquiry((prev) =>
          prev
            ? {
                ...prev,
                conversation: {
                  ...prev.conversation,
                  status,
                  closedAt: status === 'CLOSED' ? new Date().toISOString() : prev.conversation.closedAt,
                  handoffAt:
                    status === 'HANDOFF_COMPLETED' ? new Date().toISOString() : prev.conversation.handoffAt,
                },
              }
            : null
        )
        await reloadInquiries()
      }
    } catch {
      setFeedback(isPt ? 'Falha ao atualizar status.' : 'Failed to update status.')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const filteredInquiries = inquiries.filter((inq) => {
    if (filter === 'HANDOFF') return inq.status === 'HANDOFF_REQUESTED'
    if (filter === 'CLOSED') return inq.status === 'CLOSED'
    return true
  })

  const getStatusBadge = (status: ConciergeConversationStatus) => {
    switch (status) {
      case 'HANDOFF_REQUESTED':
        return {
          label: isPt ? 'Aguardando contato' : 'Contact requested',
          className: 'inquiry-badge-handoff',
        }
      case 'HANDOFF_COMPLETED':
        return {
          label: isPt ? 'Contato realizado' : 'Contacted',
          className: 'inquiry-badge-completed',
        }
      case 'CLOSED':
        return {
          label: isPt ? 'Encerrado' : 'Closed',
          className: 'inquiry-badge-closed',
        }
      default:
        return {
          label: isPt ? 'Em andamento' : 'Active',
          className: 'inquiry-badge-active',
        }
    }
  }

  const getIntentLabel = (intent?: string) => {
    switch (intent) {
      case 'AVAILABILITY_INQUIRY':
        return isPt ? 'Disponibilidade' : 'Availability'
      case 'RATES_INQUIRY':
        return isPt ? 'Valores' : 'Rates'
      case 'LOCATION_INQUIRY':
        return isPt ? 'Localização' : 'Location'
      case 'HANDOFF_REQUEST':
        return isPt ? 'Contato Direto' : 'Direct Contact'
      case 'SERVICE_INQUIRY':
        return isPt ? 'Serviços' : 'Services'
      default:
        return isPt ? 'Geral' : 'General'
    }
  }

  return (
    <section className="velvet-concierge-inquiries-card" aria-labelledby="inquiries-heading">
      <div className="inquiries-card-header">
        <div>
          <h2 id="inquiries-heading">
            {isPt ? 'Atendimentos Recebidos' : 'Visitor Inquiries'}
          </h2>
          <p className="inquiries-card-subtitle">
            {isPt
              ? 'Visitantes que conversaram com seu Concierge e demonstraram interesse.'
              : 'Visitors who chatted with your Concierge and showed interest.'}
          </p>
        </div>
        <div className="inquiries-filter-pills" role="tablist">
          <button
            type="button"
            className={`pill-btn ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            {isPt ? 'Todos' : 'All'} ({inquiries.length})
          </button>
          <button
            type="button"
            className={`pill-btn ${filter === 'HANDOFF' ? 'active' : ''}`}
            onClick={() => setFilter('HANDOFF')}
          >
            {isPt ? 'Aguardando Contato' : 'Handoff'}{' '}
            ({inquiries.filter((i) => i.status === 'HANDOFF_REQUESTED').length})
          </button>
          <button
            type="button"
            className={`pill-btn ${filter === 'CLOSED' ? 'active' : ''}`}
            onClick={() => setFilter('CLOSED')}
          >
            {isPt ? 'Encerrados' : 'Closed'}{' '}
            ({inquiries.filter((i) => i.status === 'CLOSED').length})
          </button>
        </div>
      </div>

      {feedback && <div className="inquiry-feedback-banner">{feedback}</div>}

      {filteredInquiries.length === 0 ? (
        <div className="inquiries-empty-state">
          <span className="empty-icon">✦</span>
          <p className="empty-title">
            {isPt ? 'Nenhum atendimento no momento' : 'No inquiries yet'}
          </p>
          <p className="empty-description">
            {isPt
              ? 'Quando visitantes interagirem com seu assistente no anúncio público, as conversas e intenções aparecerão aqui com total privacidade.'
              : 'When visitors interact with your assistant on the public profile, conversations and intents will appear here discreetly.'}
          </p>
        </div>
      ) : (
        <div className="inquiries-list">
          {filteredInquiries.map((inq) => {
            const badge = getStatusBadge(inq.status)
            const intentLabel = getIntentLabel(inq.qualification?.intentCategory)
            const formattedDate = new Intl.DateTimeFormat(locale, {
              dateStyle: 'short',
              timeStyle: 'short',
            }).format(new Date(inq.lastMessageAt))

            return (
              <article
                key={inq.id}
                className="inquiry-item"
                onClick={() => handleSelectInquiry(inq.id)}
              >
                <div className="inquiry-item-top">
                  <div className="inquiry-item-meta">
                    <span className="inquiry-pseudonym">{inq.visitorPseudonym}</span>
                    <span className="inquiry-intent-pill">{intentLabel}</span>
                  </div>
                  <span className={`inquiry-status-badge ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>

                <p className="inquiry-snippet">
                  {inq.lastMessageSnippet ||
                    (isPt ? 'Conversa iniciada' : 'Conversation started')}
                </p>

                <div className="inquiry-item-bottom">
                  <span className="inquiry-time">{formattedDate}</span>
                  <button
                    type="button"
                    className="inquiry-action-link"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectInquiry(inq.id)
                    }}
                  >
                    {isPt ? 'Ver detalhes →' : 'View details →'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Inquiry Detail Modal */}
      {(selectedInquiry || isLoadingDetail) && (
        <div
          className="inquiry-detail-backdrop"
          onClick={() => setSelectedInquiry(null)}
          role="presentation"
        >
          <div
            className="inquiry-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inquiry-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {isLoadingDetail ? (
              <div className="inquiry-detail-loading">
                <p>{isPt ? 'Carregando conversa...' : 'Loading conversation...'}</p>
              </div>
            ) : selectedInquiry ? (
              <>
                <div className="inquiry-modal-header">
                  <div>
                    <h3 id="inquiry-modal-title">
                      {selectedInquiry.conversation.visitorPseudonym}
                    </h3>
                    <span className={`inquiry-status-badge ${getStatusBadge(selectedInquiry.conversation.status).className}`}>
                      {getStatusBadge(selectedInquiry.conversation.status).label}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="inquiry-modal-close"
                    onClick={() => setSelectedInquiry(null)}
                    aria-label="Fechar"
                  >
                    ✕
                  </button>
                </div>

                {/* Qualification context */}
                {selectedInquiry.conversation.qualification && (
                  <div className="inquiry-qualification-box">
                    <h4>{isPt ? 'Resumo da Intenção' : 'Qualification Summary'}</h4>
                    <div className="qualification-grid">
                      {selectedInquiry.conversation.qualification.preferredArea && (
                        <div>
                          <small>{isPt ? 'Região de interesse:' : 'Preferred Area:'}</small>
                          <p>{selectedInquiry.conversation.qualification.preferredArea}</p>
                        </div>
                      )}
                      {selectedInquiry.conversation.qualification.preferredTimeWindow && (
                        <div>
                          <small>{isPt ? 'Horário/Data:' : 'Preferred Time:'}</small>
                          <p>{selectedInquiry.conversation.qualification.preferredTimeWindow}</p>
                        </div>
                      )}
                      {selectedInquiry.conversation.qualification.contactPreference && (
                        <div>
                          <small>{isPt ? 'Preferência de contato:' : 'Contact Preference:'}</small>
                          <p>{selectedInquiry.conversation.qualification.contactPreference}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Messages Ledger */}
                <div className="inquiry-transcript">
                  <h4>{isPt ? 'Histórico de Mensagens' : 'Message Transcript'}</h4>
                  <div className="transcript-messages">
                    {selectedInquiry.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`transcript-msg ${m.role === 'VISITOR' ? 'visitor' : 'assistant'}`}
                      >
                        <div className="transcript-bubble">
                          <span className="msg-author">
                            {m.role === 'VISITOR'
                              ? selectedInquiry.conversation.visitorPseudonym
                              : isPt
                                ? 'Assistente Virtual'
                                : 'Virtual Assistant'}
                          </span>
                          <p>{m.content}</p>
                          <span className="msg-time">
                            {new Intl.DateTimeFormat(locale, {
                              hour: '2-digit',
                              minute: '2-digit',
                            }).format(new Date(m.created_at))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Actions */}
                <div className="inquiry-modal-actions">
                  {selectedInquiry.conversation.status === 'HANDOFF_REQUESTED' && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      className="btn-status-completed"
                      onClick={() => handleUpdateStatus('HANDOFF_COMPLETED')}
                    >
                      {isPt ? 'Marcar Contato Realizado' : 'Mark Contact Completed'}
                    </button>
                  )}
                  {selectedInquiry.conversation.status !== 'CLOSED' ? (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      className="btn-status-close"
                      onClick={() => handleUpdateStatus('CLOSED')}
                    >
                      {isPt ? 'Encerrar Atendimento' : 'Close Inquiry'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      className="btn-status-reopen"
                      onClick={() => handleUpdateStatus('ACTIVE')}
                    >
                      {isPt ? 'Reabrir Atendimento' : 'Reopen Inquiry'}
                    </button>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </section>
  )
}
