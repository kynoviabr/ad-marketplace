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
import { CONCIERGE_TOOLS, executeConciergeTool, executeConciergeToolsBatch } from './tools'
import { assemblePrompt, evaluatePreFlightSafety, filterAssistantOutput } from './prompt'
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
export async function generateMockReply(params: ConciergeGenerateParams): Promise<ConciergeModelResponse> {
  const { visitorMessage, facts, faqs, settings } = params
  const text = visitorMessage.toLowerCase()

  // 1. Pre-flight safety check
  const preFlight = evaluatePreFlightSafety(visitorMessage)
  if (preFlight.isBlocked && preFlight.reply) {
    return {
      replyText: preFlight.reply,
      intent: 'SAFETY_BLOCKED',
      handoffRequested: false,
    }
  }

  // 2. Booking / reservation boundary (action attempts to book or transact on-platform)
  const matchesBookingOrPayment =
    text.includes('confirmar agendamento') ||
    text.includes('confirmar reserva') ||
    text.includes('confirm my booking') ||
    text.includes('fazer reserva') ||
    text.includes('reservar') ||
    text.startsWith('reserve') ||
    text.includes(' reserve') ||
    text.includes('booking') ||
    text.includes('book ') ||
    text.includes('pagar adiantado') ||
    text.includes('pagar agora') ||
    text.includes('pagar antecipado') ||
    text.includes('charge my card') ||
    text.includes('take payment') ||
    text.includes('processar pagamento') ||
    text.includes('sinal adiantado')

  if (matchesBookingOrPayment) {
    return {
      replyText: `${BOOKING_DISCLAIMER_REPLY} Você pode combinar os detalhes diretamente com ${facts.stageName}.`,
      intent: 'GENERAL',
      handoffRequested: false,
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

  // 5. Availability inquiry (PX6 canonical slot query — no hallucination)
  if (
    text.includes('horário') ||
    text.includes('horario') ||
    text.includes('disponív') ||
    text.includes('disponiv') ||
    text.includes('disponib') ||
    text.includes('agenda') ||
    text.includes('livre') ||
    text.includes('atende hoje') ||
    text.includes('atende amanhã') ||
    text.includes('atende amanha') ||
    text.includes('quando ela atende') ||
    text.includes('amanhã') ||
    text.includes('amanha') ||
    text.includes('fim de semana') ||
    text.includes('weekend') ||
    text.includes('availability')
  ) {
    let targetDate = new Date().toISOString().split('T')[0]
    if (text.includes('amanhã') || text.includes('amanha')) {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      targetDate = tomorrow.toISOString().split('T')[0]
    }

    const toolResult = await executeConciergeTool(
      {
        id: `avail_call_${Date.now()}`,
        name: 'get_available_slots',
        arguments: { date: targetDate },
      },
      facts
    )

    let replyText = `Não encontrei horários públicos disponíveis para ${facts.stageName} na data consultada (${targetDate}). Sugiro entrar em contato diretamente pelo WhatsApp para verificar disponibilidade e possíveis encaixes.`
    const res = toolResult.result as any

    if (res?.status === 'AVAILABLE' && Array.isArray(res.slots) && res.slots.length > 0) {
      const times = res.slots.slice(0, 4).map((s: any) => s.displayTime || s.time).join(', ')
      replyText = `Verifiquei a agenda pública de ${facts.stageName}: há disponibilidade para ${targetDate} (${times}). Lembramos que ter disponibilidade não garante reserva; agendamentos vinculantes não são realizados pelo assistente. Entre em contato direto pelo WhatsApp para combinar seu atendimento.`
    } else if (res?.status === 'LOOKUP_FAILED') {
      replyText = `Não consegui consultar a agenda pública no momento. Você pode falar diretamente com ${facts.stageName} pelo contato do perfil.`
    }

    return {
      replyText,
      intent: 'AVAILABILITY_INQUIRY',
      handoffRequested: false,
      qualificationUpdate: {
        intentCategory: 'AVAILABILITY_INQUIRY',
        preferredTimeWindow: targetDate,
      },
      toolRequests: [
        {
          id: toolResult.tool_call_id,
          name: 'get_available_slots',
          arguments: { date: targetDate },
        },
      ],
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
 * Validates and sanitizes raw model output before runtime consumption.
 * Enforces:
 * - Tool allowlist check
 * - Tool call bounding (MAX_TOOL_CALLS_PER_TURN)
 * - Safe JSON arguments parsing
 * - Assistant output filtering (no prompt leakage)
 * - Known intent categorization
 */
export function validateModelResponse(
  raw: Partial<ConciergeModelResponse>
): ConciergeModelResponse {
  const allowedToolNames = new Set(CONCIERGE_TOOLS.map((t) => t.name))

  let sanitizedTools: ConciergeModelResponse['toolRequests'] = undefined
  if (Array.isArray(raw.toolRequests)) {
    const validCalls = raw.toolRequests
      .filter((call) => call && typeof call.name === 'string' && allowedToolNames.has(call.name))
      .slice(0, 3) // MAX_TOOL_CALLS_PER_TURN

    if (validCalls.length > 0) {
      sanitizedTools = validCalls.map((call) => ({
        id: String(call.id || `call_${Date.now()}`),
        name: call.name,
        arguments: typeof call.arguments === 'object' && call.arguments !== null ? call.arguments : {},
      }))
    }
  }

  const rawReply = typeof raw.replyText === 'string' ? raw.replyText.trim() : ''
  const sanitizedReply = rawReply ? filterAssistantOutput(rawReply) : PROVIDER_FALLBACK_REPLY

  return {
    replyText: sanitizedReply,
    intent: raw.intent || 'GENERAL',
    handoffRequested: Boolean(raw.handoffRequested),
    qualificationUpdate: raw.qualificationUpdate,
    toolRequests: sanitizedTools,
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
  const isInternalTest = params.isTest === true || params.channel === 'INTERNAL_TEST'
  const isRealUserChannel = params.channel === 'WEB_PUBLIC' || params.channel === 'WHATSAPP_OFFICIAL'

  // Pre-flight safety check is always evaluated first
  const preFlight = evaluatePreFlightSafety(params.visitorMessage)
  if (preFlight.isBlocked && preFlight.reply) {
    return {
      replyText: preFlight.reply,
      intent: 'SAFETY_BLOCKED',
      handoffRequested: false,
    }
  }

  // MOCK PROVIDER INVARIANT (Section 4):
  // 1. Real channels (WEB_PUBLIC, WHATSAPP_OFFICIAL) MUST NEVER receive a mock response.
  if (isRealUserChannel && !apiKey) {
    logEvent('WARN', 'ai.concierge.public_provider_unavailable', {
      subsystem: 'AI',
      metadata: { conversationId: params.conversationId, channel: params.channel },
    })
    return {
      replyText: PROVIDER_FALLBACK_REPLY,
      intent: 'GENERAL',
      handoffRequested: false,
    }
  }

  // 2. Deterministic mock provider allowed ONLY for explicit internal test or test suite
  if (!apiKey) {
    if (isInternalTest || (process.env.NODE_ENV === 'test' && !isRealUserChannel)) {
      return await generateMockReply(params)
    }
    return {
      replyText: PROVIDER_FALLBACK_REPLY,
      intent: 'GENERAL',
      handoffRequested: false,
    }
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
      logEvent('ERROR', 'ai.concierge.provider_failed', {
        subsystem: 'AI',
        metadata: { status: response.status, failureCategory: 'OPENAI_HTTP_ERROR' },
        error: new Error(`OpenAI HTTP ${response.status}`),
      })
      return {
        replyText: PROVIDER_FALLBACK_REPLY,
        intent: 'GENERAL',
        handoffRequested: false,
      }
    }

    const data = await response.json()
    const choice = data.choices?.[0]?.message

    if (!choice) {
      return {
        replyText: PROVIDER_FALLBACK_REPLY,
        intent: 'GENERAL',
        handoffRequested: false,
      }
    }

    // Process tool calls if suggested by model (safe JSON parse)
    const rawToolCalls = (choice.tool_calls || []).map((tc: any) => {
      let parsedArgs: Record<string, unknown> = {}
      try {
        parsedArgs = JSON.parse(tc.function.arguments || '{}')
      } catch {
        parsedArgs = {}
      }
      return {
        id: tc.id,
        name: tc.function.name,
        arguments: parsedArgs,
      }
    })

    if (rawToolCalls.length > 0) {
      const toolResults = await executeConciergeToolsBatch(rawToolCalls, params.facts)
      const hasAvailability = rawToolCalls.some((t: any) => t.name === 'get_available_slots')

      try {
        const toolMessages = [
          ...messages,
          choice,
          ...toolResults.map((tr) => ({
            role: 'tool',
            tool_call_id: tr.tool_call_id,
            content: JSON.stringify(tr.result || { error: tr.error }),
          })),
        ]

        const secondResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: toolMessages,
            max_tokens: MAX_ASSISTANT_RESPONSE_TOKENS,
            temperature: 0.3,
          }),
        })

        if (secondResponse.ok) {
          const secondData = await secondResponse.json()
          const secondChoice = secondData.choices?.[0]?.message
          if (secondChoice?.content) {
            return validateModelResponse({
              replyText: secondChoice.content.trim(),
              intent: hasAvailability ? 'AVAILABILITY_INQUIRY' : 'GENERAL',
              toolRequests: rawToolCalls,
            })
          }
        }
      } catch {
        // Fallback below
      }

      if (hasAvailability) {
        const availRes = toolResults.find((r) => (r.result as any)?.status)?.result as any
        let fallbackReply = `Não encontrei horários disponíveis publicados para a data consultada. Para verificar possíveis horários, entre em contato direto pelo WhatsApp.`
        if (availRes?.status === 'AVAILABLE' && availRes.slots?.length > 0) {
          const times = availRes.slots.slice(0, 4).map((s: any) => s.displayTime || s.time).join(', ')
          fallbackReply = `Há horários disponíveis para a data solicitada (${times}). Ter disponibilidade não significa reserva; agendamentos vinculantes não são realizados pelo assistente. Entre em contato direto pelo WhatsApp para combinar.`
        }
        return validateModelResponse({
          replyText: fallbackReply,
          intent: 'AVAILABILITY_INQUIRY',
          toolRequests: rawToolCalls,
        })
      }
    }

    return validateModelResponse({
      replyText: choice.content?.trim() || '',
      intent: 'GENERAL',
      toolRequests: rawToolCalls.length > 0 ? rawToolCalls : undefined,
    })
  } catch (err: any) {
    logEvent('ERROR', 'ai.concierge.provider_exception', {
      subsystem: 'AI',
      metadata: { errorName: err?.name, failureCategory: 'PROVIDER_TIMEOUT_OR_NETWORK' },
      error: err,
    })
    return {
      replyText: PROVIDER_FALLBACK_REPLY,
      intent: 'GENERAL',
      handoffRequested: false,
    }
  }
}
