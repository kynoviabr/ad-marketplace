'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAccount } from '@/modules/auth/dal'
import { logEvent } from '@/modules/observability/logger'
import {
  deleteConciergeFaq,
  getConciergeFaqs,
  getConciergeSettings,
  getConversationMessages,
  getOrCreateConversation,
  getProfessionalInquiries,
  getProfessionalInquiryDetail,
  saveConciergeFaq,
  updateConciergeSettings,
  updateConversationStatus,
  updateProfessionalInquiryStatus,
} from './dal'
import { isWebPublicConciergeReady } from './gate'
import { processConciergeTurn } from './runtime'
import type {
  ConciergeConversation,
  ConciergeConversationStatus,
  ConciergeInquiryDetailDTO,
  ConciergeInquiryDTO,
  ConciergeMessage,
  ConciergeRuntimeResult,
  ConciergeTone,
  ProfessionalConciergeFaq,
  ProfessionalConciergeSettings,
} from './types'

export interface ConciergeActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

async function assertProfileOwnership(profileId: string): Promise<{ accountId: string; isAdmin: boolean }> {
  const account = await requireAccount()
  const isAdmin = account.role === 'ADMIN'

  if (isAdmin) {
    return { accountId: account.id, isAdmin: true }
  }

  const admin = createAdminClient()
  const { data: profile, error } = await admin
    .from('professional_profiles')
    .select('id, account_user_id')
    .eq('id', profileId)
    .maybeSingle()

  if (error || !profile || profile.account_user_id !== account.id) {
    throw new Error('Não autorizado: você não possui permissão para gerenciar este concierge.')
  }

  return { accountId: account.id, isAdmin: false }
}

export async function updateConciergeSettingsAction(
  profileId: string,
  formData: {
    enabled: boolean
    assistant_display_name: string
    welcome_message: string
    tone: ConciergeTone
    qualification_enabled: boolean
    handoff_enabled: boolean
  }
): Promise<ConciergeActionResult<ProfessionalConciergeSettings>> {
  try {
    await assertProfileOwnership(profileId)

    const displayName = formData.assistant_display_name?.trim() || 'Assistente Virtual'
    const welcome = formData.welcome_message?.trim() || ''

    if (displayName.length > 50) {
      return { success: false, error: 'O nome de exibição deve ter no máximo 50 caracteres.' }
    }
    if (welcome.length > 500) {
      return { success: false, error: 'A mensagem de boas-vindas deve ter no máximo 500 caracteres.' }
    }

    const validTones: ConciergeTone[] = ['PROFESSIONAL', 'WARM', 'DIRECT', 'DISCREET']
    const tone = validTones.includes(formData.tone) ? formData.tone : 'PROFESSIONAL'

    const updated = await updateConciergeSettings(profileId, {
      enabled: Boolean(formData.enabled),
      assistant_display_name: displayName,
      welcome_message: welcome,
      tone,
      qualification_enabled: Boolean(formData.qualification_enabled),
      handoff_enabled: Boolean(formData.handoff_enabled),
    })

    revalidatePath('/dashboard/concierge')
    return { success: true, data: updated }
  } catch (err: any) {
    logEvent('ERROR', 'ai.concierge.settings_update_failed', {
      subsystem: 'AI',
      metadata: { profileId, message: err?.message },
      error: err,
    })
    return { success: false, error: err?.message || 'Falha ao atualizar configurações.' }
  }
}

export async function saveConciergeFaqAction(
  profileId: string,
  faq: {
    id?: string
    question: string
    answer: string
    enabled?: boolean
    sort_order?: number
  }
): Promise<ConciergeActionResult<ProfessionalConciergeFaq>> {
  try {
    await assertProfileOwnership(profileId)

    const question = faq.question?.trim() || ''
    const answer = faq.answer?.trim() || ''

    if (question.length < 3 || question.length > 200) {
      return { success: false, error: 'A pergunta deve ter entre 3 e 200 caracteres.' }
    }
    if (answer.length < 3 || answer.length > 1000) {
      return { success: false, error: 'A resposta deve ter entre 3 e 1000 caracteres.' }
    }

    const saved = await saveConciergeFaq(profileId, {
      id: faq.id,
      question,
      answer,
      enabled: faq.enabled ?? true,
      sort_order: faq.sort_order ?? 0,
    })

    revalidatePath('/dashboard/concierge')
    return { success: true, data: saved }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao salvar FAQ.' }
  }
}

export async function deleteConciergeFaqAction(
  profileId: string,
  faqId: string
): Promise<ConciergeActionResult<void>> {
  try {
    await assertProfileOwnership(profileId)
    await deleteConciergeFaq(profileId, faqId)
    revalidatePath('/dashboard/concierge')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao excluir FAQ.' }
  }
}

export async function getTestChatStateAction(
  profileId: string
): Promise<ConciergeActionResult<{ conversation: ConciergeConversation; messages: ConciergeMessage[] }>> {
  try {
    await assertProfileOwnership(profileId)
    const testSessionId = `test_owner_${profileId}`
    const conversation = await getOrCreateConversation(profileId, testSessionId, 'INTERNAL_TEST', true)
    const messages = await getConversationMessages(conversation.id)
    return { success: true, data: { conversation, messages } }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao carregar chat de teste.' }
  }
}

export async function sendTestChatMessageAction(
  profileId: string,
  message: string
): Promise<ConciergeActionResult<ConciergeRuntimeResult>> {
  try {
    await assertProfileOwnership(profileId)

    const testSessionId = `test_owner_${profileId}`
    const conversation = await getOrCreateConversation(profileId, testSessionId, 'INTERNAL_TEST', true)

    const result = await processConciergeTurn({
      conversation,
      visitorMessage: message,
      isTest: true,
    })

    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao enviar mensagem de teste.' }
  }
}

export async function resetTestConversationAction(
  profileId: string
): Promise<ConciergeActionResult<void>> {
  try {
    await assertProfileOwnership(profileId)

    const testSessionId = `test_owner_${profileId}`
    const admin = createAdminClient()

    // Find and close existing test conversation
    const { data: conv } = await admin
      .from('concierge_conversations')
      .select('id')
      .eq('profile_id', profileId)
      .eq('visitor_session_id', testSessionId)
      .eq('is_test', true)
      .maybeSingle()

    if (conv) {
      await updateConversationStatus(conv.id, 'CLOSED')
      // Delete closed test messages so new test session starts clean
      await admin.from('concierge_messages').delete().eq('conversation_id', conv.id)
      await admin.from('concierge_conversations').delete().eq('id', conv.id)
    }

    revalidatePath('/dashboard/concierge')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao reiniciar conversa de teste.' }
  }
}

export async function getProfessionalInquiriesAction(
  profileId: string,
  options?: { isTest?: boolean }
): Promise<ConciergeActionResult<ConciergeInquiryDTO[]>> {
  try {
    await assertProfileOwnership(profileId)
    const inquiries = await getProfessionalInquiries(profileId, options)
    return { success: true, data: inquiries }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao carregar atendimentos.' }
  }
}

export async function getProfessionalInquiryDetailAction(
  conversationId: string,
  profileId: string
): Promise<ConciergeActionResult<ConciergeInquiryDetailDTO>> {
  try {
    await assertProfileOwnership(profileId)
    const detail = await getProfessionalInquiryDetail(conversationId, profileId)
    return { success: true, data: detail }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao carregar detalhes do atendimento.' }
  }
}

export async function updateProfessionalInquiryStatusAction(
  conversationId: string,
  profileId: string,
  status: ConciergeConversationStatus
): Promise<ConciergeActionResult<void>> {
  try {
    await assertProfileOwnership(profileId)
    await updateProfessionalInquiryStatus(conversationId, profileId, status)
    revalidatePath('/dashboard/concierge')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao atualizar status do atendimento.' }
  }
}

export async function sendPublicChatMessageAction(
  profileId: string,
  visitorSessionId: string,
  message: string
): Promise<ConciergeActionResult<ConciergeRuntimeResult>> {
  try {
    // Gate: server-side readiness check (Sections 33, 34, 35, 36)
    const readiness = await isWebPublicConciergeReady(profileId)
    if (!readiness.ready) {
      return {
        success: false,
        error: 'O assistente virtual público não está ativo no momento.',
      }
    }

    if (!visitorSessionId || visitorSessionId.length < 16) {
      return { success: false, error: 'Sessão de visitante inválida.' }
    }

    const conversation = await getOrCreateConversation(profileId, visitorSessionId, 'WEB_PUBLIC', false)
    const result = await processConciergeTurn({
      conversation,
      visitorMessage: message,
      isTest: false,
    })

    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao processar mensagem.' }
  }
}

