/**
 * Concierge Data Access Layer (DAL) — PX5 Foundation
 *
 * Server-only module for managing concierge settings, FAQs, conversations, and message history.
 * Enforces strict profile isolation and data minimization.
 */

import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_WELCOME_MESSAGE, MAX_CONTEXT_MESSAGES } from './constants'
import type {
  ConciergeChannel,
  ConciergeContextFacts,
  ConciergeConversation,
  ConciergeConversationStatus,
  ConciergeInquiryDetailDTO,
  ConciergeInquiryDTO,
  ConciergeMessage,
  ConciergeMessageRole,
  ConciergeMessageType,
  ConciergeQualification,
  InquiryIntent,
  ProfessionalConciergeFaq,
  ProfessionalConciergeSettings,
} from './types'

export async function getConciergeSettings(
  profileId: string
): Promise<ProfessionalConciergeSettings> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('professional_concierge_settings')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error) {
    throw new Error(`[concierge:dal] Failed to fetch settings: ${error.message}`)
  }

  if (data) {
    return data as ProfessionalConciergeSettings
  }

  // Create default settings on initial access
  const defaultRecord = {
    profile_id: profileId,
    enabled: false,
    assistant_display_name: 'Assistente Virtual',
    welcome_message: DEFAULT_WELCOME_MESSAGE,
    tone: 'PROFESSIONAL',
    qualification_enabled: true,
    handoff_enabled: true,
  }

  const { data: created, error: createError } = await admin
    .from('professional_concierge_settings')
    .insert(defaultRecord)
    .select()
    .single()

  if (createError) {
    throw new Error(`[concierge:dal] Failed to create default settings: ${createError.message}`)
  }

  return created as ProfessionalConciergeSettings
}

export async function updateConciergeSettings(
  profileId: string,
  updates: Partial<Omit<ProfessionalConciergeSettings, 'profile_id' | 'created_at' | 'updated_at'>>
): Promise<ProfessionalConciergeSettings> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('professional_concierge_settings')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('profile_id', profileId)
    .select()
    .single()

  if (error) {
    throw new Error(`[concierge:dal] Failed to update settings: ${error.message}`)
  }

  return data as ProfessionalConciergeSettings
}

export async function getConciergeFaqs(
  profileId: string
): Promise<ProfessionalConciergeFaq[]> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('professional_concierge_faqs')
    .select('*')
    .eq('profile_id', profileId)
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(`[concierge:dal] Failed to fetch FAQs: ${error.message}`)
  }

  return (data || []) as ProfessionalConciergeFaq[]
}

export async function saveConciergeFaq(
  profileId: string,
  faq: {
    id?: string
    question: string
    answer: string
    enabled?: boolean
    sort_order?: number
  }
): Promise<ProfessionalConciergeFaq> {
  const admin = createAdminClient()

  if (faq.id) {
    const { data, error } = await admin
      .from('professional_concierge_faqs')
      .update({
        question: faq.question.trim(),
        answer: faq.answer.trim(),
        enabled: faq.enabled ?? true,
        sort_order: faq.sort_order ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', faq.id)
      .eq('profile_id', profileId)
      .select()
      .single()

    if (error) {
      throw new Error(`[concierge:dal] Failed to update FAQ: ${error.message}`)
    }
    return data as ProfessionalConciergeFaq
  }

  const { data, error } = await admin
    .from('professional_concierge_faqs')
    .insert({
      profile_id: profileId,
      question: faq.question.trim(),
      answer: faq.answer.trim(),
      enabled: faq.enabled ?? true,
      sort_order: faq.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`[concierge:dal] Failed to create FAQ: ${error.message}`)
  }

  return data as ProfessionalConciergeFaq
}

export async function deleteConciergeFaq(
  profileId: string,
  faqId: string
): Promise<void> {
  const admin = createAdminClient()

  const { error } = await admin
    .from('professional_concierge_faqs')
    .delete()
    .eq('id', faqId)
    .eq('profile_id', profileId)

  if (error) {
    throw new Error(`[concierge:dal] Failed to delete FAQ: ${error.message}`)
  }
}

/**
 * Extracts strictly public, non-sensitive profile facts for the AI concierge context.
 *
 * CRITICAL PRIVACY GUARANTEE:
 * Does NOT query or include: real names, documents, KYC verifications, billing details,
 * private home addresses, private phone numbers, or administrative notes.
 */
export async function getPublicProfileContextFacts(
  profileId: string
): Promise<ConciergeContextFacts> {
  const admin = createAdminClient()

  const { data: profile, error } = await admin
    .from('professional_profiles')
    .select('id, slug, stage_name, bio, show_whatsapp, show_phone, show_telegram')
    .eq('id', profileId)
    .single()

  if (error || !profile) {
    throw new Error(`[concierge:dal] Profile not found: ${profileId}`)
  }

  // Get locations
  const { data: locs } = await admin
    .from('professional_profile_locations')
    .select('location:marketplace_locations(name, city:marketplace_cities(name))')
    .eq('profile_id', profileId)

  const city = (locs?.[0] as any)?.location?.city?.name || 'São Paulo'
  const serviceLocations = (locs || [])
    .map((l: any) => l.location?.name)
    .filter(Boolean)

  return {
    profileId: profile.id,
    profileSlug: profile.slug,
    stageName: profile.stage_name,
    city,
    aboutMe: profile.bio || '',
    serviceLocations,
    servicesOffered: [],
    contactChannels: {
      whatsapp: Boolean(profile.show_whatsapp),
      phone: Boolean(profile.show_phone),
      telegram: Boolean(profile.show_telegram),
    },
  }
}

export async function getOrCreateConversation(
  profileId: string,
  visitorSessionId: string,
  channel: ConciergeChannel = 'INTERNAL_TEST',
  isTest = false
): Promise<ConciergeConversation> {
  const admin = createAdminClient()

  // Look for active conversation
  const { data: existing } = await admin
    .from('concierge_conversations')
    .select('*')
    .eq('profile_id', profileId)
    .eq('visitor_session_id', visitorSessionId)
    .eq('channel', channel)
    .eq('status', 'ACTIVE')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    return existing as ConciergeConversation
  }

  const { data: created, error } = await admin
    .from('concierge_conversations')
    .insert({
      profile_id: profileId,
      visitor_session_id: visitorSessionId,
      channel,
      status: 'ACTIVE',
      is_test: isTest,
      qualification: {},
    })
    .select()
    .single()

  if (error) {
    throw new Error(`[concierge:dal] Failed to create conversation: ${error.message}`)
  }

  return created as ConciergeConversation
}

export async function getConversationMessages(
  conversationId: string,
  limit = MAX_CONTEXT_MESSAGES
): Promise<ConciergeMessage[]> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('concierge_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true }) // Stable deterministic tie-breaker (Section 24)
    .limit(limit)

  if (error) {
    throw new Error(`[concierge:dal] Failed to fetch messages: ${error.message}`)
  }

  return (data || []) as ConciergeMessage[]
}

export async function saveConciergeMessage(
  conversationId: string,
  role: ConciergeMessageRole,
  content: string,
  metadata: Record<string, unknown> = {},
  messageType: ConciergeMessageType = 'TEXT'
): Promise<ConciergeMessage> {
  // CRITICAL INVARIANT (Section 7): System prompt and internal policies must NEVER be persisted in concierge_messages
  if (role === 'SYSTEM') {
    throw new Error('[concierge:dal] System prompt and developer instructions must never be persisted in concierge_messages.')
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('concierge_messages')
    .insert({
      conversation_id: conversationId,
      role,
      message_type: messageType,
      content,
      metadata,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`[concierge:dal] Failed to insert message: ${error.message}`)
  }

  // Update conversation last_message_at
  await admin
    .from('concierge_conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  return data as ConciergeMessage
}

export async function updateConversationStatus(
  conversationId: string,
  status: ConciergeConversationStatus,
  handoffAt?: string
): Promise<void> {
  const admin = createAdminClient()

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (handoffAt) {
    updates.handoff_at = handoffAt
  }

  if (status === 'CLOSED') {
    updates.closed_at = new Date().toISOString()
  }

  await admin.from('concierge_conversations').update(updates).eq('id', conversationId)
}

const ALLOWED_INTENTS: Set<InquiryIntent> = new Set([
  'GREETING',
  'RATES_INQUIRY',
  'AVAILABILITY_INQUIRY',
  'SERVICE_INQUIRY',
  'LOCATION_INQUIRY',
  'HANDOFF_REQUEST',
  'GENERAL',
  'SAFETY_BLOCKED',
])

const ALLOWED_CHANNELS_PREF = new Set(['WHATSAPP', 'DIRECT_CALL', 'TELEGRAM'])

/**
 * Bounded qualification schema sanitizer (Section 19).
 * Discards arbitrary model-generated keys, sensitive fields (CPF, card, address), and bounds lengths.
 */
export function sanitizeQualification(raw: unknown): ConciergeQualification {
  if (!raw || typeof raw !== 'object') return {}
  const obj = raw as Record<string, unknown>
  const sanitized: ConciergeQualification = {}

  if (typeof obj.intentCategory === 'string' && ALLOWED_INTENTS.has(obj.intentCategory as InquiryIntent)) {
    sanitized.intentCategory = obj.intentCategory as InquiryIntent
  }

  if (typeof obj.preferredArea === 'string') {
    sanitized.preferredArea = obj.preferredArea.trim().slice(0, 50)
  }

  if (typeof obj.preferredTimeWindow === 'string') {
    sanitized.preferredTimeWindow = obj.preferredTimeWindow.trim().slice(0, 50)
  }

  if (typeof obj.contactPreference === 'string' && ALLOWED_CHANNELS_PREF.has(obj.contactPreference)) {
    sanitized.contactPreference = obj.contactPreference as 'WHATSAPP' | 'DIRECT_CALL' | 'TELEGRAM'
  }

  if (typeof obj.notes === 'string') {
    sanitized.notes = obj.notes.trim().slice(0, 200)
  }

  return sanitized
}

export async function updateConversationQualification(
  conversationId: string,
  qualification: Partial<ConciergeQualification>
): Promise<void> {
  const admin = createAdminClient()

  const { data: conv } = await admin
    .from('concierge_conversations')
    .select('qualification')
    .eq('id', conversationId)
    .single()

  const currentQual = (conv?.qualification || {}) as ConciergeQualification
  const sanitizedUpdates = sanitizeQualification(qualification)
  const merged = sanitizeQualification({ ...currentQual, ...sanitizedUpdates })

  await admin
    .from('concierge_conversations')
    .update({
      qualification: merged,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
}

/**
 * Asserts session and profile authority over a conversation (Section 9 & 10).
 * A raw conversation UUID alone is strictly insufficient.
 */
export async function assertConversationAuthority(
  conversationId: string,
  expectedProfileId: string,
  expectedVisitorSessionId: string
): Promise<ConciergeConversation> {
  const admin = createAdminClient()
  const { data: conv, error } = await admin
    .from('concierge_conversations')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle()

  if (error || !conv) {
    throw new Error('[concierge:dal] Conversa não encontrada.')
  }

  if (conv.profile_id !== expectedProfileId) {
    throw new Error('[concierge:dal] Acesso negado: conversa não pertence ao perfil especificado.')
  }

  if (conv.visitor_session_id !== expectedVisitorSessionId) {
    throw new Error('[concierge:dal] Acesso negado: sessão de visitante não autorizada.')
  }

  return conv as ConciergeConversation
}

/**
 * Validates canonical publication eligibility and concierge activation for public channels (Section 11).
 */
export async function assertPublicConciergeEligibility(profileId: string): Promise<boolean> {
  const admin = createAdminClient()

  // 1. Check canonical publication eligibility view
  const { data: eligible, error: eligibleError } = await admin
    .from('v_publication_eligible_profiles')
    .select('profile_id')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (eligibleError || !eligible) {
    return false
  }

  // 2. Check concierge enabled setting
  const { data: settings, error: settingsError } = await admin
    .from('professional_concierge_settings')
    .select('enabled')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (settingsError || !settings || !settings.enabled) {
    return false
  }

  return true
}

/**
 * Retrieves professional inquiries (Section 23, 25, 27).
 * An inquiry is an eligible conversation containing at least one visitor message.
 * Internal test conversations are filtered out by default unless explicitly requested.
 */
export async function getProfessionalInquiries(
  profileId: string,
  options?: { isTest?: boolean; limit?: number }
): Promise<ConciergeInquiryDTO[]> {
  const admin = createAdminClient()
  const isTest = options?.isTest ?? false
  const limit = options?.limit ?? 50

  // Fetch conversations for this profile
  const { data: convs, error } = await admin
    .from('concierge_conversations')
    .select('*')
    .eq('profile_id', profileId)
    .eq('is_test', isTest)
    .order('last_message_at', { ascending: false })
    .limit(limit)

  if (error || !convs || convs.length === 0) {
    return []
  }

  const convIds = convs.map((c) => c.id)

  // Fetch messages to filter conversations without visitor messages and build summaries
  const { data: messages } = await admin
    .from('concierge_messages')
    .select('id, conversation_id, role, content, created_at')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: true })

  const messagesByConv = new Map<string, Array<{ id: string; role: string; content: string; created_at: string }>>()
  for (const msg of messages || []) {
    const list = messagesByConv.get(msg.conversation_id) || []
    list.push(msg)
    messagesByConv.set(msg.conversation_id, list)
  }

  const inquiries: ConciergeInquiryDTO[] = []

  for (const conv of convs) {
    const convMessages = messagesByConv.get(conv.id) || []
    // Inquiry invariant (Section 23): must contain at least one meaningful visitor message
    const hasVisitorMsg = convMessages.some((m) => m.role === 'VISITOR')
    if (!hasVisitorMsg) {
      continue
    }

    const lastMsg = convMessages[convMessages.length - 1]
    const snippet = lastMsg
      ? lastMsg.content.length > 80
        ? `${lastMsg.content.slice(0, 77)}...`
        : lastMsg.content
      : ''

    inquiries.push({
      id: conv.id,
      profileId: conv.profile_id,
      visitorPseudonym: `Visitante #${conv.id.slice(0, 4)}`,
      channel: conv.channel,
      status: conv.status,
      isTest: conv.is_test,
      lastMessageSnippet: snippet,
      lastMessageRole: (lastMsg?.role as any) || 'VISITOR',
      messageCount: convMessages.length,
      qualification: (conv.qualification || {}) as ConciergeQualification,
      startedAt: conv.started_at,
      lastMessageAt: conv.last_message_at,
      handoffAt: conv.handoff_at,
      closedAt: conv.closed_at,
    })
  }

  return inquiries
}

/**
 * Retrieves full details and message history for an inquiry (Section 28, 29).
 * Enforces strict profile authority: a professional can only access conversations belonging to her profile.
 */
export async function getProfessionalInquiryDetail(
  conversationId: string,
  profileId: string
): Promise<ConciergeInquiryDetailDTO> {
  const admin = createAdminClient()

  const { data: conv, error: convError } = await admin
    .from('concierge_conversations')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle()

  if (convError || !conv) {
    throw new Error('[concierge:dal] Conversa não encontrada.')
  }

  // Strict profile isolation (Section 29)
  if (conv.profile_id !== profileId) {
    throw new Error('[concierge:dal] Acesso negado: conversa não pertence ao perfil especificado.')
  }

  const { data: messages, error: msgError } = await admin
    .from('concierge_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (msgError) {
    throw new Error(`[concierge:dal] Falha ao carregar mensagens: ${msgError.message}`)
  }

  // Exclude any SYSTEM messages from professional view
  const filteredMessages = (messages || []).filter((m) => m.role !== 'SYSTEM') as ConciergeMessage[]
  const lastMsg = filteredMessages[filteredMessages.length - 1]
  const snippet = lastMsg
    ? lastMsg.content.length > 80
      ? `${lastMsg.content.slice(0, 77)}...`
      : lastMsg.content
    : ''

  const inquiryDTO: ConciergeInquiryDTO = {
    id: conv.id,
    profileId: conv.profile_id,
    visitorPseudonym: `Visitante #${conv.id.slice(0, 4)}`,
    channel: conv.channel,
    status: conv.status,
    isTest: conv.is_test,
    lastMessageSnippet: snippet,
    lastMessageRole: (lastMsg?.role as any) || 'VISITOR',
    messageCount: filteredMessages.length,
    qualification: (conv.qualification || {}) as ConciergeQualification,
    startedAt: conv.started_at,
    lastMessageAt: conv.last_message_at,
    handoffAt: conv.handoff_at,
    closedAt: conv.closed_at,
  }

  return {
    conversation: inquiryDTO,
    messages: filteredMessages,
  }
}

/**
 * Updates status of an inquiry with profile authority check (Section 30).
 */
export async function updateProfessionalInquiryStatus(
  conversationId: string,
  profileId: string,
  status: ConciergeConversationStatus
): Promise<void> {
  const admin = createAdminClient()

  // Verify ownership
  const { data: conv, error: convError } = await admin
    .from('concierge_conversations')
    .select('id, profile_id')
    .eq('id', conversationId)
    .maybeSingle()

  if (convError || !conv || conv.profile_id !== profileId) {
    throw new Error('[concierge:dal] Acesso negado ou conversa não encontrada.')
  }

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'CLOSED') {
    updates.closed_at = new Date().toISOString()
  } else if (status === 'HANDOFF_COMPLETED') {
    updates.handoff_at = new Date().toISOString()
  }

  await admin.from('concierge_conversations').update(updates).eq('id', conversationId)
}

