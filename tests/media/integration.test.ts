import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { getProfileMedia, getPrimaryMedia, getActivePhotoCount } from '@/modules/media/dal'

const SUPABASE_URL = 'https://mwzlunkkyigxzjpnybxj.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13emx1bmtreWlneHpqcG55YnhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzAwNjkyMywiZXhwIjoyMTAyNTgyOTIzfQ.FoVQs8htk7Bns9etpKCpNXfSVXSs0lmjGhTx1h-fQsU'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13emx1bmtreWlneHpqcG55YnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMDY5MjMsImV4cCI6MjEwMjU4MjkyM30.QxpEG72vU2lTVyDW4SYfzLFYOs_VKB7eiaj-XqzL_Gg'

process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL
process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_ROLE_KEY

describe('FASE 05 — Live Supabase DEV Media Management Integration Tests', () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let userAId: string
  let profileAId: string
  let media1Id: string
  let media2Id: string

  beforeAll(async () => {
    // 1. Create Synthetic User A
    const emailA = `fase05-user-${Date.now()}@ad-marketplace-synthetic.invalid`
    const { data: authA } = await admin.auth.admin.createUser({
      email: emailA,
      password: 'Password@12345678!',
      email_confirm: true,
    })
    userAId = authA.user!.id
    await new Promise((r) => setTimeout(r, 600))

    const { data: acctA } = await admin.from('account_users').select('id').eq('auth_user_id', userAId).single()
    await admin.from('account_users').update({ terms_version: '1.0', privacy_version: '1.0', onboarding_step: 4, onboarding_status: 'IN_PROGRESS' }).eq('id', acctA!.id)
    await admin.from('identity_verifications').insert({
      account_user_id: acctA!.id,
      provider: 'didit',
      provider_session_id: `sess_m_${Date.now()}`,
      status: 'VERIFIED',
      identity_verified: true,
      age_verified: true,
      verified_at: new Date().toISOString(),
    })

    const { data: profA } = await admin
      .from('professional_profiles')
      .insert({
        account_user_id: acctA!.id,
        stage_name: 'Isabela Media Test',
        slug: `isabela-media-${Date.now()}`,
        headline: 'Modelo e Atendimento Exclusivo',
        bio: 'Bio de teste para integração de galeria de fotos.',
        public_age: 24,
        status: 'READY_FOR_REVIEW',
      })
      .select('id')
      .single()
    profileAId = profA!.id
  })

  afterAll(async () => {
    if (userAId) {
      await admin.auth.admin.deleteUser(userAId)
    }
  })

  it('anon client cannot directly query or mutate profile_media table', async () => {
    const { data, error } = await anon.from('profile_media').select('*').limit(5)
    expect(error || !data || data.length === 0).toBeTruthy()

    const { error: insertErr } = await anon.from('profile_media').insert({
      profile_id: profileAId,
      storage_path: `profiles/${profileAId}/test.jpg`,
      status: 'UPLOADING',
      mime_type: 'image/jpeg',
      file_size_bytes: 1024,
    })
    expect(insertErr).toBeDefined()
  })

  it('inserts first photo in UPLOADING status with is_primary = true', async () => {
    media1Id = crypto.randomUUID()
    const { data: inserted, error } = await admin
      .from('profile_media')
      .insert({
        id: media1Id,
        profile_id: profileAId,
        storage_path: `profiles/${profileAId}/${media1Id}.jpg`,
        status: 'UPLOADING',
        position: 1,
        is_primary: true,
        mime_type: 'image/jpeg',
        file_size_bytes: 2 * 1024 * 1024,
      })
      .select('*')
      .single()

    expect(error).toBeNull()
    expect(inserted).toBeDefined()
    expect(inserted.is_primary).toBe(true)
    expect(inserted.status).toBe('UPLOADING')
  })

  it('transitions photo from UPLOADING to PENDING_MODERATION upon upload confirmation', async () => {
    const { data: updated, error } = await admin
      .from('profile_media')
      .update({
        status: 'PENDING_MODERATION',
        width: 1200,
        height: 1600,
      })
      .eq('id', media1Id)
      .select('*')
      .single()

    expect(error).toBeNull()
    expect(updated.status).toBe('PENDING_MODERATION')
    expect(updated.width).toBe(1200)
    expect(updated.height).toBe(1600)
  })

  it('inserts second photo with is_primary = false at position 2', async () => {
    media2Id = crypto.randomUUID()
    const { data: inserted, error } = await admin
      .from('profile_media')
      .insert({
        id: media2Id,
        profile_id: profileAId,
        storage_path: `profiles/${profileAId}/${media2Id}.jpg`,
        status: 'PENDING_MODERATION',
        position: 2,
        is_primary: false,
        mime_type: 'image/png',
        file_size_bytes: 3 * 1024 * 1024,
      })
      .select('*')
      .single()

    expect(error).toBeNull()
    expect(inserted.is_primary).toBe(false)
    expect(inserted.position).toBe(2)
  })

  it('queries active photos ordered by position using DAL', async () => {
    const media = await getProfileMedia(profileAId)
    expect(media.length).toBe(2)
    expect(media[0].id).toBe(media1Id)
    expect(media[1].id).toBe(media2Id)

    const primary = await getPrimaryMedia(profileAId)
    expect(primary?.id).toBe(media1Id)

    const count = await getActivePhotoCount(profileAId)
    expect(count).toBe(2)
  })

  it('toggles primary photo using RPC set_primary_profile_media', async () => {
    const { error } = await admin.rpc('set_primary_profile_media', {
      p_profile_id: profileAId,
      p_media_id: media2Id,
    })

    expect(error).toBeNull()

    const primary = await getPrimaryMedia(profileAId)
    expect(primary?.id).toBe(media2Id)

    const mediaList = await getProfileMedia(profileAId)
    const primaries = mediaList.filter((m) => m.is_primary)
    expect(primaries.length).toBe(1)
  })

  it('reorders photos using RPC reorder_profile_media', async () => {
    const { error } = await admin.rpc('reorder_profile_media', {
      p_profile_id: profileAId,
      p_media_ids: [media2Id, media1Id],
    })

    expect(error).toBeNull()

    const mediaList = await getProfileMedia(profileAId)
    expect(mediaList[0].id).toBe(media2Id)
    expect(mediaList[0].position).toBe(1)
    expect(mediaList[1].id).toBe(media1Id)
    expect(mediaList[1].position).toBe(2)
  })

  it('soft deletes photo and updates active count', async () => {
    const { error } = await admin
      .from('profile_media')
      .update({ deleted_at: new Date().toISOString(), status: 'DELETED' })
      .eq('id', media1Id)

    expect(error).toBeNull()

    const count = await getActivePhotoCount(profileAId)
    expect(count).toBe(1)

    const mediaList = await getProfileMedia(profileAId)
    expect(mediaList.length).toBe(1)
    expect(mediaList[0].id).toBe(media2Id)
  })
})
