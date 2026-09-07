/**
 * Concierge Tool Registry & Server Authority — PX5 Foundation
 *
 * All tool execution is strictly server-authoritative.
 * The model suggests tool invocations; the server validates tool names, bounds,
 * arguments, and executes only deterministic, pre-approved read/handoff operations.
 */

import { getPublicAvailableSlots } from '@/modules/agenda/dal'
import { MAX_TOOL_CALLS_PER_TURN } from './constants'
import type { ConciergeContextFacts, ConciergeToolCall, ConciergeToolResult } from './types'

export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export const CONCIERGE_TOOLS: ToolDefinition[] = [
  {
    name: 'get_public_profile_summary',
    description: 'Retorna um resumo das informações públicas, biografia e serviços anunciados da profissional.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_public_service_areas',
    description: 'Retorna a lista de bairros e regiões atendidas pela profissional.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'request_human_handoff',
    description: 'Registra a solicitação de transferência para contato humano direto com a profissional.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Motivo da solicitação de transferência.',
        },
      },
    },
  },
  {
    name: 'get_available_slots',
    description:
      'Consulta os horários de atendimento da profissional disponíveis na agenda pública. Retorna apenas horários reais publicados. Nunca invente horários.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Data específica no formato YYYY-MM-DD.',
        },
        startDate: {
          type: 'string',
          description: 'Data inicial no formato YYYY-MM-DD (máximo 7 dias de intervalo).',
        },
        endDate: {
          type: 'string',
          description: 'Data final no formato YYYY-MM-DD (máximo 7 dias de intervalo).',
        },
        locationSlug: {
          type: 'string',
          description: 'Slug opcional da localização.',
        },
      },
    },
  },
]

export async function executeConciergeTool(
  toolCall: ConciergeToolCall,
  facts: ConciergeContextFacts
): Promise<ConciergeToolResult> {
  const { id, name, arguments: args } = toolCall

  switch (name) {
    case 'get_public_profile_summary':
      return {
        tool_call_id: id,
        result: {
          stageName: facts.stageName,
          city: facts.city,
          aboutMe: facts.aboutMe || 'Não informado.',
          servicesOffered: facts.servicesOffered,
          contactChannels: facts.contactChannels,
        },
      }

    case 'get_public_service_areas':
      return {
        tool_call_id: id,
        result: {
          city: facts.city,
          locations: facts.serviceLocations,
        },
      }

    case 'request_human_handoff':
      return {
        tool_call_id: id,
        result: {
          handoff_requested: true,
          reason: typeof args?.reason === 'string' ? args.reason : 'Solicitação do visitante',
          message: 'Solicitação de atendimento direto com a profissional registrada com sucesso.',
        },
      }

    case 'get_available_slots': {
      const today = new Date().toISOString().split('T')[0]
      const rawDate = typeof args?.date === 'string' ? args.date.trim() : null
      const rawStart = typeof args?.startDate === 'string' ? args.startDate.trim() : null
      const rawEnd = typeof args?.endDate === 'string' ? args.endDate.trim() : null
      const locationSlug = typeof args?.locationSlug === 'string' ? args.locationSlug.trim() : undefined

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      let startDate: string
      let endDate: string

      if (rawDate && dateRegex.test(rawDate)) {
        startDate = rawDate
        endDate = rawDate
      } else if (rawStart && dateRegex.test(rawStart)) {
        startDate = rawStart
        endDate = rawEnd && dateRegex.test(rawEnd) ? rawEnd : rawStart
      } else {
        startDate = today
        endDate = today
      }

      // Bound horizon to maximum 7 days (Section 10)
      const startMs = new Date(`${startDate}T00:00:00Z`).getTime()
      let endMs = new Date(`${endDate}T00:00:00Z`).getTime()
      if (isNaN(startMs) || isNaN(endMs) || endMs < startMs) {
        endDate = startDate
        endMs = startMs
      }

      const maxEndMs = startMs + 7 * 24 * 60 * 60 * 1000
      if (endMs > maxEndMs) {
        endDate = new Date(maxEndMs).toISOString().split('T')[0]
      }

      const profileSlug =
        facts.profileSlug ||
        facts.stageName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

      try {
        const slots = await getPublicAvailableSlots({
          profileSlug,
          startDate,
          endDate,
          locationSlug,
        })

        if (!slots || slots.length === 0) {
          return {
            tool_call_id: id,
            result: {
              status: 'NO_SLOTS_AVAILABLE',
              dateRange: { startDate, endDate },
              totalSlots: 0,
              slots: [],
              message:
                'Nenhum horário público disponível publicado para o período solicitado. Agendamentos vinculantes não são realizados pelo assistente; o visitante pode combinar diretamente com a profissional.',
            },
          }
        }

        return {
          tool_call_id: id,
          result: {
            status: 'AVAILABLE',
            dateRange: { startDate, endDate },
            timezone: slots[0].timezone,
            totalSlots: slots.length,
            slots: slots.slice(0, 10).map((s) => ({
              slotRef: s.slotRef,
              date: s.localDate,
              time: s.localStartTime,
              displayTime: s.localStartTime,
              locationSlug: s.locationSlug ?? null,
            })),
            message:
              'Horários disponíveis obtidos da agenda pública. Agendamentos vinculantes não são realizados pelo assistente; combine os detalhes diretamente com a profissional.',
          },
        }
      } catch {
        return {
          tool_call_id: id,
          result: {
            status: 'LOOKUP_FAILED',
            message:
              'Não foi possível consultar a agenda no momento. Por favor, oriente o visitante a entrar em contato diretamente com a profissional via WhatsApp.',
          },
        }
      }
    }

    default:
      return {
        tool_call_id: id,
        result: null,
        error: `Ferramenta desconhecida ou não autorizada: "${name}"`,
      }
  }
}

export async function executeConciergeToolsBatch(
  toolCalls: ConciergeToolCall[],
  facts: ConciergeContextFacts
): Promise<ConciergeToolResult[]> {
  // Enforce bounding limit on tool calls
  const boundedCalls = toolCalls.slice(0, MAX_TOOL_CALLS_PER_TURN)
  return Promise.all(boundedCalls.map((call) => executeConciergeTool(call, facts)))
}

