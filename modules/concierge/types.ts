/**
 * Concierge Domain Types — PX5 Foundation
 *
 * Defines settings, FAQs, conversations, messages, tools, and qualification schemas
 * for the Velvet AI Concierge foundation.
 */

export type ConciergeTone = 'PROFESSIONAL' | 'WARM' | 'DIRECT' | 'DISCREET'

export type ConciergeChannel = 'INTERNAL_TEST' | 'WEB_PUBLIC' | 'WHATSAPP_OFFICIAL'

export type ConciergeConversationStatus =
  | 'ACTIVE'
  | 'HANDOFF_REQUESTED'
  | 'HANDOFF_COMPLETED'
  | 'CLOSED'

export type ConciergeMessageRole = 'VISITOR' | 'ASSISTANT' | 'PROFESSIONAL' | 'SYSTEM'

export type ConciergeMessageType = 'TEXT' | 'HANDOFF_NOTE' | 'QUALIFICATION_NOTE'

export interface ProfessionalConciergeSettings {
  profile_id: string
  enabled: boolean
  assistant_display_name: string
  welcome_message: string
  tone: ConciergeTone
  qualification_enabled: boolean
  handoff_enabled: boolean
  created_at: string
  updated_at: string
}

export interface ProfessionalConciergeFaq {
  id: string
  profile_id: string
  question: string
  answer: string
  enabled: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type InquiryIntent =
  | 'GREETING'
  | 'RATES_INQUIRY'
  | 'AVAILABILITY_INQUIRY'
  | 'SERVICE_INQUIRY'
  | 'LOCATION_INQUIRY'
  | 'HANDOFF_REQUEST'
  | 'GENERAL'
  | 'SAFETY_BLOCKED'

export interface ConciergeQualification {
  intentCategory?: InquiryIntent
  preferredArea?: string
  preferredTimeWindow?: string
  contactPreference?: 'WHATSAPP' | 'DIRECT_CALL' | 'TELEGRAM'
  notes?: string
}

export interface ConciergeConversation {
  id: string
  profile_id: string
  channel: ConciergeChannel
  status: ConciergeConversationStatus
  visitor_session_id: string
  is_test: boolean
  qualification: ConciergeQualification
  started_at: string
  last_message_at: string
  handoff_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

export interface ConciergeMessage {
  id: string
  conversation_id: string
  role: ConciergeMessageRole
  message_type: ConciergeMessageType
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface ConciergeToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface ConciergeToolResult {
  tool_call_id: string
  result: unknown
  error?: string
}

export interface ConciergeModelResponse {
  replyText: string
  intent?: InquiryIntent
  qualificationUpdate?: Partial<ConciergeQualification>
  handoffRequested?: boolean
  toolRequests?: ConciergeToolCall[]
}

export interface ConciergeContextFacts {
  profileId: string
  stageName: string
  city: string
  aboutMe?: string
  serviceLocations: string[]
  servicesOffered: string[]
  contactChannels: {
    whatsapp: boolean
    phone: boolean
    telegram: boolean
  }
}

export interface ConciergeGenerateParams {
  conversationId: string
  profileId: string
  visitorMessage: string
  settings: ProfessionalConciergeSettings
  faqs: ProfessionalConciergeFaq[]
  facts: ConciergeContextFacts
  history: ConciergeMessage[]
  isTest?: boolean
  channel?: ConciergeChannel
}

export interface ConciergeRuntimeResult {
  replyText: string
  intent: InquiryIntent
  handoffRequested: boolean
  conversationStatus: ConciergeConversationStatus
  qualification: ConciergeQualification
  assistantMessageId: string
}
