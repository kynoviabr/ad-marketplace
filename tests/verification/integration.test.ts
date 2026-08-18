import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mwzlunkkyigxzjpnybxj.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13emx1bmtreWlneHpqcG55YnhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzAwNjkyMywiZXhwIjoyMTAyNTgyOTIzfQ.FoVQs8htk7Bns9etpKCpNXfSVXSs0lmjGhTx1h-fQsU'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13emx1bmtreWlneHpqcG55YnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMDY5MjMsImV4cCI6MjEwMjU4MjkyM30.QxpEG72vU2lTVyDW4SYfzLFYOs_VKB7eiaj-XqzL_Gg'

describe('FASE 02 — Live Supabase DEV Integration & Invariant Tests', () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let authUserId: string
  let accountId: string
  const testSessionId = `didit_sess_test_${Date.now()}`
  const testEventId = `evt_test_${Date.now()}`

  beforeAll(async () => {
    // Create synthetic test user
    const testEmail = `fase02-live-${Date.now()}@ad-marketplace-synthetic.invalid`
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: testEmail,
      password: 'Password@12345678!',
      email_confirm: true,
    })

    if (authErr || !authUser.user) {
      throw new Error(`Failed to create test user: ${authErr?.message}`)
    }
    authUserId = authUser.user.id

    // Wait for FASE 01 trigger to create account_users row
    await new Promise((r) => setTimeout(r, 600))
    const { data: accountRow } = await admin
      .from('account_users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single()

    if (!accountRow) {
      throw new Error('account_users row was not created by trigger')
    }
    accountId = accountRow.id

    // Set terms acceptance
    await admin
      .from('account_users')
      .update({
        terms_version: '1.0',
        terms_accepted_at: new Date().toISOString(),
        privacy_version: '1.0',
        privacy_accepted_at: new Date().toISOString(),
        onboarding_step: 1,
        onboarding_status: 'IN_PROGRESS',
      })
      .eq('id', accountId)
  })

  afterAll(async () => {
    if (authUserId) {
      await admin.auth.admin.deleteUser(authUserId)
    }
    // Clean up event ledger
    await admin
      .from('verification_webhook_events')
      .delete()
      .eq('provider_event_id', testEventId)
  })

  it('admin client can query identity_verifications and verification_webhook_events tables', async () => {
    const { error: ivErr } = await admin.from('identity_verifications').select('id').limit(1)
    expect(ivErr).toBeNull()

    const { error: weErr } = await admin.from('verification_webhook_events').select('id').limit(1)
    expect(weErr).toBeNull()
  })

  it('anon client is strictly blocked from direct SELECT on identity_verifications', async () => {
    const { data, error } = await anon.from('identity_verifications').select('*')
    // Either an error or empty array due to deny-all RLS
    expect(Boolean(error) || (Array.isArray(data) && data.length === 0)).toBe(true)
  })

  it('anon client is strictly blocked from direct INSERT on identity_verifications', async () => {
    const { error } = await anon.from('identity_verifications').insert({
      account_user_id: accountId,
      status: 'VERIFIED',
    })
    expect(error).not.toBeNull()
  })

  it('creates an identity_verifications record in PENDING state', async () => {
    const { data, error } = await admin
      .from('identity_verifications')
      .insert({
        account_user_id: accountId,
        provider: 'didit',
        provider_session_id: testSessionId,
        status: 'PENDING',
        started_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    expect(error).toBeNull()
    expect(data.status).toBe('PENDING')
    expect(data.identity_verified).toBe(false)
    expect(data.age_verified).toBe(false)
  })

  it('partial unique index strictly prevents second active session for the same user', async () => {
    const { error } = await admin.from('identity_verifications').insert({
      account_user_id: accountId,
      provider: 'didit',
      provider_session_id: `another_sess_${Date.now()}`,
      status: 'PENDING',
    })

    expect(error).not.toBeNull()
    expect(error?.code).toBe('23505') // unique_violation
  })

  it('check constraint enforces age_verified requires identity_verified', async () => {
    const { error } = await admin
      .from('identity_verifications')
      .update({
        identity_verified: false,
        age_verified: true, // Violates CHECK constraint
      })
      .eq('account_user_id', accountId)

    expect(error).not.toBeNull()
    expect(error?.code).toBe('23514') // check_violation
  })

  it('webhook event ledger records event and blocks replay duplicates', async () => {
    // First insert: succeeds
    const { error: err1 } = await admin.from('verification_webhook_events').insert({
      provider: 'didit',
      provider_event_id: testEventId,
      provider_session_id: testSessionId,
      event_type: 'status.updated',
      processing_status: 'RECEIVED',
    })
    expect(err1).toBeNull()

    // Second insert with same event_id: blocked by unique constraint
    const { error: err2 } = await admin.from('verification_webhook_events').insert({
      provider: 'didit',
      provider_event_id: testEventId,
      provider_session_id: testSessionId,
      event_type: 'status.updated',
      processing_status: 'RECEIVED',
    })
    expect(err2).not.toBeNull()
    expect(err2?.code).toBe('23505')
  })

  it('promotes verification to VERIFIED with age_verified=true and advances onboarding step to 3', async () => {
    const now = new Date().toISOString()
    const { data: updated, error } = await admin
      .from('identity_verifications')
      .update({
        status: 'VERIFIED',
        identity_verified: true,
        age_verified: true,
        cpf_verified: true,
        verified_country: 'BR',
        verified_at: now,
        updated_at: now,
      })
      .eq('account_user_id', accountId)
      .select('*')
      .single()

    expect(error).toBeNull()
    expect(updated.status).toBe('VERIFIED')
    expect(updated.identity_verified).toBe(true)
    expect(updated.age_verified).toBe(true)

    // Advance onboarding step
    await admin.from('account_users').update({ onboarding_step: 3 }).eq('id', accountId)

    const { data: acct } = await admin
      .from('account_users')
      .select('onboarding_step')
      .eq('id', accountId)
      .single()

    expect(acct?.onboarding_step).toBe(3)
  })
})
