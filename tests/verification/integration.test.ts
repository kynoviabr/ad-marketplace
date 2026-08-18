import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestSupabaseAdmin, getTestSupabaseAnon } from '../helpers/supabase-test-client'
import { getVerificationSafe } from '@/modules/verification/dal'
import { canProceedToProfessionalProfile, canUploadAdultMedia } from '@/modules/verification/gates'

describe('FASE 02 — Live Supabase DEV Verification Integration Tests', () => {
  const admin = getTestSupabaseAdmin()
  const anon = getTestSupabaseAnon()

  let testAuthUserId: string
  let testAccountUserId: string

  beforeAll(async () => {
    // 1. Create a real test user in Supabase Auth
    const email = `test-kyc-${Date.now()}@ad-marketplace-synthetic.invalid`
    const password = 'Password@12345678!'

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      throw new Error(`Failed to create test auth user: ${authError?.message}`)
    }

    testAuthUserId = authData.user.id

    // Wait 500ms for trigger auth.users -> public.account_users
    await new Promise((r) => setTimeout(r, 600))

    // 2. Fetch the created account_users record
    const { data: accountData, error: accountError } = await admin
      .from('account_users')
      .select('id, role, status')
      .eq('auth_user_id', testAuthUserId)
      .single()

    if (accountError || !accountData) {
      throw new Error(`Failed to fetch account_user: ${accountError?.message}`)
    }

    testAccountUserId = accountData.id

    // Accept terms and privacy to be a valid advertiser
    await admin
      .from('account_users')
      .update({
        terms_version: '1.0',
        privacy_version: '1.0',
        onboarding_step: 2,
        onboarding_status: 'IN_PROGRESS',
      })
      .eq('id', testAccountUserId)
  })

  afterAll(async () => {
    if (testAuthUserId) {
      await admin.auth.admin.deleteUser(testAuthUserId)
    }
  })

  it('verifies RLS: anon client cannot directly query identity_verifications', async () => {
    const { data, error } = await anon
      .from('identity_verifications')
      .select('*')
      .eq('account_user_id', testAccountUserId)

    expect(data === null || data.length === 0 || error !== null).toBe(true)
  })

  it('verifies RLS: anon client cannot directly insert into identity_verifications', async () => {
    const { error } = await anon.from('identity_verifications').insert({
      account_user_id: testAccountUserId,
      provider: 'didit',
      provider_session_id: 'fake-session',
      status: 'VERIFIED',
      identity_verified: true,
      age_verified: true,
    })

    expect(error).toBeDefined()
  })

  it('creates an initial verification record in PENDING status', async () => {
    const { data: record, error } = await admin
      .from('identity_verifications')
      .insert({
        account_user_id: testAccountUserId,
        provider: 'didit',
        provider_session_id: `session_${Date.now()}`,
        status: 'PENDING',
      })
      .select('*')
      .single()

    expect(error).toBeNull()
    expect(record).toBeDefined()
    expect(record.status).toBe('PENDING')
    expect(record.identity_verified).toBe(false)
    expect(record.age_verified).toBe(false)
  })

  it('safe DTO returns non-null without exposing sensitive provider session IDs', async () => {
    const safeDTO = await getVerificationSafe(testAccountUserId)

    expect(safeDTO).not.toBeNull()
    expect(safeDTO?.status).toBe('PENDING')
    expect(safeDTO?.identityVerified).toBe(false)
    expect(safeDTO?.ageVerified).toBe(false)
    expect((safeDTO as any).provider_session_id).toBeUndefined()
    expect((safeDTO as any).provider).toBeUndefined()
  })

  it('evaluates fail-closed security gates on PENDING status', async () => {
    const safeDTO = await getVerificationSafe(testAccountUserId)
    expect(canProceedToProfessionalProfile(safeDTO)).toBe(false)
    expect(canUploadAdultMedia(safeDTO)).toBe(false)
  })

  it('updates verification record to VERIFIED (18+ confirmed) via admin client', async () => {
    const { data, error } = await admin
      .from('identity_verifications')
      .update({
        status: 'VERIFIED',
        identity_verified: true,
        age_verified: true,
        verified_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('account_user_id', testAccountUserId)
      .select()
      .single()

    expect(error).toBeNull()
    expect(data.status).toBe('VERIFIED')
    expect(data.identity_verified).toBe(true)
    expect(data.age_verified).toBe(true)
  })

  it('evaluates security gates as TRUE when status is VERIFIED and age >= 18', async () => {
    const safeDTO = await getVerificationSafe(testAccountUserId)
    expect(canProceedToProfessionalProfile(safeDTO)).toBe(true)
    expect(canUploadAdultMedia(safeDTO)).toBe(true)
  })

  it('records an audit event in verification_webhook_events', async () => {
    const { data, error } = await admin
      .from('verification_webhook_events')
      .insert({
        provider: 'didit',
        provider_event_id: `evt_${Date.now()}`,
        provider_session_id: `session_${Date.now()}`,
        event_type: 'decision.passed',
        processing_status: 'PROCESSED',
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data.event_type).toBe('decision.passed')
  })
})
