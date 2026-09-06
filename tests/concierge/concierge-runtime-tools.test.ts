import { describe, it, expect } from 'vitest'
import {
  CONCIERGE_TOOLS,
  executeConciergeTool,
  executeConciergeToolsBatch,
} from '@/modules/concierge/tools'
import { generateConciergeReply } from '@/modules/concierge/provider'
import { MAX_TOOL_CALLS_PER_TURN } from '@/modules/concierge/constants'
import type {
  ConciergeContextFacts,
  ConciergeToolCall,
  ProfessionalConciergeFaq,
  ProfessionalConciergeSettings,
} from '@/modules/concierge/types'

describe('PX5 — Concierge Runtime & Server-Side Tools', () => {
  const mockFacts: ConciergeContextFacts = {
    profileId: '11111111-1111-4111-a111-111111111111',
    stageName: 'Camila Santos',
    city: 'Rio de Janeiro',
    aboutMe: 'Atendimento de alto padrão em Ipanema e Leblon.',
    serviceLocations: ['Ipanema', 'Leblon', 'Barra da Tijuca'],
    servicesOffered: ['Massagem Relaxante', 'Acompanhamento Social'],
    contactChannels: {
      whatsapp: true,
      phone: true,
      telegram: false,
    },
  }

  const mockSettings: ProfessionalConciergeSettings = {
    profile_id: mockFacts.profileId,
    enabled: true,
    assistant_display_name: 'Assistente da Camila',
    welcome_message: 'Olá, seja bem-vindo ao atendimento da Camila.',
    tone: 'PROFESSIONAL',
    qualification_enabled: true,
    handoff_enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const mockFaqs: ProfessionalConciergeFaq[] = [
    {
      id: 'faq-1',
      profile_id: mockFacts.profileId,
      question: 'Aceita cartão de crédito?',
      answer: 'Sim, aceito cartões e Pix diretamente no local.',
      enabled: true,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'faq-2',
      profile_id: mockFacts.profileId,
      question: 'Qual o tempo mínimo de antecedência?',
      answer: 'Recomendo entrar em contato com pelo menos 2 horas de antecedência.',
      enabled: true,
      sort_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  describe('1. Server-Authoritative Tool Registry', () => {
    it('defines the expected set of concierge tools', () => {
      const toolNames = CONCIERGE_TOOLS.map((t) => t.name)
      expect(toolNames).toContain('get_public_profile_summary')
      expect(toolNames).toContain('get_public_service_areas')
      expect(toolNames).toContain('request_human_handoff')
      expect(toolNames).toContain('get_available_slots')
    })

    it('executes get_public_profile_summary and returns sanitized public profile facts', () => {
      const call: ConciergeToolCall = {
        id: 'call-1',
        name: 'get_public_profile_summary',
        arguments: {},
      }
      const result = executeConciergeTool(call, mockFacts)

      expect(result.tool_call_id).toBe('call-1')
      expect(result.error).toBeUndefined()
      expect(result.result).toEqual({
        stageName: 'Camila Santos',
        city: 'Rio de Janeiro',
        aboutMe: 'Atendimento de alto padrão em Ipanema e Leblon.',
        servicesOffered: ['Massagem Relaxante', 'Acompanhamento Social'],
        contactChannels: {
          whatsapp: true,
          phone: true,
          telegram: false,
        },
      })
    })

    it('executes get_public_service_areas and returns designated neighborhoods', () => {
      const call: ConciergeToolCall = {
        id: 'call-2',
        name: 'get_public_service_areas',
        arguments: {},
      }
      const result = executeConciergeTool(call, mockFacts)

      expect(result.tool_call_id).toBe('call-2')
      expect(result.result).toEqual({
        city: 'Rio de Janeiro',
        locations: ['Ipanema', 'Leblon', 'Barra da Tijuca'],
      })
    })

    it('executes request_human_handoff and returns handoff guidance', () => {
      const call: ConciergeToolCall = {
        id: 'call-3',
        name: 'request_human_handoff',
        arguments: { reason: 'Cliente quer tirar dúvidas específicas de agendamento' },
      }
      const result = executeConciergeTool(call, mockFacts)

      expect(result.tool_call_id).toBe('call-3')
      expect((result.result as any).handoff_requested).toBe(true)
      expect((result.result as any).reason).toBe('Cliente quer tirar dúvidas específicas de agendamento')
    })

    it('executes get_available_slots stub and states lookup is not bound to direct booking (PX6 stub)', () => {
      const call: ConciergeToolCall = {
        id: 'call-4',
        name: 'get_available_slots',
        arguments: { date: '2026-09-10' },
      }
      const result = executeConciergeTool(call, mockFacts)

      expect(result.tool_call_id).toBe('call-4')
      expect((result.result as any).status).toBe('NOT_IMPLEMENTED_IN_PX5')
      expect((result.result as any).message).toContain('PX6')
      expect((result.result as any).message).toContain('vedado pela plataforma')
    })

    it('rejects unknown or unapproved tool calls', () => {
      const call: ConciergeToolCall = {
        id: 'call-unknown',
        name: 'execute_sql_query',
        arguments: { query: 'SELECT * FROM users' },
      }
      const result = executeConciergeTool(call, mockFacts)

      expect(result.tool_call_id).toBe('call-unknown')
      expect(result.result).toBeNull()
      expect(result.error).toContain('Ferramenta desconhecida')
    })

    it('bounds tool batch executions to MAX_TOOL_CALLS_PER_TURN (3)', () => {
      const excessiveCalls: ConciergeToolCall[] = [
        { id: '1', name: 'get_public_profile_summary', arguments: {} },
        { id: '2', name: 'get_public_service_areas', arguments: {} },
        { id: '3', name: 'request_human_handoff', arguments: {} },
        { id: '4', name: 'get_available_slots', arguments: {} },
        { id: '5', name: 'get_public_profile_summary', arguments: {} },
      ]

      const results = executeConciergeToolsBatch(excessiveCalls, mockFacts)
      expect(results).toHaveLength(MAX_TOOL_CALLS_PER_TURN)
      expect(results.map((r) => r.tool_call_id)).toEqual(['1', '2', '3'])
    })
  })

  describe('2. Deterministic Mock Provider (Unconfigured OPENAI_API_KEY Fallback)', () => {
    it('generates coherent greeting response', async () => {
      const response = await generateConciergeReply({
        conversationId: 'test-conv',
        profileId: mockFacts.profileId,
        visitorMessage: 'Olá, boa tarde!',
        settings: mockSettings,
        faqs: mockFaqs,
        facts: mockFacts,
        history: [],
      })

      expect(response.replyText).toContain('Camila')
      expect(response.intent).toBe('GREETING')
      expect(response.handoffRequested).toBe(false)
    })

    it('detects location inquiries and references available service areas', async () => {
      const response = await generateConciergeReply({
        conversationId: 'test-conv',
        profileId: mockFacts.profileId,
        visitorMessage: 'Onde você atende? Fica em Ipanema?',
        settings: mockSettings,
        faqs: mockFaqs,
        facts: mockFacts,
        history: [],
      })

      expect(response.replyText).toContain('Rio de Janeiro')
      expect(response.replyText).toContain('Ipanema')
      expect(response.intent).toBe('LOCATION_INQUIRY')
      expect(response.qualificationUpdate?.preferredArea).toBe('Ipanema')
    })

    it('detects rates inquiries and guides client without promising fixed transactions', async () => {
      const response = await generateConciergeReply({
        conversationId: 'test-conv',
        profileId: mockFacts.profileId,
        visitorMessage: 'Quanto custa a consulta de 1 hora?',
        settings: mockSettings,
        faqs: mockFaqs,
        facts: mockFacts,
        history: [],
      })

      expect(response.intent).toBe('RATES_INQUIRY')
      expect(response.replyText).toContain('Valores')
    })

    it('matches custom FAQ questions and returns registered answers', async () => {
      const response = await generateConciergeReply({
        conversationId: 'test-conv',
        profileId: mockFacts.profileId,
        visitorMessage: 'Você aceita cartão de crédito?',
        settings: mockSettings,
        faqs: mockFaqs,
        facts: mockFacts,
        history: [],
      })

      expect(response.replyText).toContain('cartões e Pix diretamente no local')
      expect(response.intent).toBe('SERVICE_INQUIRY')
    })

    it('detects WhatsApp / handoff requests and triggers handoff', async () => {
      const response = await generateConciergeReply({
        conversationId: 'test-conv',
        profileId: mockFacts.profileId,
        visitorMessage: 'Quero falar com a Camila diretamente pelo WhatsApp',
        settings: mockSettings,
        faqs: mockFaqs,
        facts: mockFacts,
        history: [],
      })

      expect(response.handoffRequested).toBe(true)
      expect(response.intent).toBe('HANDOFF_REQUEST')
      expect(response.replyText).toContain('WhatsApp')
    })
  })
})
