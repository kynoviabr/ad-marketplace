/**
 * DELETION IMPACT MATRIX — VELVET
 *
 * Phase: LGPD-01
 * Analyzes the structural, operational, and legal impact of deleting or anonymizing
 * each data family.
 *
 * NOTE: This matrix provides technical analysis for engineering and legal teams.
 * All retention policies and retention durations remain marked LEGAL_REVIEW_REQUIRED.
 */

export interface DeletionImpactItem {
  dataFamily: string
  tablesAndStores: readonly string[]
  recommendedAction: 'DELETE' | 'ANONYMIZE' | 'DETACH_FROM_IDENTITY' | 'RETAIN_WITH_JUSTIFICATION_REQUIRED' | 'EXTERNAL_DELETE' | 'MANUAL_REVIEW'
  legalReviewStatus: 'LEGAL_REVIEW_REQUIRED' | 'LEGAL_APPROVAL_REQUIRED' | 'TECHNICAL_BASELINE_ESTABLISHED'
  primaryRationale: string
  integrityRisks: string
  cascadeOrphanImpact: string
  dependencies: readonly string[]
}

export const DELETION_IMPACT_MATRIX: readonly DeletionImpactItem[] = [
  {
    dataFamily: 'AUTH_CREDENTIALS',
    tablesAndStores: ['auth.users'],
    recommendedAction: 'DELETE',
    legalReviewStatus: 'TECHNICAL_BASELINE_ESTABLISHED',
    primaryRationale: 'Subject erasure request terminates credentials, email, hashed passwords, and session tokens.',
    integrityRisks: 'Terminating auth user severs all authenticated sessions immediately.',
    cascadeOrphanImpact: 'Cascades to account_users, triggering application-level lifecycle hooks.',
    dependencies: ['Supabase Auth Admin API'],
  },
  {
    dataFamily: 'ACCOUNT_IDENTITY',
    tablesAndStores: ['public.account_users', 'public.client_signup_intents'],
    recommendedAction: 'DELETE',
    legalReviewStatus: 'TECHNICAL_BASELINE_ESTABLISHED',
    primaryRationale: 'Core account identity record. Deleted upon approved subject erasure.',
    integrityRisks: 'Must ensure audit logs and financial records are detached or retained before account record deletion.',
    cascadeOrphanImpact: 'Cascades to professional_profiles, client_memberships, subscriptions.',
    dependencies: ['auth.users'],
  },
  {
    dataFamily: 'KYC_AND_VERIFICATION_RECORDS',
    tablesAndStores: ['public.identity_verifications', 'public.verification_webhook_events'],
    recommendedAction: 'RETAIN_WITH_JUSTIFICATION_REQUIRED',
    legalReviewStatus: 'LEGAL_APPROVAL_REQUIRED',
    primaryRationale: 'Compliance defense: Proof of age verification (18+) is legally critical to demonstrate the platform never advertised minors (ECA / Art. 240-241). Minimum retention period must be established by legal counsel.',
    integrityRisks: 'Deleting verification records creates regulatory liability if past advertising legality is questioned.',
    cascadeOrphanImpact: 'Contains account_user_id. If account is erased, verification row can either be preserved under legal hold or detached.',
    dependencies: ['Didit verification reference'],
  },
  {
    dataFamily: 'PUBLIC_PROFILE_AND_ATTRIBUTES',
    tablesAndStores: [
      'public.professional_profiles',
      'public.professional_profile_locations',
      'public.professional_profile_offerings',
    ],
    recommendedAction: 'DELETE',
    legalReviewStatus: 'TECHNICAL_BASELINE_ESTABLISHED',
    primaryRationale: 'Public advertisement content (stage name, bio, phones, attributes, locations) must be removed immediately upon deletion request.',
    integrityRisks: 'Profile disappears from search index, location results, and sitemaps immediately.',
    cascadeOrphanImpact: 'Cascades to offerings, locations, media rows, boost campaigns.',
    dependencies: ['account_users'],
  },
  {
    dataFamily: 'MEDIA_FILES_AND_STORAGE',
    tablesAndStores: [
      'public.profile_media',
      'public.profile_videos',
      'profile-media (bucket)',
      'profile-videos (bucket)',
    ],
    recommendedAction: 'DELETE',
    legalReviewStatus: 'TECHNICAL_BASELINE_ESTABLISHED',
    primaryRationale: 'Photos, video files, and posters must be permanently purged from private storage buckets and database metadata.',
    integrityRisks: 'Database CASCADE deletes metadata, but physical objects in Supabase Storage must be removed via Storage API to prevent orphan storage files.',
    cascadeOrphanImpact: 'Requires coordinated deletion: (1) revoke active signed URLs / cache, (2) delete storage objects, (3) delete DB records.',
    dependencies: ['Supabase Storage API'],
  },
  {
    dataFamily: 'MODERATION_AND_STATUS_AUDIT_LOGS',
    tablesAndStores: [
      'public.profile_moderation_reviews',
      'public.media_moderation_reviews',
      'public.profile_video_moderation_events',
      'public.professional_profile_status_events',
    ],
    recommendedAction: 'RETAIN_WITH_JUSTIFICATION_REQUIRED',
    legalReviewStatus: 'LEGAL_APPROVAL_REQUIRED',
    primaryRationale: 'Legal defense: Records of content moderation decisions, takedowns, and suspension actions demonstrate compliance with Brazilian Civil Rights Framework for the Internet (Marco Civil da Internet, Art. 19).',
    integrityRisks: 'Immutable append-only triggers block UPDATE/DELETE statements on status events.',
    cascadeOrphanImpact: 'May be pseudonymized or retained in archive with subject reference detached.',
    dependencies: ['Marco Civil da Internet legal baseline'],
  },
  {
    dataFamily: 'BILLING_AND_FINANCIAL_TRANSACTIONS',
    tablesAndStores: [
      'public.subscriptions',
      'public.billing_webhook_events',
      'public.billing_overrides',
      'public.billing_admin_audit_logs',
      'public.profile_boosts',
    ],
    recommendedAction: 'RETAIN_WITH_JUSTIFICATION_REQUIRED',
    legalReviewStatus: 'LEGAL_APPROVAL_REQUIRED',
    primaryRationale: 'Financial and tax compliance: Brazilian Tax Code (CTN Art. 174) and Civil Code (Art. 206) require retention of commercial transaction records for 5 years.',
    integrityRisks: 'Premature deletion creates severe tax and commercial liabilities.',
    cascadeOrphanImpact: 'Subscriptions cascade on account_users; to retain, foreign key must be detached (SET NULL) or records moved to an immutable financial archive before account deletion.',
    dependencies: ['Brazilian Tax & Commercial Law (5-year rule)'],
  },
  {
    dataFamily: 'USER_REVIEWS_AND_FEEDBACK',
    tablesAndStores: [
      'public.professional_reviews',
      'public.professional_review_responses',
      'public.review_reports',
    ],
    recommendedAction: 'ANONYMIZE',
    legalReviewStatus: 'LEGAL_APPROVAL_REQUIRED',
    primaryRationale: 'If a client requests account deletion, deleting their reviews would distort the historical rating score of professionals. Anonymizing (clearing comment text and detaching reviewer ID) preserves score aggregate integrity without retaining PII.',
    integrityRisks: 'Direct CASCADE deletion alters professional average ratings and historical reviews.',
    cascadeOrphanImpact: 'Requires replacing reviewer_account_user_id with an anonymous marker or nullifying user link.',
    dependencies: ['Professional rating algorithm'],
  },
  {
    dataFamily: 'CLIENT_VIP_MEMBERSHIP',
    tablesAndStores: ['public.client_memberships'],
    recommendedAction: 'DELETE',
    legalReviewStatus: 'TECHNICAL_BASELINE_ESTABLISHED',
    primaryRationale: 'Client VIP status is private account data. Purged on client deletion.',
    integrityRisks: 'Immediately terminates VIP access.',
    cascadeOrphanImpact: 'Cascades cleanly with account_users.',
    dependencies: ['account_users'],
  },
  {
    dataFamily: 'TELEMETRY_AND_USAGE_METRICS',
    tablesAndStores: [
      'public.analytics_events',
      'public.profile_daily_metrics',
      'public.platform_daily_metrics',
    ],
    recommendedAction: 'ANONYMIZE',
    legalReviewStatus: 'TECHNICAL_BASELINE_ESTABLISHED',
    primaryRationale: 'Analytics events store no raw IP and only use pseudonymous visitor session IDs. On deletion, visitor sessions can be disassociated; daily aggregated counts are non-personal statistics.',
    integrityRisks: 'Aggregated counters (impressions/clicks) do not identify individuals and remain in profile_daily_metrics.',
    cascadeOrphanImpact: 'Events have ON DELETE CASCADE or SET NULL.',
    dependencies: ['Client localStorage'],
  },
  {
    dataFamily: 'AGENDA_AND_AVAILABILITY',
    tablesAndStores: [
      'public.professional_availability_settings',
      'public.professional_weekly_availability',
      'public.professional_availability_exceptions',
    ],
    recommendedAction: 'DELETE',
    legalReviewStatus: 'TECHNICAL_BASELINE_ESTABLISHED',
    primaryRationale: 'Operational schedule of the advertiser. Deleted with profile.',
    integrityRisks: 'None.',
    cascadeOrphanImpact: 'Cascades cleanly with professional_profiles.',
    dependencies: ['professional_profiles'],
  },
  {
    dataFamily: 'AI_CONCIERGE_CHATS',
    tablesAndStores: [
      'public.professional_concierge_settings',
      'public.professional_concierge_faqs',
      'public.concierge_conversations',
      'public.concierge_messages',
    ],
    recommendedAction: 'DELETE',
    legalReviewStatus: 'LEGAL_APPROVAL_REQUIRED',
    primaryRationale: 'Chat inquiries and assistant replies should be deleted when the profile is erased or when conversation retention window expires (window pending legal approval).',
    integrityRisks: 'Currently gated in production (CONCIERGE_WEB_PUBLIC_ENABLED=false).',
    cascadeOrphanImpact: 'Cascades with profile.',
    dependencies: ['OpenAI API zero-retention / 30-day policy'],
  },
  {
    dataFamily: 'SECURITY_RATE_LIMITS',
    tablesAndStores: ['public.distributed_rate_limits'],
    recommendedAction: 'DELETE',
    legalReviewStatus: 'TECHNICAL_BASELINE_ESTABLISHED',
    primaryRationale: 'Sliding window counters expire automatically. No PII stored (HMAC keys only).',
    integrityRisks: 'None.',
    cascadeOrphanImpact: 'Independent rows with automatic TTL expiration.',
    dependencies: ['Crypto HMAC'],
  },
  {
    dataFamily: 'DATA_SUBJECT_REQUEST_LEDGER',
    tablesAndStores: [
      'public.data_subject_requests',
      'public.data_subject_request_events',
    ],
    recommendedAction: 'RETAIN_WITH_JUSTIFICATION_REQUIRED',
    legalReviewStatus: 'LEGAL_APPROVAL_REQUIRED',
    primaryRationale: 'Proof of compliance with LGPD: The controller must retain evidence that data subject requests were received, processed, and fulfilled according to statutory deadlines (LGPD Art. 18 / 19).',
    integrityRisks: 'Foreign key uses RESTRICT to prevent deleting the request history even if the subject is erased.',
    cascadeOrphanImpact: 'Requester ID is retained as audit foreign key or anonymized reference.',
    dependencies: ['LGPD statutory defense obligation'],
  },
] as const
