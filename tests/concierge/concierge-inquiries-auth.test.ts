import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  getOrCreateConversation,
  getProfessionalInquiries,
  getProfessionalInquiryDetail,
  saveConciergeMessage,
  updateProfessionalInquiryStatus,
} from '@/modules/concierge/dal'
import { isWebPublicConciergeReady } from '@/modules/concierge/gate'
import { getTestSupabaseAdmin } from '@/tests/helpers/supabase-test-client'

describe('PX6 — Inquiries Authorization, Isolation & Readiness Gates', () => {
  const admin = getTestSupabaseAdmin()
  let profileAId: string
  let profileBId: string
  let conversationAId: string
  let testConversationId: string

  beforeAll(async () => {
    // Get two distinct professional profiles from DEV Supabase
    const { data: profiles } = await admin
      .from('professional_profiles')
      .select('id')
      .limit(2)

    profileAId = profiles![0].id
    profileBId = profiles && profiles.length > 1 ? profiles[1].id : '99999999-9999-4999-a999-999999999999'

    // Create a real visitor conversation for Profile A
    const visitorSession = `test_visitor_${Date.now()}`
    const convA = await getOrCreateConversation(profileAId, visitorSession, 'WEB_PUBLIC', false)
    conversationAId = convA.id

    // Add a visitor message (required for Inquiry definition)
    await saveConciergeMessage(
      conversationAId,
      'VISITOR',
      'Olá, você tem horário amanhã na parte da tarde?',
      { channel: 'WEB_PUBLIC' }
    )

    // Add an assistant message
    await saveConciergeMessage(
      conversationAId,
      'ASSISTANT',
      'Olá! Verifiquei a agenda pública e não há horários disponíveis para amanhã. Entre em contato direto pelo WhatsApp.',
      { intent: 'AVAILABILITY_INQUIRY' }
    )

    // Create an INTERNAL_TEST conversation for Profile A
    const testSession = `internal_test_${Date.now()}`
    const convTest = await getOrCreateConversation(profileAId, testSession, 'INTERNAL_TEST', true)
    testConversationId = convTest.id

    await saveConciergeMessage(
      testConversationId,
      'VISITOR',
      'Mensagem de teste interno',
      { is_test: true }
    )
  })

  afterAll(async () => {
    // Cleanup created test conversations
    if (conversationAId) {
      await admin.from('concierge_messages').delete().eq('conversation_id', conversationAId)
      await admin.from('concierge_conversations').delete().eq('id', conversationAId)
    }
    if (testConversationId) {
      await admin.from('concierge_messages').delete().eq('conversation_id', testConversationId)
      await admin.from('concierge_conversations').delete().eq('id', testConversationId)
    }
  })

  describe('1. Inquiry Isolation & Authorization (Section 57)', () => {
    it('allows professional to list own inquiries with visitor message invariant', async () => {
      const inquiries = await getProfessionalInquiries(profileAId, { isTest: false })
      expect(inquiries.length).toBeGreaterThan(0)

      const target = inquiries.find((i) => i.id === conversationAId)
      expect(target).toBeDefined()
      expect(target?.visitorPseudonym).toMatch(/^Visitante #/)
      expect(target?.messageCount).toBeGreaterThanOrEqual(2)
      expect(target?.lastMessageSnippet).toBeTruthy()
    })

    it('strictly isolates internal test conversations from real visitor inquiries', async () => {
      const realInquiries = await getProfessionalInquiries(profileAId, { isTest: false })
      const testInRealList = realInquiries.find((i) => i.id === testConversationId)
      expect(testInRealList).toBeUndefined()

      const testInquiries = await getProfessionalInquiries(profileAId, { isTest: true })
      const foundInTest = testInquiries.find((i) => i.id === testConversationId)
      expect(foundInTest).toBeDefined()
    })

    it('DENIES cross-advertiser inquiry access (Cross-Advertiser Access Blocked)', async () => {
      // Profile B attempts to fetch conversation belonging to Profile A
      await expect(
        getProfessionalInquiryDetail(conversationAId, profileBId)
      ).rejects.toThrow('Acesso negado: conversa não pertence ao perfil especificado.')
    })

    it('DENIES cross-advertiser status manipulation', async () => {
      // Profile B attempts to close conversation belonging to Profile A
      await expect(
        updateProfessionalInquiryStatus(conversationAId, profileBId, 'CLOSED')
      ).rejects.toThrow('Acesso negado ou conversa não encontrada.')
    })

    it('allows owner to transition inquiry status to HANDOFF_COMPLETED and CLOSED', async () => {
      // Transition to HANDOFF_COMPLETED
      await updateProfessionalInquiryStatus(conversationAId, profileAId, 'HANDOFF_COMPLETED')
      let detail = await getProfessionalInquiryDetail(conversationAId, profileAId)
      expect(detail.conversation.status).toBe('HANDOFF_COMPLETED')
      expect(detail.conversation.handoffAt).toBeDefined()

      // Transition to CLOSED
      await updateProfessionalInquiryStatus(conversationAId, profileAId, 'CLOSED')
      detail = await getProfessionalInquiryDetail(conversationAId, profileAId)
      expect(detail.conversation.status).toBe('CLOSED')
      expect(detail.conversation.closedAt).toBeDefined()
    })
  })

  describe('2. Public Web Readiness Gate (Section 58)', () => {
    it('fails closed by default when global flag CONCIERGE_WEB_PUBLIC_ENABLED is absent or false', async () => {
      const originalFlag = process.env.CONCIERGE_WEB_PUBLIC_ENABLED
      delete process.env.CONCIERGE_WEB_PUBLIC_ENABLED

      const readiness = await isWebPublicConciergeReady(profileAId)
      expect(readiness.ready).toBe(false)
      expect(readiness.reasons).toContain('GLOBAL_FLAG_DISABLED')

      if (originalFlag !== undefined) {
        process.env.CONCIERGE_WEB_PUBLIC_ENABLED = originalFlag
      }
    })

    it('fails closed when legal retention policy is unapproved', async () => {
      const originalRetention = process.env.CONCIERGE_RETENTION_POLICY_APPROVED
      delete process.env.CONCIERGE_RETENTION_POLICY_APPROVED

      const readiness = await isWebPublicConciergeReady(profileAId)
      expect(readiness.ready).toBe(false)
      expect(readiness.reasons).toContain('RETENTION_POLICY_NOT_APPROVED')

      if (originalRetention !== undefined) {
        process.env.CONCIERGE_RETENTION_POLICY_APPROVED = originalRetention
      }
    })

    it('fails closed when distributed rate limiting is unready', async () => {
      const originalRate = process.env.DISTRIBUTED_RATE_LIMIT_READY
      delete process.env.DISTRIBUTED_RATE_LIMIT_READY

      const readiness = await isWebPublicConciergeReady(profileAId)
      expect(readiness.ready).toBe(false)
      expect(readiness.reasons).toContain('DISTRIBUTED_RATE_LIMIT_NOT_READY')

      if (originalRate !== undefined) {
        process.env.DISTRIBUTED_RATE_LIMIT_READY = originalRate
      }
    })

    it('fails closed for non-publication-eligible or non-existent profile', async () => {
      const fakeId = '00000000-0000-4000-a000-000000000000'
      const readiness = await isWebPublicConciergeReady(fakeId)
      expect(readiness.ready).toBe(false)
      expect(readiness.reasons).toContain('PROFILE_NOT_PUBLICATION_ELIGIBLE')
    })
  })
})
