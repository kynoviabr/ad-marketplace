/**
 * DATA EXPORT DESIGN & LGPD-02 IMPLEMENTATION PLAN — VELVET
 *
 * Phase: LGPD-01 Foundation
 * Target: LGPD-02 Execution Engine
 *
 * Defines the canonical data package structure for fulfilling LGPD Art. 18, II (Access)
 * and Art. 18, V (Data Portability) requests, as well as strict exclusion criteria.
 */

export interface ExportDatasetDefinition {
  datasetKey: string
  displayName: string
  sourceTables: readonly string[]
  includedFields: readonly string[]
  excludedFieldsWithRationale: Record<string, string>
}

export const USER_EXPORT_DATASET_DEFINITIONS: readonly ExportDatasetDefinition[] = [
  {
    datasetKey: 'ACCOUNT_DATA',
    displayName: 'Dados Cadastrais da Conta',
    sourceTables: ['auth.users', 'public.account_users', 'public.client_memberships'],
    includedFields: [
      'email',
      'role',
      'status',
      'created_at',
      'updated_at',
      'membership_type (if client)',
      'membership_valid_until',
    ],
    excludedFieldsWithRationale: {
      encrypted_password: 'Security secret: password hash must never be exported.',
      raw_app_meta_data: 'Internal Supabase system metadata.',
      internal_uuids: 'Internal surrogate keys are not personal data and provide no portability value.',
    },
  },
  {
    datasetKey: 'LEGAL_ACCEPTANCE_HISTORY',
    displayName: 'Histórico de Aceite Legal',
    sourceTables: ['public.account_users'],
    includedFields: [
      'terms_version',
      'terms_accepted_at',
      'privacy_version',
      'privacy_accepted_at',
    ],
    excludedFieldsWithRationale: {},
  },
  {
    datasetKey: 'PROFILE_DATA',
    displayName: 'Dados do Perfil Profissional',
    sourceTables: [
      'public.professional_profiles',
      'public.professional_profile_locations',
      'public.professional_profile_offerings',
    ],
    includedFields: [
      'stage_name',
      'slug',
      'headline',
      'bio',
      'public_age',
      'physical_attributes (height, weight, measurements, eye/hair color)',
      'languages',
      'contact_channels (whatsapp, direct_phone, telegram)',
      'service_locations (city name, neighborhood)',
      'offerings (services selected, customized pricing)',
      'created_at',
      'published_at',
    ],
    excludedFieldsWithRationale: {
      content_moderation_status: 'Internal moderation flag.',
    },
  },
  {
    datasetKey: 'MEDIA_METADATA',
    displayName: 'Metadados de Mídias e Fotos',
    sourceTables: ['public.profile_media', 'public.profile_videos'],
    includedFields: [
      'media_id',
      'media_type (photo/video)',
      'position',
      'mime_type',
      'file_size_bytes',
      'created_at',
      'approved_at',
      'duration_seconds (for videos)',
    ],
    excludedFieldsWithRationale: {
      storage_path: 'Internal cloud bucket path structure.',
      moderation_notes: 'Internal moderator remarks.',
    },
  },
  {
    datasetKey: 'AGENDA_AND_AVAILABILITY',
    displayName: 'Configurações de Agenda e Horários',
    sourceTables: [
      'public.professional_availability_settings',
      'public.professional_weekly_availability',
      'public.professional_availability_exceptions',
    ],
    includedFields: [
      'timezone',
      'slot_duration_minutes',
      'minimum_notice_minutes',
      'weekly_schedule (day of week, start time, end time)',
      'exception_dates',
    ],
    excludedFieldsWithRationale: {},
  },
  {
    datasetKey: 'COMMERCIAL_AND_SUBSCRIPTION_HISTORY',
    displayName: 'Histórico de Planos e Assinaturas',
    sourceTables: ['public.subscriptions', 'public.profile_boosts'],
    includedFields: [
      'plan_code',
      'subscription_status',
      'current_period_start',
      'current_period_end',
      'boost_campaigns (tier, starts_at, ends_at)',
    ],
    excludedFieldsWithRationale: {
      provider_event_id: 'External payment provider transaction hash.',
    },
  },
  {
    datasetKey: 'USER_REVIEWS_AUTHORED',
    displayName: 'Avaliações Enviadas (Cliente)',
    sourceTables: ['public.professional_reviews'],
    includedFields: [
      'rating',
      'comment',
      'created_at',
      'professional_stage_name',
    ],
    excludedFieldsWithRationale: {
      moderation_reason: 'Internal moderation notes.',
      moderated_by: 'Identity of the internal administrator who reviewed.',
    },
  },
  {
    datasetKey: 'DATA_SUBJECT_REQUESTS_HISTORY',
    displayName: 'Histórico de Solicitações LGPD',
    sourceTables: ['public.data_subject_requests', 'public.data_subject_request_events'],
    includedFields: [
      'request_type',
      'status',
      'created_at',
      'completed_at',
      'resolution_code',
      'event_log (event_type, timestamp)',
    ],
    excludedFieldsWithRationale: {
      resolution_notes: 'Internal operator notes are protected from subject disclosure.',
      actor_account_user_id: 'Admin identifiers who worked the ticket.',
    },
  },
] as const

/**
 * STRICT EXCLUSION MATRIX — WHAT MUST NEVER BE EXPORTED
 */
export const DATA_EXPORT_EXCLUSION_RULES = [
  'Hashed passwords, salt, or auth tokens.',
  'Internal operator/moderator notes or admin usernames.',
  'Content reports or abuse complaints filed by other users.',
  'Reporter HMAC hashes or third-party reporter descriptions.',
  'Other users’ personal data or review responses not belonging to subject.',
  'Raw internal cloud storage paths, infrastructure configuration, or server IPs.',
  'Proprietary algorithm ranking seeds, fair-rotation math, or score factors.',
] as const
