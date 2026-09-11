/**
 * AUTOMATED DECISION AUDIT — VELVET
 *
 * Phase: LGPD-01
 * Technical evaluation of automated processing, ranking, AI, and algorithmic systems
 * against the technical criteria of LGPD Art. 20 (Decisões unicamente automatizadas).
 *
 * Invariants:
 * - Technical evaluation only; no final legal conclusion encoded.
 * - Inspects actual codebase logic and implementations.
 */

export interface AutomatedDecisionCandidate {
  candidateId: string
  subsystem: string
  mechanismName: string
  usesPersonalData: boolean
  isSolelyAutomated: boolean
  hasLegalOrSignificantEffect: boolean
  qualifiesUnderLgpdArt20TechnicalCriteria: boolean
  sourceFiles: readonly string[]
  technicalDescription: string
  safeguardsAndHumanOversight: string
  auditAssessmentNotes: string
}

export const AUTOMATED_DECISION_AUDIT: readonly AutomatedDecisionCandidate[] = [
  {
    candidateId: 'MEDIA_CONTENT_MODERATION',
    subsystem: 'MODERATION',
    mechanismName: 'Moderação de Fotos e Vídeos de Perfil',
    usesPersonalData: true, // Images/videos of the individual
    isSolelyAutomated: false,
    hasLegalOrSignificantEffect: true, // Rejection prevents profile publication
    qualifiesUnderLgpdArt20TechnicalCriteria: false,
    sourceFiles: [
      'modules/moderation/actions.ts',
      'modules/admin/actions.ts',
      'supabase/migrations/20260818000006_content_moderation_and_reports.sql',
    ],
    technicalDescription: 'Photos and videos uploaded by advertisers enter PENDING_MODERATION status. Decisions (APPROVE, REJECT) are executed by human administrators via Admin review console.',
    safeguardsAndHumanOversight: 'DECISION IS HUMAN-DRIVEN: An administrator reviews the image/video, selects a structured reason code, and commits the decision. No fully automated image-recognition rejection pipeline currently executes final denials.',
    auditAssessmentNotes: 'Does not qualify as "solely automated" because a human moderator performs the actual review and makes the binding decision.',
  },
  {
    candidateId: 'KYC_AGE_AND_IDENTITY_VERIFICATION',
    subsystem: 'VERIFICATION',
    mechanismName: 'Verificação Didit de Identidade e Maioridade',
    usesPersonalData: true,
    isSolelyAutomated: true, // Didit provider algorithm makes initial automated match
    hasLegalOrSignificantEffect: true, // Fails onboarding if rejected
    qualifiesUnderLgpdArt20TechnicalCriteria: true,
    sourceFiles: [
      'modules/verification/providers/didit/',
      'modules/verification/actions.ts',
      'modules/verification/dal.ts',
    ],
    technicalDescription: 'Didit automated identity pipeline inspects government document validity, age calculation, and biometric face match. Emits webhook with outcome VERIFIED or REJECTED.',
    safeguardsAndHumanOversight: 'Human escalation available via manual review in Didit console; retry allowed for users. However, the operational gate automatically transitions user state based on provider webhook payload.',
    auditAssessmentNotes: 'HIGH RELEVANCE FOR LGPD ART. 20: Candidate qualifies technically because an automated algorithm evaluates personal biometric/document data and impacts the user’s ability to contract services. Right to review (revisão humana) must be supported.',
  },
  {
    candidateId: 'SEARCH_RANKING_AND_BOOST_PLACEMENT',
    subsystem: 'SEARCH_AND_PROMOTIONS',
    mechanismName: 'Algoritmo de Ordenação e Rotação Justa (Fair Rotation)',
    usesPersonalData: false, // Operates on commercial boost status and deterministic pseudo-random seeds
    isSolelyAutomated: true,
    hasLegalOrSignificantEffect: false, // Marketing ranking, does not alter civil rights or create binding legal effects
    qualifiesUnderLgpdArt20TechnicalCriteria: false,
    sourceFiles: [
      'modules/search/dal.ts',
      'modules/promotions/dal.ts',
      'modules/search/fair-rotation.ts',
    ],
    technicalDescription: 'Search results combine active paid boost placements (sponsored tier) and organic profiles. Within equal boost tiers, fair rotation applies deterministic round-robin hashing based on city, slot, and time window.',
    safeguardsAndHumanOversight: 'Transparent commercial rules: boosts are purchased by users. Organic ordering uses neutral rotation to ensure fair visibility.',
    auditAssessmentNotes: 'Does not produce legal effects or significantly affect individual rights under Art. 20. It is a commercial search presentation mechanism.',
  },
  {
    candidateId: 'AI_CONCIERGE_CHATBOT',
    subsystem: 'CONCIERGE',
    mechanismName: 'Assistente Virtual de Dúvidas de Perfil (OpenAI)',
    usesPersonalData: false, // Answers public facts about the profile
    isSolelyAutomated: true,
    hasLegalOrSignificantEffect: false, // Informational responses only, cannot book or transact
    qualifiesUnderLgpdArt20TechnicalCriteria: false,
    sourceFiles: [
      'modules/concierge/provider.ts',
      'modules/concierge/prompt.ts',
      'modules/concierge/gate.ts',
    ],
    technicalDescription: 'Natural language generator that answers visitor questions regarding advertised rates, location, and verified FAQs based strictly on profile data.',
    safeguardsAndHumanOversight: 'HARD SAFETY BOUNDARY: System explicitly refuses to book reservations, accept payments, or negotiate terms. Handoff to human advertiser is triggered upon inquiry.',
    auditAssessmentNotes: 'Does not qualify as a decision affecting user legal interests. Purely conversational information dissemination tool.',
  },
  {
    candidateId: 'RATE_LIMITING_AND_ABUSE_PREVENTION',
    subsystem: 'SECURITY',
    mechanismName: 'Bloqueio Automático por Limite de Taxa (Rate Limiting)',
    usesPersonalData: false, // Uses HMAC pseudonymized keys, never raw IP or account profiling
    isSolelyAutomated: true,
    hasLegalOrSignificantEffect: false, // Temporary 15-minute sliding window HTTP 429
    qualifiesUnderLgpdArt20TechnicalCriteria: false,
    sourceFiles: [
      'modules/security/rate-limiter.ts',
      'modules/auth/rate-limiter.ts',
      'modules/analytics/rate-limiter.ts',
    ],
    technicalDescription: 'Sliding-window counters block repetitive requests (e.g. >10 login attempts per 15 min) with HTTP 429.',
    safeguardsAndHumanOversight: 'Temporary technical throttle; expires automatically. Does not ban or alter account status permanently.',
    auditAssessmentNotes: 'Technical network security protection, not an automated profiling decision under LGPD.',
  },
] as const
