#!/usr/bin/env node
/**
 * LGPD-02A.1 — Synthetic Subject Seeder
 *
 * Creates or resets a 100% synthetic test subject for LGPD lifecycle dry-run,
 * safe export, and zero-mutation validation.
 *
 * Subject:
 * - Email: synthetic-lgpd-advertiser-01@ad-marketplace-synthetic.invalid
 * - Stage Name: [SYNTHETIC-LGPD] Bella Test Model
 * - Role: ADVERTISER
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...rest] = trimmed.split('=')
      const val = rest.join('=').trim()
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = val
      }
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('FATAL: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const SYNTHETIC_EMAIL = 'synthetic-lgpd-advertiser-01@ad-marketplace-synthetic.invalid'
const SYNTHETIC_STAGE_NAME = '[SYNTHETIC-LGPD] Bella Test Model'
const SYNTHETIC_SLUG = 'synthetic-lgpd-bella-test'

export async function seedSyntheticLgpdSubject() {
  console.log('=== LGPD-02A.1: Seeding 100% Synthetic Subject ===')

  // 1. Check or Create Auth User
  let authUserId = null
  const { data: userList } = await supabase.auth.admin.listUsers()
  const existingUser = userList?.users?.find((u) => u.email === SYNTHETIC_EMAIL)

  if (existingUser) {
    authUserId = existingUser.id
    console.log(`Found existing synthetic Auth user: ${authUserId} (${SYNTHETIC_EMAIL})`)
  } else {
    const { data: newUser, error: createAuthError } = await supabase.auth.admin.createUser({
      email: SYNTHETIC_EMAIL,
      email_confirm: true,
      password: 'SyntheticPass123!Secure',
      user_metadata: {
        role: 'ADVERTISER',
        synthetic: true,
        fixture: 'LGPD-02A.1',
      },
    })
    if (createAuthError || !newUser.user) {
      throw new Error(`Failed to create synthetic Auth user: ${createAuthError?.message}`)
    }
    authUserId = newUser.user.id
    console.log(`Created new synthetic Auth user: ${authUserId}`)
  }

  // 2. Account Users
  const { data: existingAccount } = await supabase
    .from('account_users')
    .select('id, role, status')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  let accountId = existingAccount?.id
  if (!accountId) {
    accountId = crypto.randomUUID()
    const { error: accInsertErr } = await supabase.from('account_users').insert({
      id: accountId,
      auth_user_id: authUserId,
      role: 'ADVERTISER',
      status: 'ACTIVE',
      terms_version: 'v1.0',
      terms_accepted_at: '2026-09-01T10:00:00Z',
      privacy_version: 'v1.0',
      privacy_accepted_at: '2026-09-01T10:00:00Z',
    })
    if (accInsertErr) throw new Error(`Account insert error: ${accInsertErr.message}`)
    console.log(`Created account_users record: ${accountId}`)
  } else {
    await supabase
      .from('account_users')
      .update({
        role: 'ADVERTISER',
        status: 'ACTIVE',
        terms_version: 'v1.0',
        terms_accepted_at: '2026-09-01T10:00:00Z',
        privacy_version: 'v1.0',
        privacy_accepted_at: '2026-09-01T10:00:00Z',
      })
      .eq('id', accountId)
    console.log(`Updated account_users record: ${accountId}`)
  }

  // 3. Professional Profile
  const { data: existingProfile } = await supabase
    .from('professional_profiles')
    .select('id')
    .eq('account_user_id', accountId)
    .maybeSingle()

  let profileId = existingProfile?.id
  if (!profileId) {
    profileId = crypto.randomUUID()
    const { error: profileInsertErr } = await supabase.from('professional_profiles').insert({
      id: profileId,
      account_user_id: accountId,
      stage_name: SYNTHETIC_STAGE_NAME,
      slug: SYNTHETIC_SLUG,
      headline: 'Modelo de Teste Sintético para Validação LGPD',
      bio: 'Perfil exclusivamente sintético criado para verificação e validação do ciclo de vida LGPD-02A.1.',
      status: 'ACTIVE',
      content_moderation_status: 'APPROVED',
      public_age: 25,
      show_age: true,
      height_cm: 170,
      show_height: true,
      weight_kg: 58,
      show_weight: true,
      eye_color: 'BROWN',
      hair_color: 'BRUNETTE',
      hair_length: 'LONG',
      body_type: 'SLIM',
      has_tattoos: false,
      has_piercings: false,
      direct_phone: '11988887777',
      whatsapp_phone: '11988887777',
      telegram_username: 'synthetic_bella',
      show_phone: true,
      show_whatsapp: true,
      show_telegram: true,
      languages: ['PORTUGUESE', 'ENGLISH'],
    })
    if (profileInsertErr) throw new Error(`Profile insert error: ${profileInsertErr.message}`)
    console.log(`Created professional_profiles record: ${profileId}`)
  } else {
    await supabase
      .from('professional_profiles')
      .update({
        stage_name: SYNTHETIC_STAGE_NAME,
        slug: SYNTHETIC_SLUG,
        status: 'ACTIVE',
        content_moderation_status: 'APPROVED',
      })
      .eq('id', profileId)
    console.log(`Updated professional_profiles record: ${profileId}`)
  }

  // 4. Locations & Offerings
  const { data: loc } = await supabase
    .from('marketplace_locations')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (loc) {
    const { data: exLoc } = await supabase
      .from('professional_profile_locations')
      .select('profile_id')
      .eq('profile_id', profileId)
      .maybeSingle()

    if (!exLoc) {
      await supabase.from('professional_profile_locations').insert({
        profile_id: profileId,
        location_id: loc.id,
        is_primary: true,
      })
      console.log('Attached location fixture')
    }
  }

  const { data: offOpt } = await supabase
    .from('professional_offering_options')
    .select('code')
    .limit(1)
    .maybeSingle()

  if (offOpt) {
    const { data: exOff } = await supabase
      .from('professional_profile_offerings')
      .select('profile_id')
      .eq('profile_id', profileId)
      .maybeSingle()

    if (!exOff) {
      await supabase.from('professional_profile_offerings').insert({
        profile_id: profileId,
        option_code: offOpt.code,
        status: 'ACTIVE',
      })
      console.log('Attached offering fixture')
    }
  }

  // 5. Identity Verification (KYC)
  const syntheticDiditSession = `synthetic-didit-${accountId.substring(0, 8)}`
  const { data: exKyc } = await supabase
    .from('identity_verifications')
    .select('id')
    .eq('account_user_id', accountId)
    .maybeSingle()

  let kycId = exKyc?.id
  if (!kycId) {
    kycId = crypto.randomUUID()
    await supabase.from('identity_verifications').insert({
      id: kycId,
      account_user_id: accountId,
      provider: 'didit',
      provider_session_id: syntheticDiditSession,
      status: 'VERIFIED',
      identity_verified: true,
      age_verified: true,
      started_at: new Date().toISOString(),
      verified_at: new Date().toISOString(),
    })
    console.log(`Created identity_verifications record: ${kycId}`)
  }

  // KYC Webhook Event
  const { data: exWebhook } = await supabase
    .from('verification_webhook_events')
    .select('id')
    .eq('provider_session_id', syntheticDiditSession)
    .maybeSingle()

  if (!exWebhook) {
    await supabase.from('verification_webhook_events').insert({
      id: crypto.randomUUID(),
      provider: 'didit',
      provider_session_id: syntheticDiditSession,
      provider_event_id: `evt-${crypto.randomUUID()}`,
      event_type: 'VERIFICATION_COMPLETED',
      processing_status: 'PROCESSED',
      received_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
    })
    console.log('Created verification_webhook_events record')
  }

  // 6. Storage Fixture Uploads
  const videoFileUuid = crypto.randomUUID()
  const photoStoragePath = `${profileId}/synthetic-photo-01.jpg`
  const videoStoragePath = `profiles/${profileId}/${videoFileUuid}.mp4`
  const posterStoragePath = `profiles/${profileId}/${videoFileUuid}-poster.jpg`

  const dummyImageBytes = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0xff, 0xd9,
  ])
  const dummyVideoBytes = Buffer.from('SYNTHETIC_MP4_VIDEO_FIXTURE_BINARY_DATA_LGPD_TEST')

  await supabase.storage.from('profile-media').upload(photoStoragePath, dummyImageBytes, {
    contentType: 'image/jpeg',
    upsert: true,
  })
  await supabase.storage.from('profile-videos').upload(videoStoragePath, dummyVideoBytes, {
    contentType: 'video/mp4',
    upsert: true,
  })
  await supabase.storage.from('profile-videos').upload(posterStoragePath, dummyImageBytes, {
    contentType: 'image/jpeg',
    upsert: true,
  })
  console.log('Uploaded storage binary fixtures to profile-media and profile-videos')

  // 7. DB Profile Media & Reviews
  const { data: exMedia } = await supabase
    .from('profile_media')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle()

  let mediaId = exMedia?.id
  if (!mediaId) {
    mediaId = crypto.randomUUID()
    await supabase.from('profile_media').insert({
      id: mediaId,
      profile_id: profileId,
      storage_path: photoStoragePath,
      status: 'APPROVED',
      position: 1,
      is_primary: true,
      mime_type: 'image/jpeg',
      file_size_bytes: dummyImageBytes.length,
    })
    console.log(`Created profile_media record: ${mediaId}`)
  }

  const { data: exMediaReview } = await supabase
    .from('media_moderation_reviews')
    .select('id')
    .eq('media_id', mediaId)
    .maybeSingle()

  if (!exMediaReview) {
    await supabase.from('media_moderation_reviews').insert({
      id: crypto.randomUUID(),
      media_id: mediaId,
      reviewer_id: accountId,
      review_source: 'AUTOMATED',
      decision: 'APPROVED',
      reason_code: 'SAFE',
      notes: 'Synthetic fixture pre-approved photo',
    })
    console.log('Created media_moderation_reviews record')
  }

  // 8. DB Profile Videos & Reviews
  const { data: exVideo } = await supabase
    .from('profile_videos')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle()

  let videoId = exVideo?.id
  if (!videoId) {
    videoId = crypto.randomUUID()
    await supabase.from('profile_videos').insert({
      id: videoId,
      profile_id: profileId,
      storage_path: videoStoragePath,
      poster_storage_path: posterStoragePath,
      duration_seconds: 15,
      file_size_bytes: dummyVideoBytes.length,
      mime_type: 'video/mp4',
      position: 1,
      status: 'APPROVED',
    })
    console.log(`Created profile_videos record: ${videoId}`)
  }

  const { data: exVideoReview } = await supabase
    .from('profile_video_moderation_events')
    .select('id')
    .eq('video_id', videoId)
    .maybeSingle()

  if (!exVideoReview) {
    await supabase.from('profile_video_moderation_events').insert({
      id: crypto.randomUUID(),
      video_id: videoId,
      moderator_account_user_id: accountId,
      decision: 'APPROVED',
      reason: 'Synthetic fixture pre-approved video',
    })
    console.log('Created profile_video_moderation_events record')
  }

  // 9. Profile Moderation Review & Status Events
  const { data: exProfReview } = await supabase
    .from('profile_moderation_reviews')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (!exProfReview) {
    await supabase.from('profile_moderation_reviews').insert({
      id: crypto.randomUUID(),
      profile_id: profileId,
      reviewer_id: accountId,
      decision: 'APPROVED',
      reason_code: 'SAFE',
      notes: 'Synthetic profile initial approval',
      content_snapshot: { synthetic: true },
    })
    console.log('Created profile_moderation_reviews record')
  }

  const { data: exStatusEvent } = await supabase
    .from('professional_profile_status_events')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (!exStatusEvent) {
    await supabase.from('professional_profile_status_events').insert({
      id: crypto.randomUUID(),
      profile_id: profileId,
      actor_account_user_id: accountId,
      action: 'ACTIVATE',
      from_status: 'PENDING_VERIFICATION',
      to_status: 'ACTIVE',
      reason_code: 'AUTOMATED_TEST',
      notes: 'Initial fixture status activation',
      safe_state_snapshot: { status: 'ACTIVE' },
    })
    console.log('Created professional_profile_status_events record')
  }

  // 10. Availability Settings, Weekly & Exceptions
  const { data: exAvailSettings } = await supabase
    .from('professional_availability_settings')
    .select('profile_id')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (!exAvailSettings) {
    await supabase.from('professional_availability_settings').insert({
      profile_id: profileId,
      enabled: true,
      timezone: 'America/Sao_Paulo',
      slot_duration_minutes: 60,
      slot_interval_minutes: 60,
      minimum_notice_minutes: 120,
      maximum_advance_days: 14,
    })
    console.log('Created professional_availability_settings record')
  }

  const { data: exWeekly } = await supabase
    .from('professional_weekly_availability')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (!exWeekly) {
    await supabase.from('professional_weekly_availability').insert({
      id: crypto.randomUUID(),
      profile_id: profileId,
      day_of_week: 1,
      start_time: '10:00',
      end_time: '18:00',
    })
    console.log('Created professional_weekly_availability record')
  }

  const { data: exException } = await supabase
    .from('professional_availability_exceptions')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (!exException) {
    await supabase.from('professional_availability_exceptions').insert({
      id: crypto.randomUUID(),
      profile_id: profileId,
      exception_date: '2026-12-25',
      exception_type: 'HOLIDAY',
      start_time: '00:00',
      end_time: '23:59',
    })
    console.log('Created professional_availability_exceptions record')
  }

  // 11. AI Concierge Settings, FAQs, Conversations & Messages
  const { data: exConcierge } = await supabase
    .from('professional_concierge_settings')
    .select('profile_id')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (!exConcierge) {
    await supabase.from('professional_concierge_settings').insert({
      profile_id: profileId,
      enabled: true,
      assistant_display_name: 'Bella Assistant',
      welcome_message: 'Olá, sou a assistente da Bella!',
      tone: 'CASUAL',
      qualification_enabled: true,
      handoff_enabled: true,
    })
    console.log('Created professional_concierge_settings record')
  }

  const { data: exFaq } = await supabase
    .from('professional_concierge_faqs')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (!exFaq) {
    await supabase.from('professional_concierge_faqs').insert({
      id: crypto.randomUUID(),
      profile_id: profileId,
      question: 'Quais os horários de atendimento?',
      answer: 'Segunda a sexta das 10h às 18h.',
      enabled: true,
      sort_order: 1,
    })
    console.log('Created professional_concierge_faqs record')
  }

  const { data: exConv } = await supabase
    .from('concierge_conversations')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle()

  let convId = exConv?.id
  if (!convId) {
    convId = crypto.randomUUID()
    const nowStr = new Date().toISOString()
    await supabase.from('concierge_conversations').insert({
      id: convId,
      profile_id: profileId,
      channel: 'WEB_PUBLIC',
      status: 'ACTIVE',
      visitor_session_id: 'synthetic-visitor-session-001',
      is_test: true,
      qualification: { synthetic: true },
      started_at: nowStr,
      last_message_at: nowStr,
    })
    console.log(`Created concierge_conversations record: ${convId}`)

    await supabase.from('concierge_messages').insert({
      id: crypto.randomUUID(),
      conversation_id: convId,
      role: 'VISITOR',
      message_type: 'TEXT',
      content: 'Olá, gostaria de saber mais sobre a agenda.',
      metadata: { synthetic: true },
    })
    console.log('Created concierge_messages record')
  }

  // 12. Profile Daily Metrics
  const { data: exMetrics } = await supabase
    .from('profile_daily_metrics')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (!exMetrics) {
    await supabase.from('profile_daily_metrics').insert({
      id: crypto.randomUUID(),
      profile_id: profileId,
      metric_date: '2026-09-10',
      impressions_total: 10,
      impressions_organic: 8,
      impressions_sponsored: 2,
      views_total: 5,
      views_organic: 4,
      views_sponsored: 1,
      whatsapp_clicks: 1,
      phone_clicks: 0,
      telegram_clicks: 0,
      location_breakdown: {},
      hourly_breakdown: {},
    })
    console.log('Created profile_daily_metrics record')
  }

  // 13. Subscriptions & Billing
  const { data: plan } = await supabase.from('subscription_plans').select('id').limit(1).maybeSingle()
  const { data: price } = plan
    ? await supabase.from('plan_prices').select('id').eq('plan_id', plan.id).limit(1).maybeSingle()
    : { data: null }

  if (plan && price) {
    const { data: exSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('account_user_id', accountId)
      .maybeSingle()

    if (!exSub) {
      await supabase.from('subscriptions').insert({
        id: crypto.randomUUID(),
        account_user_id: accountId,
        plan_id: plan.id,
        price_id: price.id,
        status: 'ACTIVE',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      console.log('Created subscriptions record')
    }
  }

  const { data: exBillOverride } = await supabase
    .from('billing_overrides')
    .select('id')
    .eq('account_user_id', accountId)
    .maybeSingle()

  if (!exBillOverride) {
    await supabase.from('billing_overrides').insert({
      id: crypto.randomUUID(),
      account_user_id: accountId,
      reason: 'SYNTHETIC_LGPD_TEST_OVERRIDE',
      granted_by: accountId,
    })
    console.log('Created billing_overrides record')
  }

  const { data: exEntOverride } = await supabase
    .from('entitlement_overrides')
    .select('id')
    .eq('account_user_id', accountId)
    .maybeSingle()

  if (!exEntOverride) {
    await supabase.from('entitlement_overrides').insert({
      id: crypto.randomUUID(),
      account_user_id: accountId,
      entitlement_code: 'CAN_ACCESS_VIP_PROFILES',
      value_bool: true,
      reason: 'SYNTHETIC_LGPD_TEST_ENTITLEMENT',
      granted_by: accountId,
    })
    console.log('Created entitlement_overrides record')
  }

  const { data: exBillAudit } = await supabase
    .from('billing_admin_audit_logs')
    .select('id')
    .eq('target_account_user_id', accountId)
    .maybeSingle()

  if (!exBillAudit) {
    await supabase.from('billing_admin_audit_logs').insert({
      id: crypto.randomUUID(),
      actor_account_user_id: accountId,
      target_account_user_id: accountId,
      action: 'ENTITLEMENT_OVERRIDE_GRANTED',
      subject_id: accountId,
      metadata: { fixture: 'LGPD-02A.1' },
    })
    console.log('Created billing_admin_audit_logs record')
  }

  // 14. Content Reports
  const { data: exReport } = await supabase
    .from('content_reports')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (!exReport) {
    await supabase.from('content_reports').insert({
      id: crypto.randomUUID(),
      profile_id: profileId,
      reason_category: 'SPAM',
      description: 'Synthetic fixture content report for validation',
      reporter_hash: 'synthetic_reporter_hash_lgpd_02a',
      status: 'RESOLVED',
      resolution_action: 'NO_ACTION',
      resolution_notes: 'Synthetic fixture verification',
    })
    console.log('Created content_reports record')
  }

  // 15. Reviews: Authored & Received (Mixed Data Test)
  // Target another profile for authored review
  const { data: otherProfile } = await supabase
    .from('professional_profiles')
    .select('id, account_user_id')
    .neq('id', profileId)
    .limit(1)
    .maybeSingle()

  if (otherProfile) {
    // Authored review: subject reviews other profile -> tests ANONYMIZE
    const { data: exAuthored } = await supabase
      .from('professional_reviews')
      .select('id')
      .eq('reviewer_account_user_id', accountId)
      .maybeSingle()

    if (!exAuthored) {
      await supabase.from('professional_reviews').insert({
        id: crypto.randomUUID(),
        professional_profile_id: otherProfile.id,
        reviewer_account_user_id: accountId,
        rating: 5,
        comment: 'Excelente atendimento. Avaliação sintética de teste.',
        moderation_status: 'APPROVED',
      })
      console.log('Created authored review (tests ANONYMIZE)')
    }

    // Received review: other account reviews subject profile -> tests REVIEW_REQUIRED
    const { data: exReceived } = await supabase
      .from('professional_reviews')
      .select('id')
      .eq('professional_profile_id', profileId)
      .maybeSingle()

    if (!exReceived) {
      await supabase.from('professional_reviews').insert({
        id: crypto.randomUUID(),
        professional_profile_id: profileId,
        reviewer_account_user_id: otherProfile.account_user_id,
        rating: 5,
        comment: 'Ótima profissional. Avaliação de terceiro sintética.',
        moderation_status: 'APPROVED',
      })
      console.log('Created received review (tests REVIEW_REQUIRED)')
    }
  }

  // 16. Data Subject Requests & Events
  const { data: exDsr } = await supabase
    .from('data_subject_requests')
    .select('id')
    .eq('requester_account_user_id', accountId)
    .maybeSingle()

  let dsrId = exDsr?.id
  if (!dsrId) {
    dsrId = crypto.randomUUID()
    await supabase.from('data_subject_requests').insert({
      id: dsrId,
      requester_account_user_id: accountId,
      request_type: 'EXPORT',
      status: 'PENDING',
      details: { reason: 'LGPD-02A.1 synthetic test request' },
    })
    console.log(`Created data_subject_requests record: ${dsrId}`)

    await supabase.from('data_subject_request_events').insert({
      id: crypto.randomUUID(),
      request_id: dsrId,
      event_type: 'CREATED',
      actor_account_user_id: accountId,
      actor_role: 'SUBJECT',
      metadata: { synthetic: true },
    })
    console.log('Created data_subject_request_events record')
  }

  const result = {
    authUserId,
    accountId,
    profileId,
    email: SYNTHETIC_EMAIL,
    stageName: SYNTHETIC_STAGE_NAME,
    slug: SYNTHETIC_SLUG,
    photoStoragePath,
    videoStoragePath,
    posterStoragePath,
  }

  console.log('\n=== SYNTHETIC FIXTURE READY ===')
  console.log(JSON.stringify(result, null, 2))
  return result
}

// Allow direct CLI execution
if (process.argv[1]?.endsWith('seed-synthetic-lgpd-fixture.mjs')) {
  seedSyntheticLgpdSubject()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal Error:', err)
      process.exit(1)
    })
}
