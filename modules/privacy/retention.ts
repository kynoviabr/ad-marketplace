import type { RetentionStatus, LegalBasisStatus } from './types'

/**
 * RETENTION POLICY FRAMEWORK — VELVET
 *
 * Phase: LGPD-01
 * Configures the technical governance structure for data lifecycle and retention.
 *
 * MANDATORY STATUS NOTICE:
 * In accordance with LGPD engineering guidelines:
 * - All retention periods below are strictly DRAFT proposals.
 * - Legal bases remain marked LEGAL_APPROVAL_REQUIRED.
 * - No automated deletion or purge job is active in this phase.
 * - Formal legal counsel sign-off is required before any policy transitions to APPROVED.
 */

export interface RetentionPolicyEntry {
  categoryKey: string
  displayName: string
  tables: readonly string[]
  triggerEvent: string
  durationDraftDays: number | null
  durationDescription: string
  legalReferenceDraft: string
  policyVersion: string
  retentionStatus: RetentionStatus
  legalBasisStatus: LegalBasisStatus
  approvedAt: string | null
  approvedBy: string | null
  notes: string
}

export const RETENTION_POLICY_FRAMEWORK: readonly RetentionPolicyEntry[] = [
  {
    categoryKey: 'USER_CREDENTIALS_AND_ACCOUNTS',
    displayName: 'Credenciais e Dados da Conta',
    tables: ['auth.users', 'public.account_users', 'public.client_memberships'],
    triggerEvent: 'ACCOUNT_DELETION_APPROVED',
    durationDraftDays: 0,
    durationDescription: 'Immediate deletion upon approved data subject request (or 30-day grace period if required for security).',
    legalReferenceDraft: 'LGPD Art. 16 (Eliminação de dados pessoais)',
    policyVersion: '0.1-DRAFT',
    retentionStatus: 'DRAFT',
    legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
    approvedAt: null,
    approvedBy: null,
    notes: 'Purges direct identifiers. Dependent transactional records must be handled in accordance with legal retention obligations.',
  },
  {
    categoryKey: 'IDENTITY_AND_AGE_VERIFICATION',
    displayName: 'Verificação de Identidade e Maioridade (KYC)',
    tables: ['public.identity_verifications', 'public.verification_webhook_events'],
    triggerEvent: 'ACCOUNT_CLOSURE_OR_PROFILE_DEACTIVATION',
    durationDraftDays: 1825, // 5 years draft proposal
    durationDescription: 'Proposed 5 years following account closure for statutory compliance defense (protection of minors).',
    legalReferenceDraft: 'Estatuto da Criança e do Adolescente (ECA) Art. 240-241; LGPD Art. 16, I (Cumprimento de obrigação legal)',
    policyVersion: '0.1-DRAFT',
    retentionStatus: 'DRAFT',
    legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
    approvedAt: null,
    approvedBy: null,
    notes: 'Critical legal hold record to prove the marketplace strictly verified 18+ age before publishing advertisements.',
  },
  {
    categoryKey: 'PUBLIC_PROFILES_AND_MEDIA',
    displayName: 'Perfis Profissionais, Fotos e Vídeos',
    tables: ['public.professional_profiles', 'public.profile_media', 'public.profile_videos', 'profile-media', 'profile-videos'],
    triggerEvent: 'ACCOUNT_DELETION_OR_PROFILE_EXPIRATION',
    durationDraftDays: 0,
    durationDescription: 'Immediate unpublishing; storage file purge within 24 hours of deletion approval.',
    legalReferenceDraft: 'LGPD Art. 16 (Eliminação após término do tratamento)',
    policyVersion: '0.1-DRAFT',
    retentionStatus: 'DRAFT',
    legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
    approvedAt: null,
    approvedBy: null,
    notes: 'Unpublished immediately from public view. Physical storage assets coordinated deletion.',
  },
  {
    categoryKey: 'COMMERCIAL_AND_BILLING_CONTRACTS',
    displayName: 'Registros Fiscais e Assinaturas Comerciais',
    tables: ['public.subscriptions', 'public.billing_webhook_events', 'public.billing_admin_audit_logs'],
    triggerEvent: 'TRANSACTION_DATE_OR_INVOICE_ISSUANCE',
    durationDraftDays: 1825, // 5 years
    durationDescription: '5 years from transaction date (tax and civil statute of limitations).',
    legalReferenceDraft: 'Código Tributário Nacional (CTN) Art. 174; Código Civil Art. 206, §5º; LGPD Art. 16, I',
    policyVersion: '0.1-DRAFT',
    retentionStatus: 'DRAFT',
    legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
    approvedAt: null,
    approvedBy: null,
    notes: 'Mandatory retention under Brazilian tax law. Data must be detached from operational user accounts.',
  },
  {
    categoryKey: 'CONTENT_MODERATION_AND_STATUS_AUDIT',
    displayName: 'Auditoria de Moderação e Takedowns',
    tables: ['public.profile_moderation_reviews', 'public.media_moderation_reviews', 'public.professional_profile_status_events', 'public.content_reports'],
    triggerEvent: 'MODERATION_DECISION_TIMESTAMP',
    durationDraftDays: 1095, // 3 years draft proposal
    durationDescription: 'Proposed 3 years from moderation action.',
    legalReferenceDraft: 'Marco Civil da Internet (Lei 12.965/2014) Art. 19; LGPD Art. 16, II (Exercício regular de direitos)',
    policyVersion: '0.1-DRAFT',
    retentionStatus: 'DRAFT',
    legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
    approvedAt: null,
    approvedBy: null,
    notes: 'Evidence of prompt content moderation and platform safe harbor protections under Marco Civil.',
  },
  {
    categoryKey: 'USAGE_TELEMETRY_AND_INTERACTION_EVENTS',
    displayName: 'Eventos de Telemetria e Métricas de Uso',
    tables: ['public.analytics_events', 'public.profile_daily_metrics'],
    triggerEvent: 'EVENT_CREATION_TIMESTAMP',
    durationDraftDays: 180, // 6 months draft proposal
    durationDescription: '6 months for granular events; aggregated metrics indefinitely retained as anonymous statistics.',
    legalReferenceDraft: 'LGPD Art. 12 (Dados anonimizados não são considerados pessoais)',
    policyVersion: '0.1-DRAFT',
    retentionStatus: 'DRAFT',
    legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
    approvedAt: null,
    approvedBy: null,
    notes: 'Events store pseudonymous visitor_session_id only. Daily summaries contain aggregate numerical counts only.',
  },
  {
    categoryKey: 'AI_CONCIERGE_CHATS',
    displayName: 'Conversas e Mensagens do AI Concierge',
    tables: ['public.concierge_conversations', 'public.concierge_messages'],
    triggerEvent: 'CONVERSATION_CLOSED_TIMESTAMP',
    durationDraftDays: 90, // 90 days draft proposal
    durationDescription: 'Proposed 90 days following conversation closure.',
    legalReferenceDraft: 'LGPD Art. 16 (Término do tratamento)',
    policyVersion: '0.1-DRAFT',
    retentionStatus: 'DRAFT',
    legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
    approvedAt: null,
    approvedBy: null,
    notes: 'Currently staged/inactive in production. Formal policy required before public rollout.',
  },
  {
    categoryKey: 'DATA_SUBJECT_REQUESTS_LEDGER',
    displayName: 'Histórico de Solicitações LGPD',
    tables: ['public.data_subject_requests', 'public.data_subject_request_events'],
    triggerEvent: 'REQUEST_RESOLUTION_TIMESTAMP',
    durationDraftDays: 1825, // 5 years
    durationDescription: '5 years from resolution to prove compliance with statutory request handling.',
    legalReferenceDraft: 'LGPD Art. 18 e 19; LGPD Art. 16, I (Cumprimento de obrigação legal)',
    policyVersion: '0.1-DRAFT',
    retentionStatus: 'DRAFT',
    legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
    approvedAt: null,
    approvedBy: null,
    notes: 'Preserves evidence of compliance with data subject rights. Foreign key uses RESTRICT.',
  },
] as const

/**
 * Returns true only if a retention policy has received formal legal sign-off.
 * In Phase LGPD-01, this always returns false.
 */
export function isRetentionPolicyApproved(categoryKey: string): boolean {
  const policy = RETENTION_POLICY_FRAMEWORK.find((p) => p.categoryKey === categoryKey)
  return policy?.retentionStatus === 'APPROVED'
}
