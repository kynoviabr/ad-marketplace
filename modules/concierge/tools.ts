/**
 * Concierge Tool Registry & Server Authority — PX5 Foundation
 *
 * All tool execution is strictly server-authoritative.
 * The model suggests tool invocations; the server validates tool names, bounds,
 * arguments, and executes only deterministic, pre-approved read/handoff operations.
 */

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
    description: 'Contrato de interface para consulta de horários da agenda (PX6 futuro). Desabilitado para agendamentos no PX5.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Data no formato YYYY-MM-DD.',
        },
        locationSlug: {
          type: 'string',
          description: 'Slug opcional da localização.',
        },
      },
    },
  },
]

export function executeConciergeTool(
  toolCall: ConciergeToolCall,
  facts: ConciergeContextFacts
): ConciergeToolResult {
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

    case 'get_available_slots':
      return {
        tool_call_id: id,
        result: {
          status: 'NOT_IMPLEMENTED_IN_PX5',
          date: args?.date ?? null,
          message:
            'A consulta de horários em tempo real será ativada no PX6. O agendamento vinculante é vedado pela plataforma; combine horários diretamente com a profissional.',
        },
      }

    default:
      return {
        tool_call_id: id,
        result: null,
        error: `Ferramenta desconhecida ou não autorizada: "${name}"`,
      }
  }
}

export function executeConciergeToolsBatch(
  toolCalls: ConciergeToolCall[],
  facts: ConciergeContextFacts
): ConciergeToolResult[] {
  // Enforce bounding limit on tool calls
  const boundedCalls = toolCalls.slice(0, MAX_TOOL_CALLS_PER_TURN)
  return boundedCalls.map((call) => executeConciergeTool(call, facts))
}
