#!/usr/bin/env node
/**
 * LGPD-02C.1 — Physical Closure Gate Validation Script
 *
 * Executes empirical verification across all required sections against DEV database.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { inflateRawSync } from 'node:zlib'



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
  console.error('FATAL: Missing Supabase credentials.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const SYNTHETIC_ADVERTISER_ACCOUNT_ID = 'ae5b6b24-29bb-46f6-b77e-36bb2ef4566c'
const SYNTHETIC_ADVERTISER_AUTH_ID = '995fc7f1-9f0f-4e89-90cd-213336d790ce'
const SYNTHETIC_ADVERTISER_PROFILE_ID = 'ce6e6b41-8895-44af-88cb-290956c5eddf'

const SYNTHETIC_CLIENT_ACCOUNT_ID = '20b81f03-6d9b-4906-bba4-4eaaa0913681'
const SYNTHETIC_CLIENT_AUTH_ID = '8d08bec5-3f14-4218-bbf7-4a2571ec9819'

// Simple ZIP parser to inspect generated buffer without external libs
function parseZipBuffer(buffer) {
  const files = {}
  let offset = 0

  while (offset < buffer.length - 4) {
    const signature = buffer.readUInt32LE(offset)
    if (signature === 0x04034b50) { // Local file header
      const nameLen = buffer.readUInt16LE(offset + 26)
      const extraLen = buffer.readUInt16LE(offset + 28)
      const compressedSize = buffer.readUInt32LE(offset + 18)
      const name = buffer.toString('utf8', offset + 30, offset + 30 + nameLen)
      const dataStart = offset + 30 + nameLen + extraLen
      const compressedData = buffer.subarray(dataStart, dataStart + compressedSize)
      try {
        const decompressed = inflateRawSync(compressedData)
        files[name] = decompressed.toString('utf8')
      } catch (err) {
        files[name] = `[error: ${err.message}]`
      }
      offset = dataStart + compressedSize
    } else {
      offset++
    }
  }
  return files
}

async function run() {
  console.log('===============================================================')
  console.log('LGPD-02C.1 — PHYSICAL CLOSURE GATE VALIDATION')
  console.log('===============================================================')

  const results = {}

  // ---------------------------------------------------------------------------
  // 1. DATA EXPORT GENERATION & SANITIZATION AUDIT (Section 3)
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 1: Validating Sanitized Personal Data Export ---')
  const { exportSubjectDataZip } = await import('../modules/privacy/export-engine.ts')
  const zipBuffer = await exportSubjectDataZip(SYNTHETIC_ADVERTISER_ACCOUNT_ID)
  
  if (!zipBuffer || zipBuffer.length === 0) {
    throw new Error('Export ZIP buffer is empty!')
  }
  console.log(`✓ Export ZIP generated: ${zipBuffer.length} bytes`)

  const extractedFiles = parseZipBuffer(zipBuffer)
  const fileNames = Object.keys(extractedFiles)
  console.log('✓ Files in ZIP:', fileNames)

  if (!extractedFiles['manifest.json'] || !extractedFiles['account.json'] || !extractedFiles['profile.json']) {
    throw new Error('Missing expected JSON files in export bundle!')
  }

  const manifest = JSON.parse(extractedFiles['manifest.json'])
  const accountData = JSON.parse(extractedFiles['account.json'])
  const profileData = JSON.parse(extractedFiles['profile.json'])

  console.log(`✓ manifest.json parsed: exportId=${manifest.exportId}, datasets=${manifest.totalDatasets}`)
  console.log(`✓ account.json parsed: email=${accountData.email}, role=${accountData.role}`)
  console.log(`✓ profile.json parsed: stageName=${profileData.stageName}`)

  // Verify absence of forbidden secrets/moderation fields
  const forbiddenKeys = ['password_hash', 'encrypted_password', 'auth_token', 'moderation_notes', 'internal_score']
  for (const f of Object.values(extractedFiles)) {
    for (const forbidden of forbiddenKeys) {
      if (f.includes(forbidden)) {
        throw new Error(`LEAK DETECTED! Found prohibited key "${forbidden}" in export payload!`)
      }
    }
  }
  console.log('✓ Prohibited secrets & internal moderation notes absent (ZERO LEAKAGE)')
  results.exportPhysical = 'PASS'

  // ---------------------------------------------------------------------------
  // 2. ADVERTISER PORTABILITY REQUEST (Section 4)
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 2: Validating PORTABILITY Request ---')
  const { createDataSubjectRequest, getAccountDsrEventsSafe } = await import('../modules/privacy/dal.ts')
  
  // Clean up any old active requests for this test
  await supabase.from('data_subject_requests')
    .update({ status: 'CANCELLED' })
    .eq('requester_account_user_id', SYNTHETIC_ADVERTISER_ACCOUNT_ID)
    .in('status', ['RECEIVED', 'IN_REVIEW', 'PROCESSING'])

  const portResult = await createDataSubjectRequest({
    accountUserId: SYNTHETIC_ADVERTISER_ACCOUNT_ID,
    requestType: 'PORTABILITY',
    details: { reason: 'LGPD-02C.1 physical test' }
  })

  if (!portResult.success || !portResult.request) {
    throw new Error(`PORTABILITY creation failed: ${portResult.error}`)
  }
  console.log(`✓ PORTABILITY request created: ID=${portResult.request.id}, status=${portResult.request.status}`)

  const portEvents = await getAccountDsrEventsSafe(SYNTHETIC_ADVERTISER_ACCOUNT_ID, portResult.request.id)
  console.log(`✓ PORTABILITY events count: ${portEvents.length}, initialEvent=${portEvents[0]?.eventType}`)

  if (portResult.request.status !== 'RECEIVED' || portEvents[0]?.eventType !== 'REQUEST_CREATED') {
    throw new Error('PORTABILITY request does not have status RECEIVED or event REQUEST_CREATED!')
  }
  results.portabilityRequest = 'PASS'

  // ---------------------------------------------------------------------------
  // 3. ZERO-DESTRUCTION EMPIRICAL SNAPSHOT (Sections 5 & 6)
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 3: Zero-Destruction Empirical Snapshot for DELETION ---')
  
  // Clean up portability request so we can test DELETION cleanly
  await supabase.from('data_subject_requests')
    .update({ status: 'CANCELLED' })
    .eq('id', portResult.request.id)

  // SNAPSHOT BEFORE
  const { data: authBefore } = await supabase.auth.admin.getUserById(SYNTHETIC_ADVERTISER_AUTH_ID)
  const { data: accBefore } = await supabase.from('account_users').select('*').eq('id', SYNTHETIC_ADVERTISER_ACCOUNT_ID).single()
  const { data: profBefore } = await supabase.from('professional_profiles').select('*').eq('id', SYNTHETIC_ADVERTISER_PROFILE_ID).single()
  const { data: mediaObjectsBefore } = await supabase.storage.from('profile-media').list(SYNTHETIC_ADVERTISER_PROFILE_ID)
  const { count: execBefore } = await supabase.from('privacy_lifecycle_executions').select('*', { count: 'exact', head: true }).eq('subject_account_user_id', SYNTHETIC_ADVERTISER_ACCOUNT_ID)

  console.log('SNAPSHOT BEFORE DELETION REQUEST:')
  console.log(`  Auth Exists: ${!!authBefore?.user}`)
  console.log(`  Account Exists: ${!!accBefore}`)
  console.log(`  Profile Exists: ${!!profBefore}`)
  console.log(`  Storage Media Count: ${mediaObjectsBefore?.length ?? 0}`)
  console.log(`  Lifecycle Executions: ${execBefore ?? 0}`)

  // CREATE DELETION REQUEST
  const delResult = await createDataSubjectRequest({
    accountUserId: SYNTHETIC_ADVERTISER_ACCOUNT_ID,
    requestType: 'DELETION',
    details: { reason: 'LGPD-02C.1 physical deletion test' }
  })

  if (!delResult.success || !delResult.request) {
    throw new Error(`DELETION request failed: ${delResult.error}`)
  }
  console.log(`✓ DELETION request registered: ID=${delResult.request.id}, status=${delResult.request.status}`)

  // SNAPSHOT IMMEDIATELY AFTER
  const { data: authAfter } = await supabase.auth.admin.getUserById(SYNTHETIC_ADVERTISER_AUTH_ID)
  const { data: accAfter } = await supabase.from('account_users').select('*').eq('id', SYNTHETIC_ADVERTISER_ACCOUNT_ID).single()
  const { data: profAfter } = await supabase.from('professional_profiles').select('*').eq('id', SYNTHETIC_ADVERTISER_PROFILE_ID).single()
  const { data: mediaObjectsAfter } = await supabase.storage.from('profile-media').list(SYNTHETIC_ADVERTISER_PROFILE_ID)
  const { count: execAfter } = await supabase.from('privacy_lifecycle_executions').select('*', { count: 'exact', head: true }).eq('subject_account_user_id', SYNTHETIC_ADVERTISER_ACCOUNT_ID)

  const authDelta = (authAfter?.user ? 1 : 0) - (authBefore?.user ? 1 : 0)
  const accDelta = (accAfter ? 1 : 0) - (accBefore ? 1 : 0)
  const profDelta = (profAfter ? 1 : 0) - (profBefore ? 1 : 0)
  const storageDelta = (mediaObjectsAfter?.length ?? 0) - (mediaObjectsBefore?.length ?? 0)
  const execDelta = (execAfter ?? 0) - (execBefore ?? 0)

  console.log('SNAPSHOT AFTER DELETION REQUEST:')
  console.log(`  AUTH DELTA: ${authDelta}`)
  console.log(`  ACCOUNT DELTA: ${accDelta}`)
  console.log(`  PROFILE DELTA: ${profDelta}`)
  console.log(`  STORAGE DELTA: ${storageDelta}`)
  console.log(`  LIFECYCLE EXECUTION DELTA: ${execDelta}`)

  if (authDelta !== 0 || accDelta !== 0 || profDelta !== 0 || storageDelta !== 0 || execDelta !== 0) {
    throw new Error('DESTRUCTION DETECTED! Submitting DELETION request mutated real user records!')
  }
  console.log('✓ ZERO-DESTRUCTION EMPIRICAL VERIFICATION CONFIRMED: DELETION REQUEST != DELETION EXECUTION')
  results.zeroDestruction = 'PASS'

  // ---------------------------------------------------------------------------
  // 4. DUPLICATE REQUEST PROTECTION (Section 7)
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 4: Validating Duplicate In-Flight Protection ---')
  const dupResult = await createDataSubjectRequest({
    accountUserId: SYNTHETIC_ADVERTISER_ACCOUNT_ID,
    requestType: 'DELETION',
    details: { reason: 'Duplicate attempt' }
  })

  console.log(`✓ Duplicate attempt result: success=${dupResult.success}, code=${dupResult.code}`)
  if (dupResult.success || dupResult.code !== 'DUPLICATE_ACTIVE_REQUEST') {
    throw new Error('Duplicate request was not blocked with DUPLICATE_ACTIVE_REQUEST!')
  }
  results.duplicateProtection = 'PASS'

  // ---------------------------------------------------------------------------
  // 5. REQUEST CANCELLATION (Section 8)
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 5: Validating Request Cancellation ---')
  const { cancelAccountDataSubjectRequest } = await import('../modules/privacy/dal.ts')
  const cancelResult = await cancelAccountDataSubjectRequest(SYNTHETIC_ADVERTISER_ACCOUNT_ID, delResult.request.id)

  if (!cancelResult.success) {
    throw new Error(`Cancellation failed: ${cancelResult.error}`)
  }

  const { data: reqAfterCancel } = await supabase.from('data_subject_requests').select('*').eq('id', delResult.request.id).single()
  const cancelEvents = await getAccountDsrEventsSafe(SYNTHETIC_ADVERTISER_ACCOUNT_ID, delResult.request.id)
  const lastEvent = cancelEvents[cancelEvents.length - 1]

  console.log(`✓ Status after cancel: ${reqAfterCancel.status}, cancelledAt=${reqAfterCancel.cancelled_at}`)
  console.log(`✓ Last event: ${lastEvent?.eventType}, actorRole=${lastEvent?.actorRole}`)

  if (reqAfterCancel.status !== 'CANCELLED' || lastEvent?.eventType !== 'REQUEST_CANCELLED') {
    throw new Error('Request was not properly marked CANCELLED or missing REQUEST_CANCELLED event!')
  }

  // Attempt to cancel again (now in terminal status)
  const secondCancel = await cancelAccountDataSubjectRequest(SYNTHETIC_ADVERTISER_ACCOUNT_ID, delResult.request.id)
  if (secondCancel.success || secondCancel.code !== 'INVALID_STATUS') {
    throw new Error('Terminal status request was allowed to be cancelled again!')
  }
  console.log('✓ Terminal status cancellation safely rejected with INVALID_STATUS')
  results.cancellation = 'PASS'

  // ---------------------------------------------------------------------------
  // 6. SYNTHETIC CLIENT & DATA ISOLATION (Section 9)
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 6: Validating Synthetic Client Summary & Request ---')
  const { getAccountDataSummary } = await import('../modules/privacy/dal.ts')
  const clientSummary = await getAccountDataSummary(SYNTHETIC_CLIENT_ACCOUNT_ID)

  console.log(`✓ Client summary: role=${clientSummary.role}, membership=${clientSummary.clientSummary?.membershipType}`)
  if (clientSummary.role !== 'CLIENT' || clientSummary.advertiserSummary !== null) {
    throw new Error('Client summary exposed advertiser data or wrong role!')
  }
  console.log('✓ Advertiser-only categories strictly absent from Client summary')

  // Clean up any old active requests for client test
  await supabase.from('data_subject_requests')
    .update({ status: 'CANCELLED' })
    .eq('requester_account_user_id', SYNTHETIC_CLIENT_ACCOUNT_ID)
    .in('status', ['RECEIVED', 'IN_REVIEW', 'PROCESSING'])

  const clientDsr = await createDataSubjectRequest({

    accountUserId: SYNTHETIC_CLIENT_ACCOUNT_ID,
    requestType: 'ACCESS',
    details: { reason: 'Client self-service access' }
  })
  if (!clientDsr.success || !clientDsr.request) {
    throw new Error(`Client DSR failed: ${clientDsr.error}`)
  }
  console.log(`✓ Client ACCESS request registered: ID=${clientDsr.request.id}`)
  results.clientSelfService = 'PASS'

  // ---------------------------------------------------------------------------
  // 7. CROSS-ACCOUNT ISOLATION (Section 10)
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 7: Validating Cross-Account Isolation ---')
  // Client tries to read Advertiser's request events
  const crossEvents1 = await getAccountDsrEventsSafe(SYNTHETIC_CLIENT_ACCOUNT_ID, delResult.request.id)
  // Advertiser tries to read Client's request events
  const crossEvents2 = await getAccountDsrEventsSafe(SYNTHETIC_ADVERTISER_ACCOUNT_ID, clientDsr.request.id)

  // Client tries to cancel Advertiser's request
  const crossCancel1 = await cancelAccountDataSubjectRequest(SYNTHETIC_CLIENT_ACCOUNT_ID, delResult.request.id)
  // Advertiser tries to cancel Client's request
  const crossCancel2 = await cancelAccountDataSubjectRequest(SYNTHETIC_ADVERTISER_ACCOUNT_ID, clientDsr.request.id)

  console.log(`✓ Cross events access: Client->Adv=${crossEvents1}, Adv->Client=${crossEvents2}`)
  console.log(`✓ Cross cancel access: Client->Adv=${crossCancel1.code}, Adv->Client=${crossCancel2.code}`)

  if (crossEvents1 !== null || crossEvents2 !== null || crossCancel1.success || crossCancel2.success) {
    throw new Error('CRITICAL SECURITY VIOLATION: Cross-account data disclosure or cancellation allowed!')
  }
  console.log('✓ Cross-account isolation strictly enforced (FAIL-CLOSED)')
  results.crossAccountIsolation = 'PASS'

  // ---------------------------------------------------------------------------
  // 8. ADMIN INTEGRATION & SYNTHETIC DATA SEPARATION (Section 11)
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 8: Validating Admin Integration & Synthetic Separation ---')
  const { getPrivacyRequests, getPrivacyOperationsSummary } = await import('../modules/privacy/operations-dal.ts')

  // Operational summary WITHOUT synthetic
  const realSummary = await getPrivacyOperationsSummary({ includeSynthetic: false })
  // Operational summary WITH synthetic
  const allSummary = await getPrivacyOperationsSummary({ includeSynthetic: true })

  console.log(`✓ Requests count (exclude synthetic): ${realSummary.requests.total}`)
  console.log(`✓ Requests count (include synthetic): ${allSummary.requests.total}`)


  // Query requests with includeSynthetic = true
  const adminReqs = await getPrivacyRequests({ includeSynthetic: true, limit: 10 })
  const foundDel = adminReqs.items.find((r) => r.id === delResult.request.id)
  const foundClient = adminReqs.items.find((r) => r.id === clientDsr.request.id)

  console.log(`✓ Found synthetic deletion request in Admin: ${!!foundDel} (isSynthetic=${foundDel?.isSynthetic})`)
  console.log(`✓ Found synthetic client request in Admin: ${!!foundClient} (isSynthetic=${foundClient?.isSynthetic})`)

  if (!foundDel?.isSynthetic || !foundClient?.isSynthetic) {
    throw new Error('Synthetic requests not correctly flagged as isSynthetic in Admin operations!')
  }
  results.adminIntegration = 'PASS'

  console.log('\n===============================================================')
  console.log('ALL PHYSICAL CLOSURE GATE CHECKS PASSED!')
  console.log(JSON.stringify(results, null, 2))
  console.log('===============================================================')
}

run().catch((err) => {
  console.error('FATAL VALIDATION ERROR:', err)
  process.exit(1)
})
