import { describe, it, expect, afterAll } from 'vitest'
import { getTestSupabaseAdmin } from '@/tests/helpers/supabase-test-client'
import {
  deleteConciergeFaq,
  getConciergeFaqs,
  getConciergeSettings,
  getConversationMessages,
  getOrCreateConversation,
  saveConciergeFaq,
  saveConciergeMessage,
  updateConciergeSettings,
  updateConversationStatus,
} from '@/modules/concierge/dal'

describe('PX5 — Concierge DAL & Live Supabase DEV Validation', () => {
  const admin = getTestSupabaseAdmin()
  let targetProfileId: string
  let createdFaqId: string | null = null
  let createdConversationId: string | null = null
  let originalSettings: any = null

  it('connects to Supabase DEV and resolves an active professional profile', async () => {
    const { data: profile, error } = await admin
      .from('professional_profiles')
      .select('id, slug')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    expect(error).toBeNull()
    expect(profile).not.toBeNull()
    targetProfileId = profile!.id
  })

  it('fetches or creates initial settings with valid defaults', async () => {
    const settings = await getConciergeSettings(targetProfileId)
    originalSettings = { ...settings }

    expect(settings).toBeDefined()
    expect(settings.profile_id).toBe(targetProfileId)
    expect(typeof settings.enabled).toBe('boolean')
    expect(['PROFESSIONAL', 'WARM', 'DIRECT', 'DISCREET']).toContain(settings.tone)
    expect(settings.assistant_display_name).toBeTruthy()
  })

  it('updates concierge settings and persists values in DEV Supabase', async () => {
    const updated = await updateConciergeSettings(targetProfileId, {
      assistant_display_name: 'Assistente PX5 Teste',
      tone: 'DISCREET',
      qualification_enabled: true,
      handoff_enabled: true,
    })

    expect(updated.assistant_display_name).toBe('Assistente PX5 Teste')
    expect(updated.tone).toBe('DISCREET')

    // Verify in DB directly
    const { data: row } = await admin
      .from('professional_concierge_settings')
      .select('assistant_display_name, tone')
      .eq('profile_id', targetProfileId)
      .single()

    expect(row?.assistant_display_name).toBe('Assistente PX5 Teste')
    expect(row?.tone).toBe('DISCREET')
  })

  it('creates, reads, and deletes custom FAQ entries in DEV Supabase', async () => {
    const createdFaq = await saveConciergeFaq(targetProfileId, {
      question: 'Pergunta de Teste PX5?',
      answer: 'Esta é uma resposta de teste gerada pelo conjunto de validação.',
      enabled: true,
      sort_order: 99,
    })

    expect(createdFaq.id).toBeDefined()
    expect(createdFaq.question).toBe('Pergunta de Teste PX5?')
    createdFaqId = createdFaq.id

    const allFaqs = await getConciergeFaqs(targetProfileId)
    const found = allFaqs.find((f) => f.id === createdFaqId)
    expect(found).toBeDefined()
    expect(found?.answer).toBe('Esta é uma resposta de teste gerada pelo conjunto de validação.')

    // Clean up created FAQ
    await deleteConciergeFaq(targetProfileId, createdFaqId!)
    const remainingFaqs = await getConciergeFaqs(targetProfileId)
    expect(remainingFaqs.find((f) => f.id === createdFaqId)).toBeUndefined()
    createdFaqId = null
  })

  it('manages conversation lifecycle and message ledger atomically', async () => {
    const testSessionId = `synth_test_session_${Date.now()}`

    const conv = await getOrCreateConversation(
      targetProfileId,
      testSessionId,
      'INTERNAL_TEST',
      true
    )

    expect(conv.id).toBeDefined()
    expect(conv.channel).toBe('INTERNAL_TEST')
    expect(conv.status).toBe('ACTIVE')
    expect(conv.is_test).toBe(true)
    createdConversationId = conv.id

    // Record visitor message
    const visitorMsg = await saveConciergeMessage(
      conv.id,
      'VISITOR',
      'Mensagem de teste do visitante sintetico'
    )
    expect(visitorMsg.id).toBeDefined()
    expect(visitorMsg.role).toBe('VISITOR')

    // Record assistant reply
    const assistantMsg = await saveConciergeMessage(
      conv.id,
      'ASSISTANT',
      'Resposta de teste do assistente sintetico'
    )
    expect(assistantMsg.id).toBeDefined()
    expect(assistantMsg.role).toBe('ASSISTANT')

    // Fetch conversation messages
    const messages = await getConversationMessages(conv.id)
    expect(messages.length).toBeGreaterThanOrEqual(2)
    expect(messages[0].content).toBe('Mensagem de teste do visitante sintetico')

    // Transition status to HANDOFF_REQUESTED
    await updateConversationStatus(conv.id, 'HANDOFF_REQUESTED', new Date().toISOString())
    const { data: updatedConv } = await admin
      .from('concierge_conversations')
      .select('status, handoff_at')
      .eq('id', conv.id)
      .single()

    expect(updatedConv?.status).toBe('HANDOFF_REQUESTED')
    expect(updatedConv?.handoff_at).not.toBeNull()
  })

  afterAll(async () => {
    // 1. Cleanup any dangling test conversation and messages
    if (createdConversationId) {
      await admin.from('concierge_messages').delete().eq('conversation_id', createdConversationId)
      await admin.from('concierge_conversations').delete().eq('id', createdConversationId)
    }

    // 2. Cleanup dangling test FAQ if any
    if (createdFaqId) {
      await admin.from('professional_concierge_faqs').delete().eq('id', createdFaqId)
    }

    // 3. Restore original settings
    if (targetProfileId && originalSettings) {
      await updateConciergeSettings(targetProfileId, {
        enabled: originalSettings.enabled,
        assistant_display_name: originalSettings.assistant_display_name,
        welcome_message: originalSettings.welcome_message,
        tone: originalSettings.tone,
        qualification_enabled: originalSettings.qualification_enabled,
        handoff_enabled: originalSettings.handoff_enabled,
      })
    }

    // 4. Verify 0 leftover synthetic test records in conversations
    const { count: danglingMessages } = await admin
      .from('concierge_messages')
      .select('id', { count: 'exact', head: true })
      .like('content', '%sintetico%')

    expect(danglingMessages ?? 0).toBe(0)
  })
})
