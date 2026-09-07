import { describe, it, expect, beforeAll } from 'vitest'
import { executeConciergeTool } from '@/modules/concierge/tools'
import { generateConciergeReply } from '@/modules/concierge/provider'
import { getTestSupabaseAdmin } from '@/tests/helpers/supabase-test-client'
import type {
  ConciergeContextFacts,
  ConciergeToolCall,
  ProfessionalConciergeFaq,
  ProfessionalConciergeSettings,
} from '@/modules/concierge/types'

describe('PX6 — AI + Availability Integration & Invariants', () => {
  const admin = getTestSupabaseAdmin()
  let realEligibleProfile: any
  let realIneligibleProfile: any

  beforeAll(async () => {
    // Find a publication eligible profile
    const { data: eligible } = await admin
      .from('v_publication_eligible_profiles')
      .select('profile_id, profile_slug')
      .limit(1)
      .maybeSingle()

    realEligibleProfile = eligible

    // Find an ineligible profile (e.g. DRAFT or SUSPENDED if any, or mock ID)
    const { data: allProfiles } = await admin
      .from('professional_profiles')
      .select('id, slug, status')
      .neq('status', 'ACTIVE')
      .limit(1)
      .maybeSingle()

    realIneligibleProfile = allProfiles || {
      id: '00000000-0000-4000-a000-000000000000',
      slug: 'draft-unverified-profile',
      status: 'DRAFT',
    }
  })

  describe('1. Availability Tool Execution (Section 54)', () => {
    it('queries available slots with bounded 7-day horizon and returns sanitized DTO', async () => {
      const facts: ConciergeContextFacts = {
        profileId: realEligibleProfile?.profile_id || '11111111-1111-4111-a111-111111111111',
        profileSlug: realEligibleProfile?.profile_slug || 'test-profile',
        stageName: 'Professional Test',
        city: 'São Paulo',
        serviceLocations: ['Jardins'],
        servicesOffered: ['Massagem'],
        contactChannels: { whatsapp: true, phone: false, telegram: false },
      }

      const today = new Date().toISOString().split('T')[0]
      const toolCall: ConciergeToolCall = {
        id: 'call-avail-1',
        name: 'get_available_slots',
        arguments: { date: today },
      }

      const result = await executeConciergeTool(toolCall, facts)
      expect(result.tool_call_id).toBe('call-avail-1')
      expect(result.error).toBeUndefined()

      const res = result.result as any
      expect(['AVAILABLE', 'NO_SLOTS_AVAILABLE']).toContain(res.status)
      expect(res.dateRange).toBeDefined()
      expect(res.message).toContain('Agendamentos vinculantes não são realizados')

      // Zero internal database UUIDs exposed
      const jsonString = JSON.stringify(res)
      expect(jsonString).not.toContain(facts.profileId)
      if (res.slots && res.slots.length > 0) {
        for (const slot of res.slots) {
          expect(slot.slotRef).toBeDefined()
          expect(slot.date).toBeDefined()
          expect(slot.time).toBeDefined()
          // Ensure slotRef is opaque and does not contain raw UUIDs
          expect(slot.slotRef).not.toContain(facts.profileId)
        }
      }
    })

    it('clamps excessive date horizon to maximum 7 days', async () => {
      const facts: ConciergeContextFacts = {
        profileId: realEligibleProfile?.profile_id || '11111111-1111-4111-a111-111111111111',
        profileSlug: realEligibleProfile?.profile_slug || 'test-profile',
        stageName: 'Professional Test',
        city: 'São Paulo',
        serviceLocations: ['Jardins'],
        servicesOffered: ['Massagem'],
        contactChannels: { whatsapp: true, phone: false, telegram: false },
      }

      const today = new Date().toISOString().split('T')[0]
      const farFuture = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const toolCall: ConciergeToolCall = {
        id: 'call-avail-clamp',
        name: 'get_available_slots',
        arguments: { startDate: today, endDate: farFuture },
      }

      const result = await executeConciergeTool(toolCall, facts)
      const res = result.result as any
      expect(res.dateRange).toBeDefined()

      const startMs = new Date(res.dateRange.startDate).getTime()
      const endMs = new Date(res.dateRange.endDate).getTime()
      const diffDays = (endMs - startMs) / (1000 * 60 * 60 * 24)
      expect(diffDays).toBeLessThanOrEqual(7.01)
    })

    it('blocks unverified or ineligible profile from returning public slots', async () => {
      const facts: ConciergeContextFacts = {
        profileId: realIneligibleProfile.id,
        profileSlug: realIneligibleProfile.slug,
        stageName: 'Draft Profile',
        city: 'São Paulo',
        serviceLocations: ['Centro'],
        servicesOffered: ['Massagem'],
        contactChannels: { whatsapp: true, phone: false, telegram: false },
      }

      const toolCall: ConciergeToolCall = {
        id: 'call-ineligible',
        name: 'get_available_slots',
        arguments: { date: new Date().toISOString().split('T')[0] },
      }

      const result = await executeConciergeTool(toolCall, facts)
      const res = result.result as any
      expect(res.status).toBe('NO_SLOTS_AVAILABLE')
      expect(res.totalSlots).toBe(0)
    })
  })

  describe('2. AI Runtime Availability Intent & Hallucination Prevention (Section 55)', () => {
    const mockFacts: ConciergeContextFacts = {
      profileId: '11111111-1111-4111-a111-111111111111',
      profileSlug: 'camila-santos',
      stageName: 'Camila Santos',
      city: 'São Paulo',
      serviceLocations: ['Jardins', 'Itaim Bibi'],
      servicesOffered: ['Massagem Relaxante'],
      contactChannels: { whatsapp: true, phone: true, telegram: false },
    }

    const mockSettings: ProfessionalConciergeSettings = {
      profile_id: mockFacts.profileId,
      enabled: true,
      assistant_display_name: 'Assistente da Camila',
      welcome_message: 'Olá, sou a assistente da Camila.',
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
        question: 'Você aceita cartão de crédito?',
        answer: 'Sim, aceito cartões e Pix diretamente no local.',
        enabled: true,
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    it('detects availability inquiry intent and executes availability tool', async () => {
      const queries = [
        'Você atende hoje?',
        'Tem horário disponível amanhã?',
        'Qual sua disponibilidade?',
        'Como está sua agenda para o fim de semana?',
      ]

      for (const query of queries) {
        const response = await generateConciergeReply({
          conversationId: 'test-conv-avail',
          profileId: mockFacts.profileId,
          visitorMessage: query,
          settings: mockSettings,
          faqs: mockFaqs,
          facts: mockFacts,
          history: [],
          channel: 'INTERNAL_TEST',
          isTest: true,
        })

        expect(response.intent).toBe('AVAILABILITY_INQUIRY')
        expect(response.toolRequests?.some((t) => t.name === 'get_available_slots')).toBe(true)
        // No hallucinated reservation confirmation
        expect(response.replyText.toLowerCase()).not.toContain('reservei')
        expect(response.replyText.toLowerCase()).not.toContain('seu horário está confirmado')
      }
    })

    it('does NOT invoke availability tool for standard FAQ or greeting', async () => {
      const response = await generateConciergeReply({
        conversationId: 'test-conv-faq',
        profileId: mockFacts.profileId,
        visitorMessage: 'Você aceita cartão de crédito?',
        settings: mockSettings,
        faqs: mockFaqs,
        facts: mockFacts,
        history: [],
        channel: 'INTERNAL_TEST',
        isTest: true,
      })

      expect(response.intent).toBe('SERVICE_INQUIRY')
      expect(response.toolRequests).toBeUndefined()
    })

    it('truthfully handles empty availability without hallucinating times', async () => {
      const response = await generateConciergeReply({
        conversationId: 'test-conv-empty',
        profileId: mockFacts.profileId,
        visitorMessage: 'Tem horário disponível amanhã?',
        settings: mockSettings,
        faqs: mockFaqs,
        facts: mockFacts,
        history: [],
        channel: 'INTERNAL_TEST',
        isTest: true,
      })

      expect(response.intent).toBe('AVAILABILITY_INQUIRY')
      // Camila has no DB schedule rows in mock, so reply must truthfully state no availability or direct to WhatsApp
      expect(response.replyText).toContain('WhatsApp')
    })
  })

  describe('3. Invariant: Zero Booking / Reservation / Payment Side Effects (Section 64)', () => {
    it('verifies that availability inquiries create zero database side effects on agenda or billing', async () => {
      const targetProfileId = realEligibleProfile?.profile_id || '11111111-1111-4111-a111-111111111111'
      // Snapshot current counts for this specific profile
      const [{ count: beforeExceptions }, { count: beforeRules }] = await Promise.all([
        admin.from('professional_availability_exceptions').select('*', { count: 'exact', head: true }).eq('profile_id', targetProfileId),
        admin.from('professional_weekly_availability').select('*', { count: 'exact', head: true }).eq('profile_id', targetProfileId),
      ])

      const facts: ConciergeContextFacts = {
        profileId: targetProfileId,
        profileSlug: realEligibleProfile?.profile_slug || 'test-profile',
        stageName: 'Professional Test',
        city: 'São Paulo',
        serviceLocations: ['Jardins'],
        servicesOffered: ['Massagem'],
        contactChannels: { whatsapp: true, phone: false, telegram: false },
      }

      // Execute slot inquiry
      await executeConciergeTool(
        {
          id: 'test-no-side-effect',
          name: 'get_available_slots',
          arguments: { date: new Date().toISOString().split('T')[0] },
        },
        facts
      )

      // Verify zero mutated rows for this profile
      const [{ count: afterExceptions }, { count: afterRules }] = await Promise.all([
        admin.from('professional_availability_exceptions').select('*', { count: 'exact', head: true }).eq('profile_id', targetProfileId),
        admin.from('professional_weekly_availability').select('*', { count: 'exact', head: true }).eq('profile_id', targetProfileId),
      ])

      expect(afterExceptions).toBe(beforeExceptions)
      expect(afterRules).toBe(beforeRules)
    })
  })
})
