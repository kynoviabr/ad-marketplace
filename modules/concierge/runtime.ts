/**
 * Concierge Conversation Runtime & Orchestrator — PX5 Foundation
 *
 * Coordinates message ingestion, safety pre-flight, prompt assembly,
 * model inference, server tool execution, qualification persistence,
 * and structured observability.
 */

import 'server-only'
import {
  MAX_USER_MESSAGE_LENGTH,
  SAFE_RATE_LIMIT_REPLY,
  UNAVAILABLE_PUBLIC_CHANNEL_REPLY,
} from './constants'
import {
  assertPublicConciergeEligibility,
  getConciergeFaqs,
  getConciergeSettings,
  getConversationMessages,
  getPublicProfileContextFacts,
  saveConciergeMessage,
  updateConversationQualification,
  updateConversationStatus,
} from './dal'
import { isConciergeRateLimited } from './rate-limiter'
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
  clientTurnId?: string
}

export async function processConciergeTurn(
  input: ProcessTurnInput
): Promise<ConciergeRuntimeResult> {
  const { conversation, isTest = false, clientTurnId } = input
  const rawMessage = input.visitorMessage.trim()
  const profileId = conversation.profile_id

  // 1. Publication Gate (Section 11) for public channels
  if (conversation.channel === 'WEB_PUBLIC') {
    const isEligible = await assertPublicConciergeEligibility(profileId)
    if (!isEligible) {
      return {
        replyText: UNAVAILABLE_PUBLIC_CHANNEL_REPLY,
        intent: 'GENERAL',
        handoffRequested: false,
        conversationStatus: conversation.status,
        qualification: conversation.qualification,
        assistantMessageId: '',
      }
    }
  }

  // 2. Enforce length bounds
  const visitorMessage =
    rawMessage.length > MAX_USER_MESSAGE_LENGTH
      ? rawMessage.slice(0, MAX_USER_MESSAGE_LENGTH)
      : rawMessage

  // 3. Check Inbound Message Idempotency (Section 23): prevent duplicates from network retries
  const recentMessages = await getConversationMessages(conversation.id, 4)
  const lastVisitorMsg = [...recentMessages].reverse().find((m) => m.role === 'VISITOR')
  const lastAssistantMsg = [...recentMessages].reverse().find((m) => m.role === 'ASSISTANT')
  const isRecentDuplicate =
    lastVisitorMsg &&
    lastVisitorMsg.content === visitorMessage &&
    lastAssistantMsg &&
    (clientTurnId ? lastVisitorMsg.metadata?.turn_id === clientTurnId : new Date(lastVisitorMsg.created_at).getTime() > Date.now() - 15000)

  if (isRecentDuplicate && lastAssistantMsg) {
    return {
      replyText: lastAssistantMsg.content,
      intent: (lastAssistantMsg.metadata?.intent as InquiryIntent) || 'GENERAL',
      handoffRequested: Boolean(lastAssistantMsg.metadata?.handoff_requested),
      conversationStatus: conversation.status,
      qualification: conversation.qualification,
      assistantMessageId: lastAssistantMsg.id,
    }
  }

  // 4. Rate Limiting (Section 22)
  if (isConciergeRateLimited(conversation.id, 'CONVERSATION_TURN')) {
    return {
      replyText: SAFE_RATE_LIMIT_REPLY,
      intent: 'GENERAL',
      handoffRequested: false,
      conversationStatus: conversation.status,
      qualification: conversation.qualification,
      assistantMessageId: '',
    }
  }

  // 5. Persist visitor message
  await saveConciergeMessage(conversation.id, 'VISITOR', visitorMessage, {
    channel: conversation.channel,
    is_test: isTest,
    turn_id: clientTurnId ?? null,
  })

  // 6. Gather context facts, settings, FAQs, and recent history
  const [settings, faqs, facts, history] = await Promise.all([
    getConciergeSettings(profileId),
    getConciergeFaqs(profileId),
    getPublicProfileContextFacts(profileId),
    getConversationMessages(conversation.id),
  ])

  // 7. Generate reply via provider abstraction
  const modelResponse: ConciergeModelResponse = await generateConciergeReply({
    conversationId: conversation.id,
    profileId,
    visitorMessage,
    settings,
    faqs,
    facts,
    history,
    isTest,
    channel: conversation.channel,
  })

  let finalReply = modelResponse.replyText
  let detectedIntent: InquiryIntent = modelResponse.intent || 'GENERAL'
  let handoffRequested = Boolean(modelResponse.handoffRequested)

  // 5. Execute any suggested tools via server registry
  if (modelResponse.toolRequests && modelResponse.toolRequests.length > 0) {
    const toolResults = await executeConciergeToolsBatch(modelResponse.toolRequests, facts)
    for (const res of toolResults) {
      if (res.result && typeof res.result === 'object' && 'handoff_requested' in res.result) {
        handoffRequested = true
      }
    }
    const hasAvailabilityTool = modelResponse.toolRequests.some((t) => t.name === 'get_available_slots')
    if (hasAvailabilityTool && detectedIntent === 'GENERAL') {
      detectedIntent = 'AVAILABILITY_INQUIRY'
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
