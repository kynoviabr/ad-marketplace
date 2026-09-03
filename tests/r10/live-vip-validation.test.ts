import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestSupabaseAdmin } from '../helpers/supabase-test-client'
import { resolveClientVipEntitlement } from '@/modules/clients/dal'
import { getEligiblePublicProfileBySlug } from '@/modules/profiles/public-detail'
import { executeSearch } from '@/modules/search/dal'
import { getNewProfessionals, getNewContent } from '@/modules/search/home-sections'

describe('FASE 10 — Final Live VIP Preview Validation', () => {
  const admin = getTestSupabaseAdmin()
  const PREFIX = `synth-live-${Date.now()}-`

  const createdAuthUserIds: string[] = []
  const createdAccountIds: string[] = []
  const createdProfileIds: string[] = []
  const createdMediaIds: string[] = []
  const createdSubIds: string[] = []
  const createdVerifIds: string[] = []
  const createdStoragePaths: string[] = []

  let freeAccountId: string
  let vipAccountId: string
  let expiredAccountId: string
  let profPublicAccountId: string
  let profVipAccountId: string

  let publicSlug: string
  let vipSlug: string
  let publicProfileId: string
  let vipProfileId: string

  let approvedMediaId: string
  let pendingMediaId: string
  let rejectedMediaId: string

  const dummyJpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46])

  beforeAll(async () => {
    // 0. Get city and location in SP
    const { data: spCity } = await admin.from('cities').select('id').eq('slug', 'sao-paulo').single()
    const { data: loc } = await admin.from('marketplace_locations').select('id').eq('city_id', spCity!.id).eq('active', true).limit(1).single()
    const locationId = loc!.id

    const { data: founderPlan } = await admin.from('subscription_plans').select('id').eq('code', 'FOUNDER').single()
    const { data: freePrice } = await admin.from('plan_prices').select('id').eq('plan_id', founderPlan!.id).eq('price_code', 'LAUNCH_FREE').single()

    // 1. Create Synthetic Clients (FREE, VIP, EXPIRED)
    const { data: uFree } = await admin.auth.admin.createUser({ email: `${PREFIX}free@synth.test`, password: 'Password@123!', email_confirm: true })
    const { data: uVip } = await admin.auth.admin.createUser({ email: `${PREFIX}vip@synth.test`, password: 'Password@123!', email_confirm: true })
    const { data: uExp } = await admin.auth.admin.createUser({ email: `${PREFIX}exp@synth.test`, password: 'Password@123!', email_confirm: true })
    createdAuthUserIds.push(uFree!.user!.id, uVip!.user!.id, uExp!.user!.id)

    // Wait for trigger
    await new Promise((r) => setTimeout(r, 600))

    const { data: clientAccounts } = await admin.from('account_users').select('id, auth_user_id').in('auth_user_id', createdAuthUserIds)
    freeAccountId = clientAccounts!.find((a) => a.auth_user_id === uFree!.user!.id)!.id
    vipAccountId = clientAccounts!.find((a) => a.auth_user_id === uVip!.user!.id)!.id
    expiredAccountId = clientAccounts!.find((a) => a.auth_user_id === uExp!.user!.id)!.id
    createdAccountIds.push(freeAccountId, vipAccountId, expiredAccountId)

    await admin.from('account_users').update({ role: 'CLIENT', status: 'ACTIVE' }).in('id', [freeAccountId, vipAccountId, expiredAccountId])

    // FREE membership
    await admin.from('client_memberships').upsert({ account_id: freeAccountId, membership_type: 'FREE', valid_until: null })
    // Active VIP membership (valid 1 year)
    await admin.from('client_memberships').upsert({ account_id: vipAccountId, membership_type: 'VIP', valid_until: new Date(Date.now() + 365 * 86400000).toISOString() })
    // Expired VIP membership (expired yesterday)
    await admin.from('client_memberships').upsert({ account_id: expiredAccountId, membership_type: 'VIP', valid_until: new Date(Date.now() - 86400000).toISOString() })

    // 2. Create Two Professional Accounts (one for PUBLIC profile, one for VIP_ONLY profile)
    const { data: uProfPub } = await admin.auth.admin.createUser({ email: `${PREFIX}profpub@synth.test`, password: 'Password@123!', email_confirm: true })
    const { data: uProfVip } = await admin.auth.admin.createUser({ email: `${PREFIX}profvip@synth.test`, password: 'Password@123!', email_confirm: true })
    createdAuthUserIds.push(uProfPub!.user!.id, uProfVip!.user!.id)

    await new Promise((r) => setTimeout(r, 600))

    const { data: profAccounts } = await admin.from('account_users').select('id, auth_user_id').in('auth_user_id', [uProfPub!.user!.id, uProfVip!.user!.id])
    profPublicAccountId = profAccounts!.find((a) => a.auth_user_id === uProfPub!.user!.id)!.id
    profVipAccountId = profAccounts!.find((a) => a.auth_user_id === uProfVip!.user!.id)!.id
    createdAccountIds.push(profPublicAccountId, profVipAccountId)

    for (const pAccId of [profPublicAccountId, profVipAccountId]) {
      await admin.from('account_users').update({ role: 'ADVERTISER', status: 'ACTIVE', onboarding_step: 6, onboarding_status: 'COMPLETED' }).eq('id', pAccId)
      
      const { data: verif } = await admin.from('identity_verifications').insert({
        account_user_id: pAccId,
        provider: 'didit',
        provider_session_id: `sess-${pAccId}-${Date.now()}`,
        status: 'VERIFIED',
        identity_verified: true,
        age_verified: true,
        verified_at: new Date().toISOString(),
      }).select('id').single()
      createdVerifIds.push(verif!.id)

      const { data: sub } = await admin.from('subscriptions').insert({
        account_user_id: pAccId,
        plan_id: founderPlan!.id,
        price_id: freePrice!.id,
        status: 'ACTIVE',
        current_period_start: new Date().toISOString(),
        current_period_end: null,
      }).select('id').single()
      createdSubIds.push(sub!.id)
    }

    publicSlug = `${PREFIX}pub`
    vipSlug = `${PREFIX}vip`

    // Public Profile
    const { data: profPub } = await admin.from('professional_profiles').insert({
      account_user_id: profPublicAccountId,
      stage_name: 'Synthetic Public Model',
      slug: publicSlug,
      headline: 'Public Synthetic Headline',
      bio: 'Public description bio for live validation testing.',
      public_age: 24,
      height_cm: 170,
      show_age: true,
      show_height: true,
      show_whatsapp: true,
      whatsapp_phone: '+5511999990001',
      status: 'ACTIVE',
      content_moderation_status: 'APPROVED',
      audience_setting: 'PUBLIC',
      published_at: new Date().toISOString(),
    }).select('id').single()
    publicProfileId = profPub!.id
    createdProfileIds.push(publicProfileId)

    await admin.rpc('save_profile_service_areas', {
      p_profile_id: publicProfileId,
      p_location_ids: [locationId],
      p_primary_location_id: locationId,
    })

    const pubStoragePath = `synth/${PREFIX}pub.jpg`
    await admin.storage.from('profile-media').upload(pubStoragePath, dummyJpeg, { contentType: 'image/jpeg', upsert: true })
    createdStoragePaths.push(pubStoragePath)

    const { data: mPub } = await admin.from('profile_media').insert({
      profile_id: publicProfileId,
      storage_path: pubStoragePath,
      mime_type: 'image/jpeg',
      file_size_bytes: dummyJpeg.length,
      status: 'APPROVED',
      approved_at: new Date().toISOString(),
      is_primary: true,
      width: 800,
      height: 1000,
    }).select('id').single()
    createdMediaIds.push(mPub!.id)

    // VIP_ONLY Profile
    const { data: profVip } = await admin.from('professional_profiles').insert({
      account_user_id: profVipAccountId,
      stage_name: 'Synthetic VIP Model',
      slug: vipSlug,
      headline: 'VIP Synthetic Headline',
      bio: 'VIP description bio for live validation testing.',
      public_age: 26,
      height_cm: 175,
      show_age: true,
      show_height: true,
      show_whatsapp: true,
      whatsapp_phone: '+5511999990002',
      status: 'ACTIVE',
      content_moderation_status: 'APPROVED',
      audience_setting: 'VIP_ONLY',
      published_at: new Date().toISOString(),
    }).select('id').single()
    vipProfileId = profVip!.id
    createdProfileIds.push(vipProfileId)

    await admin.rpc('save_profile_service_areas', {
      p_profile_id: vipProfileId,
      p_location_ids: [locationId],
      p_primary_location_id: locationId,
    })

    const vipStoragePath = `synth/${PREFIX}vip_app.jpg`
    await admin.storage.from('profile-media').upload(vipStoragePath, dummyJpeg, { contentType: 'image/jpeg', upsert: true })
    createdStoragePaths.push(vipStoragePath)

    const { data: mApp } = await admin.from('profile_media').insert({
      profile_id: vipProfileId,
      storage_path: vipStoragePath,
      mime_type: 'image/jpeg',
      file_size_bytes: dummyJpeg.length,
      status: 'APPROVED',
      approved_at: new Date().toISOString(),
      is_primary: true,
      width: 800,
      height: 1000,
    }).select('id').single()
    approvedMediaId = mApp!.id
    createdMediaIds.push(approvedMediaId)

    const { data: mPend } = await admin.from('profile_media').insert({
      profile_id: vipProfileId,
      storage_path: `synth/${PREFIX}vip_pend.jpg`,
      mime_type: 'image/jpeg',
      file_size_bytes: 1024,
      status: 'PENDING_MODERATION',
      is_primary: false,
      width: 800,
      height: 1000,
    }).select('id').single()
    pendingMediaId = mPend!.id
    createdMediaIds.push(pendingMediaId)

    const { data: mRej } = await admin.from('profile_media').insert({
      profile_id: vipProfileId,
      storage_path: `synth/${PREFIX}vip_rej.jpg`,
      mime_type: 'image/jpeg',
      file_size_bytes: 1024,
      status: 'REJECTED',
      is_primary: false,
      width: 800,
      height: 1000,
    }).select('id').single()
    rejectedMediaId = mRej!.id
    createdMediaIds.push(rejectedMediaId)
  })

  afterAll(async () => {
    if (createdStoragePaths.length > 0) {
      await admin.storage.from('profile-media').remove(createdStoragePaths)
    }
    if (createdMediaIds.length > 0) {
      await admin.from('profile_media').delete().in('id', createdMediaIds)
    }
    if (createdProfileIds.length > 0) {
      await admin.from('professional_profile_locations').delete().in('profile_id', createdProfileIds)
      await admin.from('professional_profiles').delete().in('id', createdProfileIds)
    }
    if (createdSubIds.length > 0) {
      await admin.from('subscriptions').delete().in('id', createdSubIds)
    }
    if (createdVerifIds.length > 0) {
      await admin.from('identity_verifications').delete().in('id', createdVerifIds)
    }
    if (createdAccountIds.length > 0) {
      await admin.from('client_memberships').delete().in('account_id', createdAccountIds)
      await admin.from('account_users').delete().in('id', createdAccountIds)
    }
    for (const uid of createdAuthUserIds) {
      await admin.auth.admin.deleteUser(uid)
    }

    const { count: cAcc } = await admin.from('account_users').select('id', { count: 'exact', head: true }).in('id', createdAccountIds)
    const { count: cProf } = await admin.from('professional_profiles').select('id', { count: 'exact', head: true }).in('id', createdProfileIds)
    const { count: cMed } = await admin.from('profile_media').select('id', { count: 'exact', head: true }).in('id', createdMediaIds)

    expect(cAcc || 0).toBe(0)
    expect(cProf || 0).toBe(0)
    expect(cMed || 0).toBe(0)
  })

  it('validates client entitlement resolver invariants', async () => {
    const entAnon = await resolveClientVipEntitlement(null)
    expect(entAnon.canAccessVipProfiles).toBe(false)
    expect(entAnon.canAccessVipMedia).toBe(false)

    const entFree = await resolveClientVipEntitlement(freeAccountId)
    expect(entFree.canAccessVipProfiles).toBe(false)
    expect(entFree.canAccessVipMedia).toBe(false)

    const entExpired = await resolveClientVipEntitlement(expiredAccountId)
    expect(entExpired.canAccessVipProfiles).toBe(false)
    expect(entExpired.canAccessVipMedia).toBe(false)

    const entVip = await resolveClientVipEntitlement(vipAccountId)
    expect(entVip.canAccessVipProfiles).toBe(true)
    expect(entVip.canAccessVipMedia).toBe(true)

    const entProf = await resolveClientVipEntitlement(profPublicAccountId)
    expect(entProf.canAccessVipProfiles).toBe(false)
    expect(entProf.canAccessVipMedia).toBe(false)
  })

  it('validates PUBLIC profile access across all customer tiers', async () => {
    const resAnon = await getEligiblePublicProfileBySlug(publicSlug, null)
    expect(resAnon).not.toBeNull()
    expect(resAnon?.profile.slug).toBe(publicSlug)

    const resFree = await getEligiblePublicProfileBySlug(publicSlug, freeAccountId)
    expect(resFree).not.toBeNull()
    expect(resFree?.profile.slug).toBe(publicSlug)

    const resVip = await getEligiblePublicProfileBySlug(publicSlug, vipAccountId)
    expect(resVip).not.toBeNull()
    expect(resVip?.profile.slug).toBe(publicSlug)
  })

  it('validates VIP_ONLY profile gate: anon, FREE, and expired denied; active VIP allowed', async () => {
    const resAnon = await getEligiblePublicProfileBySlug(vipSlug, null)
    expect(resAnon).toBeNull()

    const resFree = await getEligiblePublicProfileBySlug(vipSlug, freeAccountId)
    expect(resFree).toBeNull()

    const resExpired = await getEligiblePublicProfileBySlug(vipSlug, expiredAccountId)
    expect(resExpired).toBeNull()

    const resVip = await getEligiblePublicProfileBySlug(vipSlug, vipAccountId)
    expect(resVip).not.toBeNull()
    expect(resVip?.profile.slug).toBe(vipSlug)
  })

  it('validates media security: pending and rejected are never accessible even to VIP', async () => {
    const resVip = await getEligiblePublicProfileBySlug(vipSlug, vipAccountId)
    expect(resVip).not.toBeNull()

    // Only approved media is delivered (1 approved photo, pending and rejected excluded)
    expect(resVip!.media.length).toBe(1)
    expect(resVip!.media[0].isPrimary).toBe(true)
    expect(resVip!.media[0].url).toContain('synth')
  })

  it('validates search DAL: excludes VIP_ONLY profiles from unauthorized callers', async () => {
    const searchAnon = await executeSearch({ citySlug: 'sao-paulo' }, null)
    const searchFree = await executeSearch({ citySlug: 'sao-paulo' }, freeAccountId)
    const searchVip = await executeSearch({ citySlug: 'sao-paulo' }, vipAccountId)

    const anonVipItems = searchAnon.results.filter((r) => r.slug === vipSlug)
    const freeVipItems = searchFree.results.filter((r) => r.slug === vipSlug)
    const vipVipItems = searchVip.results.filter((r) => r.slug === vipSlug)

    expect(anonVipItems.length).toBe(0)
    expect(freeVipItems.length).toBe(0)
    expect(vipVipItems.length).toBe(1)
  })

  it('validates home discovery: Novas Modelos and Novos Conteúdos audience filtering', async () => {
    const profsAnon = await getNewProfessionals(null, 50)
    const profsFree = await getNewProfessionals(freeAccountId, 50)
    const profsVip = await getNewProfessionals(vipAccountId, 50)

    expect(profsAnon.some((p) => p.slug === vipSlug)).toBe(false)
    expect(profsFree.some((p) => p.slug === vipSlug)).toBe(false)
    expect(profsVip.some((p) => p.slug === vipSlug)).toBe(true)

    const contentAnon = await getNewContent(null, 50)
    const contentFree = await getNewContent(freeAccountId, 50)
    const contentVip = await getNewContent(vipAccountId, 50)

    expect(contentAnon.some((c) => c.profile_id === vipProfileId)).toBe(false)
    expect(contentFree.some((c) => c.profile_id === vipProfileId)).toBe(false)
    expect(contentVip.some((c) => c.profile_id === vipProfileId)).toBe(true)
  })

  it('validates professional audience setting persistence and admin override', async () => {
    await admin.from('professional_profiles').update({ audience_setting: 'PUBLIC' }).eq('id', vipProfileId)
    const { data: p1 } = await admin.from('professional_profiles').select('audience_setting').eq('id', vipProfileId).single()
    expect(p1!.audience_setting).toBe('PUBLIC')

    await admin.from('professional_profiles').update({ audience_setting: 'VIP_ONLY' }).eq('id', vipProfileId)
    const { data: p2 } = await admin.from('professional_profiles').select('audience_setting').eq('id', vipProfileId).single()
    expect(p2!.audience_setting).toBe('VIP_ONLY')
  })
})
