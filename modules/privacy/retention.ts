import type { RetentionStatus, LegalBasisStatus } from './types'

/**
 * RETENTION POLICY FRAMEWORK — VELVET
 *
 * Phase: LGPD-01.1
 * Configures the technical governance structure for data lifecycle and retention.
 *
 * MANDATORY STATUS NOTICE:
 * In accordance with LGPD engineering guidelines:
 * - All retention periods below are strictly UNDEFINED / DRAFT proposals.
 * - Engineering does NOT propose or approve legal retention durations.
 * - Legal bases remain marked LEGAL_APPROVAL_REQUIRED.
 * - No automated deletion or purge job is active.
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
    durationDraftDays: null,
    durationDescription: 'RETENTION PERIOD = UNDEFINED (LEGAL REVIEW REQUIRED)',
    legalReferenceDraft: 'LGPD Art. 16 (Eliminação de dados pessoais)',
    policyVersion: '0.1-DRAFT',
    retentionStatus: 'UNDEFINED',
    legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
    approvedAt: null,
    approvedBy: null,
    notes: 'Purges direct identifiers upon approved DSR. Dependent records subject to legal retention determination.',
  },
  {
    categoryKey: 'IDENTITY_AND_AGE_VERIFICATION',
    displayName: 'Verificação de Identidade e Maioridade (KYC)',
    tables: ['public.identity_verifications', 'public.verification_webhook_events'],
    triggerEvent: 'ACCOUNT_CLOSURE_OR_PROFILE_DEACTIVATION',
    durationDraftDays: null,
    durationDescription: 'RETENTION PERIOD = UNDEFINED (LEGAL REVIEW REQUIRED)',
    legalReferenceDraft: 'ECA Art. 240-241; LGPD Art. 16, I (Cumprimento de obrigação legal) — Período exato pendente de decisão jurídica formal',
    policyVersion: '0.1-DRAFT',
    retentionStatus: 'UNDEFINED',
    legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
    approvedAt: null,
    approvedBy: null,
    notes: 'Compliance defense record for age verification (18+). Specific statutory duration requires legal sign-off.',
  },
  {
    categoryKey: 'PUBLIC_PROFILES_AND_MEDIA',
    displayName: 'Perfis Profissionais, Fotos e Vídeos',
    tables: ['public.professional_profiles', 'public.profile_media', 'public.profile_videos', 'profile-media', 'profile-videos'],
    triggerEvent: 'ACCOUNT_DELETION_OR_PROFILE_EXPIRATION',
    durationDraftDays: null,
    durationDescription: 'RETENTION PERIOD = UNDEFINED (LEGAL REVIEW REQUIRED)',
    legalReferenceDraft: 'LGPD Art. 16 (Eliminação após término do tratamento)',
    policyVersion: '0.1-DRAFT',
    retentionStatus: 'UNDEFINED',
    legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
    approvedAt: null,
    approvedBy: null,
    notes: 'Unpublished from public view immediately upon event. Storage deletion workflow requires approved legal lifecycle.',
  },
  {
    categoryKey: 'COMMERCIAL_AND_BILLING_CONTRACTS',
    displayName: 'Registros Fiscais e Assinaturas Comerciais',
    tables: ['public.subscriptions', 'public.billing_webhook_events', 'public.billing_admin_audit_logs'],
    triggerEvent: 'TRANSACTION_DATE_OR_INVOICE_ISSUANCE',
    durationDraftDays: null,
    durationDescription: 'RETENTION PERIOD = UNDEFINED (LEGAL REVIEW REQUIRED)',
    legalReferenceDraft: 'Código Tributário Nacional / Código Civil / LGPD Art. 16, I — Período exato pendente de decisão jurídica formal',
    policyVersion: '0.1-DRAFT',
    retentionStatus: 'UNDEFINED',
    legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
    approvedAt: null,
    approvedBy: null,
    notes: 'Tax and commercial records. Must be dissociated from operational profiles once legal period is determined.',
  },
  {
    categoryKey: 'CONTENT_MODERATION_AND_STATUS_AUDIT',
    displayName: 'Auditoria de Moderação e Takedowns',
    tables: ['public.profile_moderation_reviews', 'public.media_moderation_reviews', 'public.professional_profile_status_events', 'public.content_reports'],
    triggerEvent: 'MODERATION_DECISION_TIMESTAMP',
    durationDraftDays: null,
    durationDescription: 'RETENTION PERIOD = UNDEFINED (LEGAL REVIEW REQUIRED)',
    legalReferenceDraft: 'Marco Civil da Internet Art. 19; LGPD Art. 16, II (Exercício regular de direitos) — Período exato pendente de decisão jurídica formal',
    policyVersion: '0.1-DRAFT',
    retentionStatus: 'UNDEFINED',
    legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
    approvedAt: null,
    approvedBy: null,
    notes: 'Platform safe harbor evidence under Marco Civil da Internet. Legal review required for limitation period.',
  },
  {
    categoryKey: 'USAGE_TELEMETRY_AND_INTERACTION_EVENTS',
    displayName: 'Eventos de Telemetria e Métricas de Uso',
    tables: ['public.analytics_events', 'public.profile_daily_metrics'],
    triggerEvent: 'EVENT_CREATION_TIMESTAMP',
    durationDraftDays: null,
    durationDescription: 'RETENTION PERIOD = UNDEFINED (LEGAL REVIEW REQUIRED)',
    legalReferenceDraft: 'LGPD Art. 12 (Dados anonimizados não são considerados pessoais)',
    policyVersion: '0.1-DRAFT',
    retentionStatus: 'UNDEFINED',
    legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
    approvedAt: null,
    approvedBy: null,
    notes: 'Granular telemetry vs aggregated statistical metrics. Anonymization timeline requires policy approval.',
  },
  {
    categoryKey: 'AI_CONCIERGE_CHATS',
    displayName: 'Conversas e Mensagens do AI Concierge',
    tables: ['public.concierge_conversations', 'public.concierge_messages'],
    triggerEvent: 'CONVERSATION_CLOSED_TIMESTAMP',
    durationDraftDays: null,
    durationDescription: 'RETENTION PERIOD = UNDEFINED (LEGAL REVIEW REQUIRED)',
    legalReferenceDraft: 'LGPD Art. 16 (Término do tratamento)',
    policyVersion: '0.1-DRAFT',
    retentionStatus: 'UNDEFINED',
    legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
    approvedAt: null,
    approvedBy: null,
    notes: 'Currently staged/disabled in production. Formal retention policy required prior to public activation.',
  },
  {
    categoryKey: 'DATA_SUBJECT_REQUESTS_LEDGER',
    displayName: 'Histórico de Solicitações LGPD',
    tables: ['public.data_subject_requests', 'public.data_subject_request_events'],
    triggerEvent: 'REQUEST_RESOLUTION_TIMESTAMP',
    durationDraftDays: null,
    durationDescription: 'RETENTION PERIOD = UNDEFINED (LEGAL REVIEW REQUIRED)',
    legalReferenceDraft: 'LGPD Art. 18 e 19; LGPD Art. 16, I (Cumprimento de obrigação legal) — Período pendente de decisão jurídica formal',
    policyVersion: '0.1-DRAFT',
    retentionStatus: 'UNDEFINED',
    legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
    approvedAt: null,
    approvedBy: null,
    notes: 'Statutory compliance ledger. Foreign key uses RESTRICT to prevent accidental cascading deletion.',
  },
] as const

/**
 * Returns true only if a retention policy has received formal legal sign-off.
 * In Phase LGPD-01.1, this always returns false.
 */
export function isRetentionPolicyApproved(categoryKey: string): boolean {
  const policy = RETENTION_POLICY_FRAMEWORK.find((p) => p.categoryKey === categoryKey)
  return policy?.retentionStatus === 'APPROVED'
}
