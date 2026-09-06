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
  ConciergeMessage,
  ConciergeMessageRole,
  ConciergeMessageType,
  ConciergeQualification,
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
    .select('id, stage_name, bio, show_whatsapp, show_phone, show_telegram')
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
  const merged = { ...currentQual, ...qualification }

  await admin
    .from('concierge_conversations')
    .update({
      qualification: merged,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
}
