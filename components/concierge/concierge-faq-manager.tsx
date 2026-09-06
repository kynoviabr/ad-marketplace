'use client'

import { useState } from 'react'
import { deleteConciergeFaqAction, saveConciergeFaqAction } from '@/modules/concierge/actions'
import { MAX_FAQS_PER_PROFILE } from '@/modules/concierge/constants'
import type { ProfessionalConciergeFaq } from '@/modules/concierge/types'

interface ConciergeFaqManagerProps {
  profileId: string
  initialFaqs: ProfessionalConciergeFaq[]
  locale?: string
}

export function ConciergeFaqManager({
  profileId,
  initialFaqs,
  locale = 'pt-BR',
}: ConciergeFaqManagerProps) {
  const isPt = locale === 'pt-BR'

  const [faqs, setFaqs] = useState<ProfessionalConciergeFaq[]>(initialFaqs)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')

  const [editQuestion, setEditQuestion] = useState('')
  const [editAnswer, setEditAnswer] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const canAddMore = faqs.length < MAX_FAQS_PER_PROFILE

  const handleCreateFaq = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canAddMore) {
      setFeedback({
        type: 'error',
        message: isPt
          ? `Limite de ${MAX_FAQS_PER_PROFILE} perguntas atingido.`
          : `Maximum limit of ${MAX_FAQS_PER_PROFILE} FAQs reached.`,
      })
      return
    }

    if (newQuestion.trim().length < 3 || newAnswer.trim().length < 3) {
      setFeedback({
        type: 'error',
        message: isPt
          ? 'Pergunta e resposta devem ter pelo menos 3 caracteres.'
          : 'Question and answer must be at least 3 characters.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const res = await saveConciergeFaqAction(profileId, {
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
        sort_order: faqs.length,
      })

      if (res.success && res.data) {
        setFaqs([...faqs, res.data])
        setNewQuestion('')
        setNewAnswer('')
        setIsAdding(false)
        setFeedback({
          type: 'success',
          message: isPt ? 'Pergunta cadastrada com sucesso.' : 'FAQ added successfully.',
        })
      } else {
        setFeedback({
          type: 'error',
          message: res.error || (isPt ? 'Erro ao cadastrar pergunta.' : 'Error adding FAQ.'),
        })
      }
    } catch {
      setFeedback({
        type: 'error',
        message: isPt ? 'Erro inesperado.' : 'Unexpected error.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (faq: ProfessionalConciergeFaq) => {
    setEditingId(faq.id)
    setEditQuestion(faq.question)
    setEditAnswer(faq.answer)
    setFeedback(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditQuestion('')
    setEditAnswer('')
  }

  const handleUpdateFaq = async (faqId: string) => {
    if (editQuestion.trim().length < 3 || editAnswer.trim().length < 3) {
      setFeedback({
        type: 'error',
        message: isPt
          ? 'Pergunta e resposta devem ter pelo menos 3 caracteres.'
          : 'Question and answer must be at least 3 characters.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const res = await saveConciergeFaqAction(profileId, {
        id: faqId,
        question: editQuestion.trim(),
        answer: editAnswer.trim(),
      })

      if (res.success && res.data) {
        setFaqs(faqs.map((f) => (f.id === faqId ? res.data! : f)))
        setEditingId(null)
        setFeedback({
          type: 'success',
          message: isPt ? 'Pergunta atualizada com sucesso.' : 'FAQ updated successfully.',
        })
      } else {
        setFeedback({
          type: 'error',
          message: res.error || (isPt ? 'Erro ao atualizar pergunta.' : 'Error updating FAQ.'),
        })
      }
    } catch {
      setFeedback({
        type: 'error',
        message: isPt ? 'Erro inesperado.' : 'Unexpected error.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteFaq = async (faqId: string) => {
    if (!confirm(isPt ? 'Deseja realmente excluir esta pergunta?' : 'Are you sure you want to delete this FAQ?')) {
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const res = await deleteConciergeFaqAction(profileId, faqId)
      if (res.success) {
        setFaqs(faqs.filter((f) => f.id !== faqId))
        setFeedback({
          type: 'success',
          message: isPt ? 'Pergunta excluída.' : 'FAQ deleted.',
        })
      } else {
        setFeedback({
          type: 'error',
          message: res.error || (isPt ? 'Erro ao excluir.' : 'Error deleting FAQ.'),
        })
      }
    } catch {
      setFeedback({
        type: 'error',
        message: isPt ? 'Erro inesperado.' : 'Unexpected error.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="velvet-card velvet-concierge-faqs-card">
      <div className="velvet-status-main">
        <div className="velvet-status-info">
          <p className="dashboard-eyebrow">
            {isPt ? 'BASE DE CONHECIMENTO PERSONALIZADA' : 'CUSTOM KNOWLEDGE BASE'}
          </p>
          <h2>{isPt ? 'Perguntas Frequentes' : 'Frequently Asked Questions'}</h2>
          <p className="velvet-status-desc">
            {isPt
              ? 'Ensine respostas específicas sobre seu estilo de atendimento, preferências de contato e orientações habituais.'
              : 'Teach specific answers about your appointment style, contact preferences, and customary guidance.'}
          </p>
        </div>

        <div className="velvet-faq-count-badge">
          <span className="faq-count-text">
            {faqs.length}/{MAX_FAQS_PER_PROFILE}
          </span>
          <span className="faq-count-label">{isPt ? 'cadastradas' : 'configured'}</span>
        </div>
      </div>

      {feedback && (
        <div
          role="alert"
          className={`velvet-feedback ${feedback.type === 'success' ? 'feedback-success' : 'feedback-error'}`}
          style={{ marginTop: '20px' }}
        >
          {feedback.message}
        </div>
      )}

      {/* FAQs List */}
      <div className="velvet-faqs-list">
        {faqs.length === 0 && !isAdding && (
          <p className="velvet-empty-state">
            {isPt
              ? 'Nenhuma pergunta frequente cadastrada ainda. O assistente usará apenas as informações públicas do seu perfil.'
              : 'No FAQs added yet. The assistant will rely solely on your profile public details.'}
          </p>
        )}

        {faqs.map((faq, index) => {
          const isEditing = editingId === faq.id

          return (
            <div key={faq.id} className="velvet-faq-item">
              {isEditing ? (
                <div className="velvet-faq-edit-form">
                  <div className="velvet-form-group">
                    <label className="velvet-label">{isPt ? 'Pergunta' : 'Question'}</label>
                    <input
                      type="text"
                      maxLength={200}
                      value={editQuestion}
                      onChange={(e) => setEditQuestion(e.target.value)}
                      className="velvet-input"
                    />
                  </div>
                  <div className="velvet-form-group">
                    <label className="velvet-label">{isPt ? 'Resposta' : 'Answer'}</label>
                    <textarea
                      rows={3}
                      maxLength={1000}
                      value={editAnswer}
                      onChange={(e) => setEditAnswer(e.target.value)}
                      className="velvet-textarea"
                    />
                  </div>
                  <div className="velvet-inline-actions">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleUpdateFaq(faq.id)}
                      className="velvet-button velvet-button-primary velvet-btn-sm"
                    >
                      {submitting ? (isPt ? 'Salvando...' : 'Saving...') : (isPt ? 'Salvar' : 'Save')}
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={cancelEdit}
                      className="velvet-button velvet-button-secondary velvet-btn-sm"
                    >
                      {isPt ? 'Cancelar' : 'Cancel'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="velvet-faq-content">
                  <div className="velvet-faq-header">
                    <span className="velvet-faq-index">#{index + 1}</span>
                    <h4 className="velvet-faq-question">{faq.question}</h4>
                    <div className="velvet-faq-actions">
                      <button
                        type="button"
                        onClick={() => startEdit(faq)}
                        className="velvet-btn-link"
                        aria-label={isPt ? `Editar ${faq.question}` : `Edit ${faq.question}`}
                      >
                        {isPt ? 'Editar' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFaq(faq.id)}
                        className="velvet-btn-link velvet-btn-danger"
                        aria-label={isPt ? `Excluir ${faq.question}` : `Delete ${faq.question}`}
                      >
                        {isPt ? 'Excluir' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  <p className="velvet-faq-answer">{faq.answer}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add FAQ section */}
      {!isAdding && canAddMore && (
        <div className="velvet-faq-add-trigger">
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="velvet-button velvet-button-secondary"
          >
            {isPt ? '+ Adicionar Pergunta Frequente' : '+ Add Frequently Asked Question'}
          </button>
        </div>
      )}

      {!canAddMore && (
        <p className="velvet-field-hint" style={{ marginTop: '16px' }}>
          {isPt
            ? `Limite máximo de ${MAX_FAQS_PER_PROFILE} perguntas atingido.`
            : `Maximum limit of ${MAX_FAQS_PER_PROFILE} FAQs reached.`}
        </p>
      )}

      {isAdding && (
        <form onSubmit={handleCreateFaq} className="velvet-faq-create-card">
          <h3 className="velvet-subheading">
            {isPt ? 'Nova Pergunta Frequente' : 'New Frequently Asked Question'}
          </h3>

          <div className="velvet-form-group">
            <label htmlFor="new-faq-question" className="velvet-label">
              {isPt ? 'Pergunta' : 'Question'}
            </label>
            <input
              id="new-faq-question"
              type="text"
              maxLength={200}
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              className="velvet-input"
              placeholder={isPt ? 'Ex: Como funciona o agendamento?' : 'E.g., How does scheduling work?'}
              required
            />
          </div>

          <div className="velvet-form-group">
            <label htmlFor="new-faq-answer" className="velvet-label">
              {isPt ? 'Resposta' : 'Answer'}
            </label>
            <textarea
              id="new-faq-answer"
              rows={3}
              maxLength={1000}
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              className="velvet-textarea"
              placeholder={
                isPt
                  ? 'Ex: O agendamento é feito diretamente pelo meu WhatsApp com antecedência mínima de 2 horas.'
                  : 'E.g., Scheduling is arranged directly via my WhatsApp with at least 2 hours notice.'
              }
              required
            />
          </div>

          <div className="velvet-inline-actions">
            <button
              type="submit"
              disabled={submitting}
              className="velvet-button velvet-button-primary velvet-btn-sm"
            >
              {submitting ? (isPt ? 'Cadastrando...' : 'Saving...') : (isPt ? 'Cadastrar Pergunta' : 'Add FAQ')}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setIsAdding(false)
                setNewQuestion('')
                setNewAnswer('')
              }}
              className="velvet-button velvet-button-secondary velvet-btn-sm"
            >
              {isPt ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
