/**
 * Concierge Domain Constants & Operational Bounds — PX5 Foundation
 */

export const MAX_USER_MESSAGE_LENGTH = 1000
export const MAX_CONTEXT_MESSAGES = 10
export const MAX_ASSISTANT_RESPONSE_TOKENS = 500
export const MAX_TOOL_CALLS_PER_TURN = 3
export const MAX_FAQS_PER_PROFILE = 10

export const DEFAULT_WELCOME_MESSAGE =
  'Olá! Sou a assistente virtual da Velvet. Como posso ajudar com dúvidas sobre este perfil?'

export const PROVIDER_FALLBACK_REPLY =
  'Não consegui processar a resposta no momento. Você pode entrar em contato diretamente com a profissional pelos canais informados no perfil.'

export const MINOR_REFUSAL_REPLY =
  'O Velvet é uma plataforma estritamente destinada a maiores de 18 anos. Não podemos prestar atendimento a menores de idade.'

export const SAFETY_REFUSAL_REPLY =
  'Não posso responder a solicitações que envolvam coerção, violência, ilegalidades ou violação dos termos de segurança da Velvet.'

export const BOOKING_DISCLAIMER_REPLY =
  'A Velvet é uma plataforma de classificados. Como assistente virtual, não realizo agendamentos vinculantes nem cobro valores de serviços. Todo contato e combinação ocorrem diretamente entre você e a profissional.'

export const SYSTEM_PROMPT_REFUSAL_REPLY =
  'Como assistente virtual da Velvet, minhas diretrizes e configurações de sistema são protegidas e confidenciais. Posso ajudar com informações públicas sobre o perfil da profissional.'

export const TONE_INSTRUCTIONS: Record<string, string> = {
  PROFESSIONAL: 'Mantenha um tom polido, objetivo, cordial e profissional.',
  WARM: 'Mantenha um tom caloroso, empático, receptivo e gentil.',
  DIRECT: 'Mantenha um tom direto, conciso, sem rodeios e focado nas informações essenciais.',
  DISCREET: 'Mantenha um tom extremamente discreto, reservado, minimalista e respeitoso.',
}
