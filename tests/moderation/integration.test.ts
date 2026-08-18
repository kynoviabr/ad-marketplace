import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestSupabaseAdmin, getTestSupabaseAnon } from '../helpers/supabase-test-client'

describe('FASE 06 — Live Supabase DEV Moderation & Reports Integration Tests', () => {
  const admin = getTestSupabaseAdmin()
  const anon = getTestSupabaseAnon()

  let advertiserAuthId: string
  let advertiserAccountId: string
  let adminAuthId: string
  let adminAccountId: string
  let profileId: string
  let media1Id: string
  let media2Id: string
  let reportId: string

  beforeAll(async () => {
    // 1. Create Advertiser Synthetic User
    const advEmail = `fase06-adv-${Date.now()}@ad-marketplace-synthetic.invalid`
    const { data: advAuth } = await admin.auth.admin.createUser({
      email: advEmail,
      password: 'Password@12345678!',
      email_confirm: true,
    })
    advertiserAuthId = advAuth.user!.id
    await new Promise((r) => setTimeout(r, 600))

    const { data: advAcct } = await admin
      .from('account_users')
      .select('id')
      .eq('auth_user_id', advertiserAuthId)
      .single()
    advertiserAccountId = advAcct!.id

    await admin
      .from('account_users')
      .update({
        terms_version: '1.0',
        privacy_version: '1.0',
        onboarding_step: 5,
        onboarding_status: 'IN_PROGRESS',
      })
      .eq('id', advertiserAccountId)

    await admin.from('identity_verifications').insert({
      account_user_id: advertiserAccountId,
      provider: 'didit',
      provider_session_id: `sess_mod_${Date.now()}`,
      status: 'VERIFIED',
      identity_verified: true,
      age_verified: true,
      verified_at: new Date().toISOString(),
    })

    // 2. Create Admin Synthetic User
    const adminEmail = `fase06-admin-${Date.now()}@ad-marketplace-synthetic.invalid`
    const { data: admAuth } = await admin.auth.admin.createUser({
      email: adminEmail,
      password: 'Password@12345678!',
      email_confirm: true,
    })
    adminAuthId = admAuth.user!.id
    await new Promise((r) => setTimeout(r, 600))

    const { data: admAcct } = await admin
      .from('account_users')
      .select('id')
      .eq('auth_user_id', adminAuthId)
      .single()
    adminAccountId = admAcct!.id

    // Promote to ADMIN role
    await admin
      .from('account_users')
      .update({
        role: 'ADMIN',
        terms_version: '1.0',
        privacy_version: '1.0',
      })
      .eq('id', adminAccountId)

    // 3. Create Advertiser Profile
    const { data: prof } = await admin
      .from('professional_profiles')
      .insert({
        account_user_id: advertiserAccountId,
        stage_name: 'Bianca Moderation Test',
        slug: `bianca-mod-${Date.now()}`,
        headline: 'Atendimento exclusivo e discreto',
        bio: 'Bio completa para testes de moderação editorial e denúncias.',
        public_age: 23,
        whatsapp_phone: '+5511999990000',
        status: 'READY_FOR_REVIEW',
        content_moderation_status: 'PENDING',
      })
      .select('id')
      .single()
    profileId = prof!.id

    // 4. Create 2 media items in PENDING_MODERATION
    media1Id = crypto.randomUUID()
    await admin.from('profile_media').insert({
      id: media1Id,
      profile_id: profileId,
      storage_path: `profiles/${profileId}/${media1Id}.jpg`,
      status: 'PENDING_MODERATION',
      position: 1,
      is_primary: true,
      mime_type: 'image/jpeg',
      file_size_bytes: 1024 * 1024,
    })

    media2Id = crypto.randomUUID()
    await admin.from('profile_media').insert({
      id: media2Id,
      profile_id: profileId,
      storage_path: `profiles/${profileId}/${media2Id}.jpg`,
      status: 'PENDING_MODERATION',
      position: 2,
      is_primary: false,
      mime_type: 'image/jpeg',
      file_size_bytes: 1024 * 1024,
    })
  })

  afterAll(async () => {
    if (advertiserAuthId) await admin.auth.admin.deleteUser(advertiserAuthId)
    if (adminAuthId) await admin.auth.admin.deleteUser(adminAuthId)
  })

  it('RLS: anon client cannot directly query media_moderation_reviews or profile_moderation_reviews', async () => {
    const { data: mediaRev, error: err1 } = await anon.from('media_moderation_reviews').select('*').limit(5)
    expect(err1 || !mediaRev || mediaRev.length === 0).toBeTruthy()

    const { data: profRev, error: err2 } = await anon.from('profile_moderation_reviews').select('*').limit(5)
    expect(err2 || !profRev || profRev.length === 0).toBeTruthy()
  })

  it('admin approves media1 and media2 via atomic RPC moderate_media', async () => {
    const { error: err1 } = await admin.rpc('moderate_media', {
      p_media_id: media1Id,
      p_reviewer_id: adminAccountId,
      p_decision: 'APPROVE',
    })
    expect(err1).toBeNull()

    const { error: err2 } = await admin.rpc('moderate_media', {
      p_media_id: media2Id,
      p_reviewer_id: adminAccountId,
      p_decision: 'APPROVE',
    })
    expect(err2).toBeNull()

    const { data: m1 } = await admin.from('profile_media').select('status, approved_at, is_primary').eq('id', media1Id).single()
    expect(m1?.status).toBe('APPROVED')
    expect(m1?.approved_at).not.toBeNull()
    expect(m1?.is_primary).toBe(true)

    const { data: m2 } = await admin.from('profile_media').select('status, approved_at, is_primary').eq('id', media2Id).single()
    expect(m2?.status).toBe('APPROVED')
    expect(m2?.is_primary).toBe(false)
  })

  it('admin approves profile text via atomic RPC moderate_profile and creates snapshot audit', async () => {
    const { error } = await admin.rpc('moderate_profile', {
      p_profile_id: profileId,
      p_reviewer_id: adminAccountId,
      p_decision: 'APPROVE',
      p_notes: 'Textos em conformidade com as diretrizes.',
      p_content_snapshot: { stage_name: 'Bianca Moderation Test', headline: 'Atendimento exclusivo' },
    })

    expect(error).toBeNull()

    const { data: prof } = await admin
      .from('professional_profiles')
      .select('content_moderation_status')
      .eq('id', profileId)
      .single()

    expect(prof?.content_moderation_status).toBe('APPROVED')

    const { data: review } = await admin
      .from('profile_moderation_reviews')
      .select('*')
      .eq('profile_id', profileId)
      .single()

    expect(review?.decision).toBe('APPROVE')
    expect(review?.reviewer_id).toBe(adminAccountId)
    expect(review?.content_snapshot).toBeDefined()
  })

  it('creates public content report with target foreign key integrity', async () => {
    const { data: rep, error } = await admin
      .from('content_reports')
      .insert({
        media_id: media1Id,
        reason_category: 'IMPERSONATION_OR_STOLEN',
        description: 'Foto não autorizada.',
        reporter_hash: 'test-reporter-hash-123',
        status: 'OPEN',
      })
      .select('*')
      .single()

    expect(error).toBeNull()
    expect(rep).toBeDefined()
    expect(rep.media_id).toBe(media1Id)
    expect(rep.profile_id).toBeNull()
    expect(rep.status).toBe('OPEN')
    reportId = rep.id
  })

  it('atomic report resolution: admin resolves report by quarantining media1; media2 is promoted to primary', async () => {
    const { error } = await admin.rpc('resolve_content_report', {
      p_report_id: reportId,
      p_admin_id: adminAccountId,
      p_action: 'QUARANTINE_MEDIA',
      p_resolution_notes: 'Procedente. Foto retirada e colocada em quarentena.',
    })

    expect(error).toBeNull()

    // Verify report is resolved
    const { data: resolvedRep } = await admin.from('content_reports').select('status, resolution_action').eq('id', reportId).single()
    expect(resolvedRep?.status).toBe('RESOLVED')
    expect(resolvedRep?.resolution_action).toBe('QUARANTINE_MEDIA')

    // Verify media1 is QUARANTINED and no longer primary
    const { data: m1 } = await admin.from('profile_media').select('status, is_primary').eq('id', media1Id).single()
    expect(m1?.status).toBe('QUARANTINED')
    expect(m1?.is_primary).toBe(false)

    // Verify media2 is atomically promoted to primary
    const { data: m2 } = await admin.from('profile_media').select('status, is_primary').eq('id', media2Id).single()
    expect(m2?.status).toBe('APPROVED')
    expect(m2?.is_primary).toBe(true)
  })

  it('underage escalation: quarantining media with UNDERAGE_SUSPICION automatically flags the profile', async () => {
    const { error } = await admin.rpc('moderate_media', {
      p_media_id: media2Id,
      p_reviewer_id: adminAccountId,
      p_decision: 'QUARANTINE',
      p_reason_code: 'UNDERAGE_SUSPICION',
      p_notes: 'Suspeita grave de menoridade.',
    })

    expect(error).toBeNull()

    const { data: prof } = await admin
      .from('professional_profiles')
      .select('content_moderation_status')
      .eq('id', profileId)
      .single()

    expect(prof?.content_moderation_status).toBe('FLAGGED')
  })
})
