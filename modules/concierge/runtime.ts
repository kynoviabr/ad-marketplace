/**
 * Concierge Conversation Runtime & Orchestrator — PX5 Foundation
 *
 * Coordinates message ingestion, safety pre-flight, prompt assembly,
 * model inference, server tool execution, qualification persistence,
 * and structured observability.
 */

import 'server-only'
import { MAX_USER_MESSAGE_LENGTH } from './constants'
import {
  getConciergeFaqs,
  getConciergeSettings,
  getConversationMessages,
  getPublicProfileContextFacts,
  saveConciergeMessage,
  updateConversationQualification,
  updateConversationStatus,
} from './dal'
import { generateConciergeReply } from './provider'
import { executeConciergeToolsBatch } from './tools'
import type {
  ConciergeConversation,
  ConciergeModelResponse,
  ConciergeRuntimeResult,
  InquiryIntent,
} from './types'
import { logEvent } from '@/modules/observability/logger'

export interface ProcessTurnInput {
  conversation: ConciergeConversation
  visitorMessage: string
  isTest?: boolean
}

export async function processConciergeTurn(
  input: ProcessTurnInput
): Promise<ConciergeRuntimeResult> {
  const { conversation, isTest = false } = input
  const rawMessage = input.visitorMessage.trim()

  // 1. Enforce length bounds
  const visitorMessage =
    rawMessage.length > MAX_USER_MESSAGE_LENGTH
      ? rawMessage.slice(0, MAX_USER_MESSAGE_LENGTH)
      : rawMessage

  const profileId = conversation.profile_id

  // 2. Persist visitor message
  await saveConciergeMessage(conversation.id, 'VISITOR', visitorMessage, {
    channel: conversation.channel,
    is_test: isTest,
  })

  // 3. Gather context facts, settings, FAQs, and recent history
  const [settings, faqs, facts, history] = await Promise.all([
    getConciergeSettings(profileId),
    getConciergeFaqs(profileId),
    getPublicProfileContextFacts(profileId),
    getConversationMessages(conversation.id),
  ])

  // 4. Generate reply via provider abstraction
  const modelResponse: ConciergeModelResponse = await generateConciergeReply({
    conversationId: conversation.id,
    profileId,
    visitorMessage,
    settings,
    faqs,
    facts,
    history,
    isTest,
  })

  let finalReply = modelResponse.replyText
  const detectedIntent: InquiryIntent = modelResponse.intent || 'GENERAL'
  let handoffRequested = Boolean(modelResponse.handoffRequested)

  // 5. Execute any suggested tools via server registry
  if (modelResponse.toolRequests && modelResponse.toolRequests.length > 0) {
    const toolResults = executeConciergeToolsBatch(modelResponse.toolRequests, facts)
    for (const res of toolResults) {
      if (res.result && typeof res.result === 'object' && 'handoff_requested' in res.result) {
        handoffRequested = true
      }
    }
  }

  // 6. Handle Handoff State Transition
  let newStatus = conversation.status
  if (handoffRequested && conversation.status === 'ACTIVE') {
    newStatus = 'HANDOFF_REQUESTED'
    await updateConversationStatus(conversation.id, 'HANDOFF_REQUESTED', new Date().toISOString())
    logEvent('INFO', 'ai.concierge.handoff_requested', {
      subsystem: 'AI',
      metadata: { conversationId: conversation.id, profileId, isTest },
    })
  }

  // 7. Update qualification if present
  if (modelResponse.qualificationUpdate) {
    await updateConversationQualification(conversation.id, modelResponse.qualificationUpdate)
  }

  // 8. Persist assistant message
  const assistantMsg = await saveConciergeMessage(
    conversation.id,
    'ASSISTANT',
    finalReply,
    {
      intent: detectedIntent,
      handoff_requested: handoffRequested,
      is_test: isTest,
    },
    'TEXT'
  )

  logEvent('INFO', 'ai.concierge.reply_generated', {
    subsystem: 'AI',
    metadata: {
      conversationId: conversation.id,
      profileId,
      intent: detectedIntent,
      handoffRequested,
      isTest,
    },
  })

  return {
    replyText: finalReply,
    intent: detectedIntent,
    handoffRequested,
    conversationStatus: newStatus,
    qualification: {
      ...conversation.qualification,
      ...(modelResponse.qualificationUpdate || {}),
    },
    assistantMessageId: assistantMsg.id,
  }
}
