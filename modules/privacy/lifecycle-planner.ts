import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveSubject } from './subject-resolver'
import {
  LifecycleAction,
  LifecyclePlan,
  LifecyclePlanItem,
  LifecycleActionSummary,
} from './lifecycle-types'

/**
 * Canonically generates a subject lifecycle dry-run plan.
 *
 * Strictly observational:
 * - ZERO database mutations (no DELETE, UPDATE, INSERT)
 * - ZERO storage bucket deletions
 * - ZERO Supabase Auth user mutations
 * - ZERO external API erasure calls
 *
 * Enforces LGPD-02A principles:
 * - Retention policies are DRAFT/UNDEFINED -> all statutory retention defaults to REVIEW_REQUIRED
 * - Auth-last invariant -> auth.users is classified DELETE with isAuthLast: true
 * - Immutable audit ledgers -> DSR, moderation, status, billing audit logs classified REVIEW_REQUIRED
 * - Mixed/third-party data -> reviews received & reports classified REVIEW_REQUIRED; authored reviews ANONYMIZE
 * - Storage orphan prevention -> correlates DB media with Storage bucket objects
 */
export async function generateSubjectLifecyclePlan(
  subjectAccountId: string
): Promise<LifecyclePlan> {
  const subject = await resolveSubject(subjectAccountId)
  if (!subject) {
    throw new Error(`Subject account ${subjectAccountId} not found or inaccessible.`)
  }

  const admin = createAdminClient()
  const items: LifecyclePlanItem[] = []
  const warnings: string[] = []

  let totalDiscoveredPhotos = 0
  let totalDiscoveredVideos = 0
  const photoPaths: string[] = []
  const videoPaths: string[] = []

  // 1. ACCOUNT IDENTITY & MEMBERSHIPS (public.account_users, public.client_memberships)
  items.push({
    id: `plan-account-${subject.accountId}`,
    system: 'SUPABASE_POSTGRES',
    target: 'public.account_users',
    recordCount: 1,
    identifiers: [subject.accountId],
    action: 'DELETE',
    rationale: 'Core account identity record. Deleted upon approved subject erasure.',
    legalBasisStatus: 'SOURCE_CONFIRMED',
    retentionStatus: 'UNDEFINED',
  })

  if (subject.role === 'CLIENT') {
    const { count: membershipCount } = await admin
      .from('client_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', subject.accountId)

    if (membershipCount && membershipCount > 0) {
      items.push({
        id: `plan-membership-${subject.accountId}`,
        system: 'SUPABASE_POSTGRES',
        target: 'public.client_memberships',
        recordCount: membershipCount,
        identifiers: [subject.accountId],
        action: 'DELETE',
        rationale: 'Client VIP membership tier record. Deleted upon client account erasure.',
        legalBasisStatus: 'SOURCE_CONFIRMED',
        retentionStatus: 'UNDEFINED',
      })
    }
  }

  // 2. CLIENT SIGNUP INTENTS (if any exist for subject email)
  if (subject.email) {
    const { count: intentCount } = await admin
      .from('client_signup_intents')
      .select('*', { count: 'exact', head: true })
      .eq('email', subject.email)

    if (intentCount && intentCount > 0) {
      items.push({
        id: `plan-signup-intent-${subject.accountId}`,
        system: 'SUPABASE_POSTGRES',
        target: 'public.client_signup_intents',
        recordCount: intentCount,
        identifiers: [subject.email],
        action: 'DELETE',
        rationale: 'Pre-registration intent token. Purged on account erasure.',
        legalBasisStatus: 'SOURCE_CONFIRMED',
        retentionStatus: 'UNDEFINED',
      })
    }
  }

  // 3. KYC & VERIFICATION RECORDS (public.identity_verifications & external Didit)
  const { data: verifications } = await admin
    .from('identity_verifications')
    .select('id, status, didit_session_id')
    .eq('account_user_id', subject.accountId)

  if (verifications && verifications.length > 0) {
    const verifIds = verifications.map((v) => v.id)
    items.push({
      id: `plan-kyc-${subject.accountId}`,
      system: 'SUPABASE_POSTGRES',
      target: 'public.identity_verifications',
      recordCount: verifications.length,
      identifiers: verifIds,
      action: 'REVIEW_REQUIRED',
      rationale:
        'Compliance defense: Proof of age verification (18+) is legally critical (ECA Art. 240-241). Retention policy is DRAFT; defaults to REVIEW_REQUIRED until approved by legal counsel.',
      legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
      retentionStatus: 'DRAFT',
      auditSafeguarded: true,
    })

    // Verification webhook events
    const { count: verifEventCount } = await admin
      .from('verification_webhook_events')
      .select('*', { count: 'exact', head: true })
      .in('verification_id', verifIds)

    if (verifEventCount && verifEventCount > 0) {
      items.push({
        id: `plan-kyc-events-${subject.accountId}`,
        system: 'SUPABASE_POSTGRES',
        target: 'public.verification_webhook_events',
        recordCount: verifEventCount,
        identifiers: verifIds,
        action: 'REVIEW_REQUIRED',
        rationale: 'KYC processor webhook event audit trail. Immutable compliance defense record.',
        legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
        retentionStatus: 'DRAFT',
        auditSafeguarded: true,
      })
    }

    // External Didit Erasure Dispatch
    items.push({
      id: `plan-external-didit-${subject.accountId}`,
      system: 'EXTERNAL_PROCESSOR',
      target: 'Didit (KYC Biometrics & Identity Verification)',
      recordCount: verifications.length,
      identifiers: verifications.map((v) => v.didit_session_id).filter(Boolean) as string[],
      action: 'EXTERNAL_ERASURE',
      rationale:
        'External KYC processor session deletion dispatch. External erasure required under LGPD Art. 18, VI. Observation only in LGPD-02A.',
      legalBasisStatus: 'SOURCE_CONFIRMED',
      retentionStatus: 'UNDEFINED',
      externalProcessor: 'Didit',
    })
  }

  // 4. PROFESSIONAL PROFILE & ATTRIBUTES (if subject is an advertiser)
  if (subject.profileId) {
    const profileId = subject.profileId

    items.push({
      id: `plan-profile-${profileId}`,
      system: 'SUPABASE_POSTGRES',
      target: 'public.professional_profiles',
      recordCount: 1,
      identifiers: [profileId],
      action: 'DELETE',
      rationale: 'Public advertising profile (stage name, bio, phones, attributes). Erased on subject deletion.',
      legalBasisStatus: 'SOURCE_CONFIRMED',
      retentionStatus: 'UNDEFINED',
    })

    // Profile locations
    const { count: locationCount } = await admin
      .from('professional_profile_locations')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)

    if (locationCount && locationCount > 0) {
      items.push({
        id: `plan-profile-locations-${profileId}`,
        system: 'SUPABASE_POSTGRES',
        target: 'public.professional_profile_locations',
        recordCount: locationCount,
        identifiers: [profileId],
        action: 'DELETE',
        rationale: 'Service locations associated with profile.',
        legalBasisStatus: 'SOURCE_CONFIRMED',
        retentionStatus: 'UNDEFINED',
      })
    }

    // Profile offerings
    const { count: offeringCount } = await admin
      .from('professional_profile_offerings')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)

    if (offeringCount && offeringCount > 0) {
      items.push({
        id: `plan-profile-offerings-${profileId}`,
        system: 'SUPABASE_POSTGRES',
        target: 'public.professional_profile_offerings',
        recordCount: offeringCount,
        identifiers: [profileId],
        action: 'DELETE',
        rationale: 'Specialized offerings and pricing configuration.',
        legalBasisStatus: 'SOURCE_CONFIRMED',
        retentionStatus: 'UNDEFINED',
      })
    }

    // Availability settings & schedules
    const { count: availSettingsCount } = await admin
      .from('professional_availability_settings')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)

    const { count: weeklyAvailCount } = await admin
      .from('professional_weekly_availability')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)

    const { count: availExceptionsCount } = await admin
      .from('professional_availability_exceptions')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)

    const totalAvailCount = (availSettingsCount ?? 0) + (weeklyAvailCount ?? 0) + (availExceptionsCount ?? 0)
    if (totalAvailCount > 0) {
      items.push({
        id: `plan-availability-${profileId}`,
        system: 'SUPABASE_POSTGRES',
        target: 'public.professional_availability_settings, weekly_availability, exceptions',
        recordCount: totalAvailCount,
        identifiers: [profileId],
        action: 'DELETE',
        rationale: 'Agenda, working hours, and calendar exceptions of the professional.',
        legalBasisStatus: 'SOURCE_CONFIRMED',
        retentionStatus: 'UNDEFINED',
      })
    }

    // 5. STORAGE & MEDIA DISCOVERY (profile-media & profile-videos)
    const { data: mediaRows } = await admin
      .from('profile_media')
      .select('id, storage_path, status')
      .eq('profile_id', profileId)

    if (mediaRows && mediaRows.length > 0) {
      const mediaIds = mediaRows.map((m) => m.id)
      items.push({
        id: `plan-media-db-${profileId}`,
        system: 'SUPABASE_POSTGRES',
        target: 'public.profile_media',
        recordCount: mediaRows.length,
        identifiers: mediaIds,
        action: 'DELETE',
        rationale: 'Photo records and moderation metadata in database.',
        legalBasisStatus: 'SOURCE_CONFIRMED',
        retentionStatus: 'UNDEFINED',
      })

      // Discover storage files in profile-media bucket
      for (const m of mediaRows) {
        if (m.storage_path) {
          photoPaths.push(m.storage_path)
        }
      }
    }

    // Also check storage bucket listing for orphan files under {profileId}/
    try {
      const { data: bucketFiles } = await admin.storage
        .from('profile-media')
        .list(profileId)

      if (bucketFiles && bucketFiles.length > 0) {
        for (const file of bucketFiles) {
          const fullPath = `${profileId}/${file.name}`
          if (!photoPaths.includes(fullPath)) {
            photoPaths.push(fullPath)
            warnings.push(`Potential orphan storage photo detected in profile-media bucket: ${fullPath}`)
          }
        }
      }
    } catch {
      // Storage listing is best-effort in dry-run
    }

    totalDiscoveredPhotos = photoPaths.length
    if (totalDiscoveredPhotos > 0) {
      items.push({
        id: `plan-storage-photos-${profileId}`,
        system: 'SUPABASE_STORAGE',
        target: 'profile-media (bucket)',
        recordCount: totalDiscoveredPhotos,
        identifiers: photoPaths,
        action: 'DELETE',
        rationale:
          'Physical photo binary files in private cloud storage. Orphan risk prevented: all bucket files scheduled for deletion.',
        legalBasisStatus: 'SOURCE_CONFIRMED',
        retentionStatus: 'UNDEFINED',
        orphanRiskPrevented: true,
      })
    }

    // Media Moderation Reviews (safeguarded)
    if (mediaRows && mediaRows.length > 0) {
      const mediaIds = mediaRows.map((m) => m.id)
      const { count: mediaModCount } = await admin
        .from('media_moderation_reviews')
        .select('*', { count: 'exact', head: true })
        .in('media_id', mediaIds)

      if (mediaModCount && mediaModCount > 0) {
        items.push({
          id: `plan-media-moderation-${profileId}`,
          system: 'SUPABASE_POSTGRES',
          target: 'public.media_moderation_reviews',
          recordCount: mediaModCount,
          identifiers: mediaIds,
          action: 'REVIEW_REQUIRED',
          rationale: 'Audit safeguard: Media moderation decisions under Marco Civil da Internet (Art. 19).',
          legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
          retentionStatus: 'DRAFT',
          auditSafeguarded: true,
        })
      }
    }

    // Videos
    const { data: videoRows } = await admin
      .from('profile_videos')
      .select('id, storage_path, poster_storage_path')
      .eq('profile_id', profileId)

    if (videoRows && videoRows.length > 0) {
      const videoIds = videoRows.map((v) => v.id)
      items.push({
        id: `plan-videos-db-${profileId}`,
        system: 'SUPABASE_POSTGRES',
        target: 'public.profile_videos',
        recordCount: videoRows.length,
        identifiers: videoIds,
        action: 'DELETE',
        rationale: 'Video records and metadata in database.',
        legalBasisStatus: 'SOURCE_CONFIRMED',
        retentionStatus: 'UNDEFINED',
      })

      for (const v of videoRows) {
        if (v.storage_path) videoPaths.push(v.storage_path)
        if (v.poster_storage_path) videoPaths.push(v.poster_storage_path)
      }

      totalDiscoveredVideos = videoPaths.length
      items.push({
        id: `plan-storage-videos-${profileId}`,
        system: 'SUPABASE_STORAGE',
        target: 'profile-videos (bucket)',
        recordCount: totalDiscoveredVideos,
        identifiers: videoPaths,
        action: 'DELETE',
        rationale: 'Physical video and poster binaries in private storage bucket.',
        legalBasisStatus: 'SOURCE_CONFIRMED',
        retentionStatus: 'UNDEFINED',
        orphanRiskPrevented: true,
      })

      // Video moderation events (safeguarded)
      const { count: videoModCount } = await admin
        .from('profile_video_moderation_events')
        .select('*', { count: 'exact', head: true })
        .in('video_id', videoIds)

      if (videoModCount && videoModCount > 0) {
        items.push({
          id: `plan-video-moderation-${profileId}`,
          system: 'SUPABASE_POSTGRES',
          target: 'public.profile_video_moderation_events',
          recordCount: videoModCount,
          identifiers: videoIds,
          action: 'REVIEW_REQUIRED',
          rationale: 'Audit safeguard: Video moderation decisions and triage audit history.',
          legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
          retentionStatus: 'DRAFT',
          auditSafeguarded: true,
        })
      }
    }

    // Profile Moderation Reviews & Status Events (safeguarded)
    const { count: profileModCount } = await admin
      .from('profile_moderation_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)

    if (profileModCount && profileModCount > 0) {
      items.push({
        id: `plan-profile-moderation-${profileId}`,
        system: 'SUPABASE_POSTGRES',
        target: 'public.profile_moderation_reviews',
        recordCount: profileModCount,
        identifiers: [profileId],
        action: 'REVIEW_REQUIRED',
        rationale: 'Audit safeguard: Profile moderation reviews and administrative actions.',
        legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
        retentionStatus: 'DRAFT',
        auditSafeguarded: true,
      })
    }

    const { count: statusEventCount } = await admin
      .from('professional_profile_status_events')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)

    if (statusEventCount && statusEventCount > 0) {
      items.push({
        id: `plan-status-events-${profileId}`,
        system: 'SUPABASE_POSTGRES',
        target: 'public.professional_profile_status_events',
        recordCount: statusEventCount,
        identifiers: [profileId],
        action: 'REVIEW_REQUIRED',
        rationale: 'Audit safeguard: Immutable profile lifecycle status transition history.',
        legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
        retentionStatus: 'DRAFT',
        auditSafeguarded: true,
      })
    }

    // Profile Boosts (promotions)
    const { count: boostCount } = await admin
      .from('profile_boosts')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)

    if (boostCount && boostCount > 0) {
      items.push({
        id: `plan-boosts-${profileId}`,
        system: 'SUPABASE_POSTGRES',
        target: 'public.profile_boosts',
        recordCount: boostCount,
        identifiers: [profileId],
        action: 'REVIEW_REQUIRED',
        rationale: 'Commercial boost promotion history. Financial retention policy is DRAFT; defaults to REVIEW_REQUIRED.',
        legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
        retentionStatus: 'DRAFT',
      })
    }

    // AI Concierge
    const { count: conciergeSettingsCount } = await admin
      .from('professional_concierge_settings')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)

    const { count: conciergeFaqCount } = await admin
      .from('professional_concierge_faqs')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)

    const { data: conciergeConvs } = await admin
      .from('concierge_conversations')
      .select('id')
      .eq('profile_id', profileId)

    const totalConciergeConfig = (conciergeSettingsCount ?? 0) + (conciergeFaqCount ?? 0)
    if (totalConciergeConfig > 0) {
      items.push({
        id: `plan-concierge-config-${profileId}`,
        system: 'SUPABASE_POSTGRES',
        target: 'public.professional_concierge_settings, concierge_faqs',
        recordCount: totalConciergeConfig,
        identifiers: [profileId],
        action: 'DELETE',
        rationale: 'AI Concierge configuration and custom FAQs.',
        legalBasisStatus: 'SOURCE_CONFIRMED',
        retentionStatus: 'UNDEFINED',
      })
    }

    if (conciergeConvs && conciergeConvs.length > 0) {
      const convIds = conciergeConvs.map((c) => c.id)
      const { count: messageCount } = await admin
        .from('concierge_messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', convIds)

      items.push({
        id: `plan-concierge-messages-${profileId}`,
        system: 'SUPABASE_POSTGRES',
        target: 'public.concierge_conversations, concierge_messages',
        recordCount: conciergeConvs.length + (messageCount ?? 0),
        identifiers: convIds,
        action: 'DELETE',
        rationale: 'AI Concierge inquiry chat histories.',
        legalBasisStatus: 'SOURCE_CONFIRMED',
        retentionStatus: 'UNDEFINED',
      })

      items.push({
        id: `plan-external-openai-${profileId}`,
        system: 'EXTERNAL_PROCESSOR',
        target: 'OpenAI (AI Concierge Inference)',
        recordCount: convIds.length,
        identifiers: convIds,
        action: 'EXTERNAL_ERASURE',
        rationale: 'External AI processor context purge request. Observation only in LGPD-02A.',
        legalBasisStatus: 'SOURCE_CONFIRMED',
        retentionStatus: 'UNDEFINED',
        externalProcessor: 'OpenAI',
      })
    }

    // Profile Daily Metrics
    const { count: metricsCount } = await admin
      .from('profile_daily_metrics')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)

    if (metricsCount && metricsCount > 0) {
      items.push({
        id: `plan-profile-metrics-${profileId}`,
        system: 'SUPABASE_POSTGRES',
        target: 'public.profile_daily_metrics',
        recordCount: metricsCount,
        identifiers: [profileId],
        action: 'ANONYMIZE',
        rationale: 'Non-personal aggregated daily traffic counts; preserved anonymously for macro reporting.',
        legalBasisStatus: 'SOURCE_CONFIRMED',
        retentionStatus: 'UNDEFINED',
      })
    }
  }

  // 6. COMMERCIAL, BILLING & SUBSCRIPTIONS (statutory tax retention under review)
  const { data: subscriptions } = await admin
    .from('subscriptions')
    .select('id, plan_code, status')
    .eq('account_id', subject.accountId)

  if (subscriptions && subscriptions.length > 0) {
    items.push({
      id: `plan-subscriptions-${subject.accountId}`,
      system: 'SUPABASE_POSTGRES',
      target: 'public.subscriptions',
      recordCount: subscriptions.length,
      identifiers: subscriptions.map((s) => s.id),
      action: 'REVIEW_REQUIRED',
      rationale:
        'Financial & tax compliance: CTN Art. 174 & Civil Code Art. 206 statutory limitation periods. Retention policy is DRAFT; defaults to REVIEW_REQUIRED.',
      legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
      retentionStatus: 'DRAFT',
    })
  }

  // Billing Overrides & Entitlement Overrides
  const { count: billingOverridesCount } = await admin
    .from('billing_overrides')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', subject.accountId)

  const { count: entOverridesCount } = await admin
    .from('entitlement_overrides')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', subject.accountId)

  const totalOverrides = (billingOverridesCount ?? 0) + (entOverridesCount ?? 0)
  if (totalOverrides > 0) {
    items.push({
      id: `plan-billing-overrides-${subject.accountId}`,
      system: 'SUPABASE_POSTGRES',
      target: 'public.billing_overrides, entitlement_overrides',
      recordCount: totalOverrides,
      identifiers: [subject.accountId],
      action: 'REVIEW_REQUIRED',
      rationale: 'Commercial overrides and custom entitlement records.',
      legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
      retentionStatus: 'DRAFT',
    })
  }

  // Billing Admin Audit Logs (safeguarded)
  const { count: billingAuditCount } = await admin
    .from('billing_admin_audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('target_account_id', subject.accountId)

  if (billingAuditCount && billingAuditCount > 0) {
    items.push({
      id: `plan-billing-audit-${subject.accountId}`,
      system: 'SUPABASE_POSTGRES',
      target: 'public.billing_admin_audit_logs',
      recordCount: billingAuditCount,
      identifiers: [subject.accountId],
      action: 'REVIEW_REQUIRED',
      rationale: 'Audit safeguard: Administrative billing override history. Immutable ledger.',
      legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
      retentionStatus: 'DRAFT',
      auditSafeguarded: true,
    })
  }

  // 7. CONTENT REPORTS (abuse / moderation safeguard)
  const { count: reportsAsTargetCount } = subject.profileId
    ? await admin
        .from('content_reports')
        .select('*', { count: 'exact', head: true })
        .eq('target_profile_id', subject.profileId)
    : { count: 0 }

  const { count: reportsAsReporterCount } = await admin
    .from('content_reports')
    .select('*', { count: 'exact', head: true })
    .eq('reporter_account_id', subject.accountId)

  const totalReports = (reportsAsTargetCount ?? 0) + (reportsAsReporterCount ?? 0)
  if (totalReports > 0) {
    items.push({
      id: `plan-content-reports-${subject.accountId}`,
      system: 'SUPABASE_POSTGRES',
      target: 'public.content_reports',
      recordCount: totalReports,
      identifiers: [subject.accountId],
      action: 'REVIEW_REQUIRED',
      rationale:
        'Third-party abuse complaints safeguard: contains mixed third-party content and legal defense evidence.',
      legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
      retentionStatus: 'DRAFT',
      auditSafeguarded: true,
    })
  }

  // 8. REVIEWS & FEEDBACK (mixed data handling)
  // A. Reviews authored by subject (e.g. client reviews) -> ANONYMIZE
  const { data: authoredReviews } = await admin
    .from('professional_reviews')
    .select('id')
    .eq('reviewer_account_user_id', subject.accountId)

  if (authoredReviews && authoredReviews.length > 0) {
    items.push({
      id: `plan-reviews-authored-${subject.accountId}`,
      system: 'SUPABASE_POSTGRES',
      target: 'public.professional_reviews',
      recordCount: authoredReviews.length,
      identifiers: authoredReviews.map((r) => r.id),
      action: 'ANONYMIZE',
      rationale:
        'Preserves historical professional rating aggregates while permanently stripping personal review comment and detaching reviewer account link.',
      legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
      retentionStatus: 'DRAFT',
    })
  }

  // B. Reviews received by subject (if subject is professional) -> REVIEW_REQUIRED
  if (subject.profileId) {
    const { count: receivedReviewsCount } = await admin
      .from('professional_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', subject.profileId)

    if (receivedReviewsCount && receivedReviewsCount > 0) {
      items.push({
        id: `plan-reviews-received-${subject.profileId}`,
        system: 'SUPABASE_POSTGRES',
        target: 'public.professional_reviews',
        recordCount: receivedReviewsCount,
        identifiers: [subject.profileId],
        action: 'REVIEW_REQUIRED',
        rationale:
          'Mixed data protection: Reviews written by third-party clients about this professional. Administrative review required to determine retention vs redaction.',
        legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
        retentionStatus: 'DRAFT',
      })
    }
  }

  // 9. DATA SUBJECT REQUEST LEDGER (compliance defense safeguard)
  const { data: dsrRows } = await admin
    .from('data_subject_requests')
    .select('id')
    .eq('requester_account_user_id', subject.accountId)

  if (dsrRows && dsrRows.length > 0) {
    const dsrIds = dsrRows.map((d) => d.id)
    items.push({
      id: `plan-dsr-ledger-${subject.accountId}`,
      system: 'SUPABASE_POSTGRES',
      target: 'public.data_subject_requests',
      recordCount: dsrRows.length,
      identifiers: dsrIds,
      action: 'REVIEW_REQUIRED',
      rationale:
        'Proof of compliance defense under LGPD Art. 18/19. Demonstrates timely processing of subject rights. Retention policy is DRAFT; defaults to REVIEW_REQUIRED.',
      legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
      retentionStatus: 'DRAFT',
      auditSafeguarded: true,
    })

    const { count: dsrEventsCount } = await admin
      .from('data_subject_request_events')
      .select('*', { count: 'exact', head: true })
      .in('request_id', dsrIds)

    if (dsrEventsCount && dsrEventsCount > 0) {
      items.push({
        id: `plan-dsr-events-${subject.accountId}`,
        system: 'SUPABASE_POSTGRES',
        target: 'public.data_subject_request_events',
        recordCount: dsrEventsCount,
        identifiers: dsrIds,
        action: 'REVIEW_REQUIRED',
        rationale: 'Immutable DSR audit log. Compliance defense record.',
        legalBasisStatus: 'LEGAL_APPROVAL_REQUIRED',
        retentionStatus: 'DRAFT',
        auditSafeguarded: true,
      })
    }
  }

  // 10. AUTH CREDENTIALS (auth.users) — MUST BE LAST (Auth-last invariant)
  items.push({
    id: `plan-auth-user-${subject.accountId}`,
    system: 'SUPABASE_AUTH',
    target: 'auth.users',
    recordCount: 1,
    identifiers: [subject.accountId],
    action: 'DELETE',
    rationale:
      'Auth credentials, email, password hash, and active session tokens. Strictly planned as the final step after all dependencies are resolved (Auth-last invariant). NEVER executed in LGPD-02A dry-run.',
    legalBasisStatus: 'SOURCE_CONFIRMED',
    retentionStatus: 'UNDEFINED',
    isAuthLast: true,
    dependencies: ['public.account_users', 'public.professional_profiles', 'public.client_memberships'],
  })

  // Calculate summary counts across all 6 action types
  const summary: LifecycleActionSummary = {
    DELETE: 0,
    ANONYMIZE: 0,
    DETACH: 0,
    RETAIN: 0,
    EXTERNAL_ERASURE: 0,
    REVIEW_REQUIRED: 0,
    totalItems: items.length,
    totalRecords: items.reduce((acc, item) => acc + item.recordCount, 0),
  }

  for (const item of items) {
    summary[item.action] += 1
  }

  return {
    subjectAccountId: subject.accountId,
    subjectRole: subject.role,
    subjectEmail: subject.email,
    profileId: subject.profileId,
    stageName: subject.stageName,
    generatedAt: new Date().toISOString(),
    mode: 'DRY_RUN',
    executionAllowed: false,
    summary,
    items,
    storageDiscovered: {
      photoCount: totalDiscoveredPhotos,
      videoCount: totalDiscoveredVideos,
      photoPaths,
      videoPaths,
    },
    warnings,
    auditStatement:
      'DRY-RUN ONLY: Zero database mutations, zero storage deletions, and zero auth deletions occurred during the generation of this lifecycle plan.',
  }
}
