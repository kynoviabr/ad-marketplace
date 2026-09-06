/**
 * Concierge AI Provider Abstraction — PX5 Foundation
 *
 * Provides a resilient, server-only boundary for generating assistant replies.
 * Uses native fetch with bounded timeouts against OpenAI if configured,
 * falling back gracefully to deterministic rule-based mock execution in development / test.
 */

import 'server-only'
import {
  BOOKING_DISCLAIMER_REPLY,
  MAX_ASSISTANT_RESPONSE_TOKENS,
  PROVIDER_FALLBACK_REPLY,
} from './constants'
import { CONCIERGE_TOOLS } from './tools'
import { assemblePrompt, evaluatePreFlightSafety } from './prompt'
import type {
  ConciergeGenerateParams,
  ConciergeModelResponse,
  InquiryIntent,
} from './types'
import { logEvent } from '@/modules/observability/logger'

/**
 * Deterministic fallback / mock model implementation for tests and dev environments
 * without an active OpenAI API key.
 */
export function generateMockReply(params: ConciergeGenerateParams): ConciergeModelResponse {
  const { visitorMessage, facts, faqs, settings } = params
  const text = visitorMessage.toLowerCase()

  // 1. Pre-flight safety check
  const preFlight = evaluatePreFlightSafety(visitorMessage)
  if (preFlight.isBlocked && preFlight.reply) {
    return {
      replyText: preFlight.reply,
      intent: 'SAFETY_BLOCKED',
    }
  }

  // 2. Booking / reservation boundary
  if (
    text.includes('confirmar') ||
    text.includes('reserva') ||
    text.includes('pagar') ||
    text.includes('pix') ||
    text.includes('sinal')
  ) {
    return {
      replyText: `${BOOKING_DISCLAIMER_REPLY} Você pode combinar os detalhes diretamente com ${facts.stageName}.`,
      intent: 'GENERAL',
    }
  }

  // 3. Human handoff request
  if (
    text.includes('falar com ela') ||
    text.includes('falar diretamente') ||
    text.includes('humano') ||
    text.includes('contato direto') ||
    text.includes('atendente') ||
    text.includes('whatsapp') ||
    text.includes('whats')
  ) {
    return {
      replyText: `Entendido! Registrei sua solicitação de atendimento direto via WhatsApp. Você também pode clicar no botão de contato no perfil de ${facts.stageName}.`,
      intent: 'HANDOFF_REQUEST',
      handoffRequested: true,
      qualificationUpdate: {
        intentCategory: 'HANDOFF_REQUEST',
        contactPreference: 'WHATSAPP',
      },
    }
  }

  // 4. Rates / pricing inquiry
  if (
    text.includes('valor') ||
    text.includes('quanto custa') ||
    text.includes('preço') ||
    text.includes('preco') ||
    text.includes('tabela') ||
    text.includes('tarifa')
  ) {
    return {
      replyText: `Valores e detalhes específicos de atendimento são combinados diretamente com ${facts.stageName} pelo WhatsApp.`,
      intent: 'RATES_INQUIRY',
      handoffRequested: false,
      qualificationUpdate: {
        intentCategory: 'RATES_INQUIRY',
      },
    }
  }

  // 5. Availability inquiry (PX5 categorizes, does not execute slot lookups)
  if (
    text.includes('horário') ||
    text.includes('horario') ||
    text.includes('disponível') ||
    text.includes('disponivel') ||
    text.includes('agenda') ||
    text.includes('livre') ||
    text.includes('amanhã') ||
    text.includes('amanha') ||
    text.includes('sexta') ||
    text.includes('sábado') ||
    text.includes('sabado')
  ) {
    return {
      replyText: `Para saber sobre horários exatos e disponibilidade de ${facts.stageName}, por favor entre em contato direto pelo WhatsApp.`,
      intent: 'AVAILABILITY_INQUIRY',
      handoffRequested: false,
      qualificationUpdate: {
        intentCategory: 'AVAILABILITY_INQUIRY',
      },
    }
  }

  // 6. Service area / location inquiry
  const matchesLocation =
    (text.includes('onde') && (text.includes('atende') || text.includes('fica'))) ||
    text.includes('bairro') ||
    text.includes('região') ||
    text.includes('regiao') ||
    text.includes('local') ||
    facts.serviceLocations.some((loc) => text.includes(loc.toLowerCase()))

  if (matchesLocation) {
    const locs = facts.serviceLocations.length > 0
      ? facts.serviceLocations.join(', ')
      : facts.city
    const matchedLoc = facts.serviceLocations.find((loc) => text.includes(loc.toLowerCase())) || facts.serviceLocations[0] || facts.city

    return {
      replyText: `${facts.stageName} atende na região de ${facts.city}, nos seguintes locais: ${locs}.`,
      intent: 'LOCATION_INQUIRY',
      handoffRequested: false,
      qualificationUpdate: {
        intentCategory: 'LOCATION_INQUIRY',
        preferredArea: matchedLoc,
      },
    }
  }

  // 7. Check for matching FAQ
  for (const faq of faqs) {
    if (faq.enabled && text.includes(faq.question.toLowerCase().slice(0, 15))) {
      return {
        replyText: faq.answer,
        intent: 'SERVICE_INQUIRY',
        handoffRequested: false,
      }
    }
  }

  // 8. Standard welcoming greeting
  if (
    text.includes('olá') ||
    text.includes('ola') ||
    text.includes('oi') ||
    text.includes('boa tarde') ||
    text.includes('bom dia') ||
    text.includes('boa noite') ||
    text === 'hi' ||
    text === 'hello'
  ) {
    return {
      replyText: settings.welcome_message,
      intent: 'GREETING',
      handoffRequested: false,
    }
  }

  // 9. General inquiry
  return {
    replyText: `Olá! Sou a assistente virtual de ${facts.stageName}. Posso esclarecer dúvidas sobre os bairros de atendimento, serviços descritos no perfil e orientar o contato direto. Como posso ajudar?`,
    intent: 'GENERAL',
    handoffRequested: false,
  }
}

/**
 * Main provider entry point. Dispatches to live OpenAI if API key is present,
 * or mock provider if unconfigured or running in test environments.
 */
export async function generateConciergeReply(
  params: ConciergeGenerateParams
): Promise<ConciergeModelResponse> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  const isMockMode = !apiKey || params.isTest === true || process.env.NODE_ENV === 'test'

  // Pre-flight safety check is always evaluated first
  const preFlight = evaluatePreFlightSafety(params.visitorMessage)
  if (preFlight.isBlocked && preFlight.reply) {
    return {
      replyText: preFlight.reply,
      intent: 'SAFETY_BLOCKED',
    }
  }

  if (isMockMode) {
    return generateMockReply(params)
  }

  // Live OpenAI Chat Completions call with bounded timeout
  try {
    const { messages } = assemblePrompt(
      params.settings,
      params.faqs,
      params.facts,
      params.history,
      params.visitorMessage
    )

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: MAX_ASSISTANT_RESPONSE_TOKENS,
        temperature: 0.3,
        tools: CONCIERGE_TOOLS.map((tool) => ({
          type: 'function',
          function: tool,
        })),
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      logEvent('ERROR', 'ai.concierge.provider_failed', {
        subsystem: 'AI',
        metadata: { status: response.status, error: errorText.slice(0, 300) },
        error: new Error(`OpenAI HTTP ${response.status}`),
      })
      return {
        replyText: PROVIDER_FALLBACK_REPLY,
        intent: 'GENERAL',
      }
    }

    const data = await response.json()
    const choice = data.choices?.[0]?.message

    if (!choice) {
      return {
        replyText: PROVIDER_FALLBACK_REPLY,
        intent: 'GENERAL',
      }
    }

    // Process tool calls if suggested by model
    const toolCalls = (choice.tool_calls || []).map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments || '{}'),
    }))

    const replyText = choice.content?.trim() || ''

    return {
      replyText: replyText || PROVIDER_FALLBACK_REPLY,
      intent: 'GENERAL',
      toolRequests: toolCalls.length > 0 ? toolCalls : undefined,
    }
  } catch (err: any) {
    logEvent('ERROR', 'ai.concierge.provider_exception', {
      subsystem: 'AI',
      metadata: { errorName: err?.name, message: err?.message },
      error: err,
    })
    return {
      replyText: PROVIDER_FALLBACK_REPLY,
      intent: 'GENERAL',
    }
  }
}
