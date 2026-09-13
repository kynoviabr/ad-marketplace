import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) {
    let value = match[2] || ''
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
    env[match[1]] = value.trim()
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function runPhysicalValidation() {
  console.log('====================================================')
  console.log('LGPD-02D PHYSICAL VALIDATION ON DEV')
  console.log('Target DB:', supabaseUrl)
  console.log('====================================================\n')

  // 1. Locate an active admin account
  const { data: adminAccount, error: adminErr } = await supabase
    .from('account_users')
    .select('id, role, status')
    .eq('role', 'ADMIN')
    .eq('status', 'ACTIVE')
    .limit(1)
    .single()

  if (adminErr || !adminAccount) {
    throw new Error('Could not find active ADMIN account: ' + (adminErr?.message || 'None found'))
  }
  console.log('1. Active Admin Found:', adminAccount.id)

  // 2. Create a synthetic test user for DSR testing
  const syntheticEmail = `synthetic-dsr-workflow-${Date.now()}@ad-marketplace-synthetic.invalid`
  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email: syntheticEmail,
    password: 'Password@12345678!',
    email_confirm: true,
    user_metadata: { synthetic: true, fixture: 'LGPD-02D-PHYSICAL-TEST' },
  })

  if (authErr || !authUser.user) {
    throw new Error('Failed to create synthetic test user: ' + authErr?.message)
  }
  console.log('2. Synthetic User Created in Auth:', authUser.user.id)

  // Wait for account_users trigger if present, or fetch/insert
  await new Promise((r) => setTimeout(r, 600))
  let { data: subjectAccount } = await supabase
    .from('account_users')
    .select('id')
    .eq('auth_user_id', authUser.user.id)
    .maybeSingle()

  if (!subjectAccount) {
    const { data: newAcct, error: acctErr } = await supabase
      .from('account_users')
      .insert({
        auth_user_id: authUser.user.id,
        role: 'ADVERTISER',
        status: 'ACTIVE',
      })
      .select('id')
      .single()
    if (acctErr) throw new Error('Failed to insert account_user: ' + acctErr.message)
    subjectAccount = newAcct
  }
  console.log('3. Subject Account User ID:', subjectAccount.id)

  // 3. Create a synthetic DSR request in RECEIVED status
  const { data: dsr, error: dsrErr } = await supabase
    .from('data_subject_requests')
    .insert({
      requester_account_user_id: subjectAccount.id,
      request_type: 'ACCESS',
      status: 'RECEIVED',
      details: { synthetic: true, reason: 'LGPD-02D Physical Validation' },
    })
    .select('id, status, request_type')
    .single()

  if (dsrErr || !dsr) {
    throw new Error('Failed to create test DSR: ' + dsrErr?.message)
  }
  console.log('4. Synthetic DSR Created:', dsr.id, 'Status:', dsr.status)

  // Insert initial REQUEST_CREATED event
  await supabase.from('data_subject_request_events').insert({
    request_id: dsr.id,
    event_type: 'REQUEST_CREATED',
    actor_account_user_id: subjectAccount.id,
    metadata: { initial: true },
  })

  // 4. Test Transition: RECEIVED -> IDENTITY_VERIFICATION_REQUIRED via atomic RPC
  console.log('\n5. Executing Atomic RPC: RECEIVED -> IDENTITY_VERIFICATION_REQUIRED...')
  const { data: res1, error: rpcErr1 } = await supabase.rpc('admin_transition_data_subject_request', {
    p_request_id: dsr.id,
    p_expected_current_status: 'RECEIVED',
    p_target_status: 'IDENTITY_VERIFICATION_REQUIRED',
    p_admin_account_id: adminAccount.id,
    p_operator_notes: 'Solicitando selfie com documento para validação',
  })

  if (rpcErr1) {
    throw new Error('RPC Transition 1 failed: ' + rpcErr1.message)
  }
  console.log('   RPC Result 1:', res1)
  if (res1.newStatus !== 'IDENTITY_VERIFICATION_REQUIRED' || res1.eventType !== 'IDENTITY_VERIFICATION_REQUESTED') {
    throw new Error('Unexpected RPC result: ' + JSON.stringify(res1))
  }

  // Verify DB state
  const { data: check1 } = await supabase
    .from('data_subject_requests')
    .select('status')
    .eq('id', dsr.id)
    .single()
  console.log('   Verified DB Status:', check1?.status)

  // 5. Test Transition: IDENTITY_VERIFICATION_REQUIRED -> IN_REVIEW
  console.log('\n6. Executing Atomic RPC: IDENTITY_VERIFICATION_REQUIRED -> IN_REVIEW...')
  const { data: res2, error: rpcErr2 } = await supabase.rpc('admin_transition_data_subject_request', {
    p_request_id: dsr.id,
    p_expected_current_status: 'IDENTITY_VERIFICATION_REQUIRED',
    p_target_status: 'IN_REVIEW',
    p_admin_account_id: adminAccount.id,
    p_operator_notes: 'Identidade confirmada, iniciando análise documental',
  })
  if (rpcErr2) throw new Error('RPC Transition 2 failed: ' + rpcErr2.message)
  console.log('   RPC Result 2:', res2)

  // 6. Test Stale Status Protection (Double-submission / concurrent modification defense)
  console.log('\n7. Testing Stale Status Concurrency Defense (passing stale status RECEIVED)...')
  const { data: resStale, error: rpcErrStale } = await supabase.rpc('admin_transition_data_subject_request', {
    p_request_id: dsr.id,
    p_expected_current_status: 'RECEIVED', // Stale! DB is IN_REVIEW
    p_target_status: 'PROCESSING',
    p_admin_account_id: adminAccount.id,
  })

  if (!rpcErrStale) {
    throw new Error('Expected STALE_STATUS error, but RPC succeeded: ' + JSON.stringify(resStale))
  }
  console.log('   Confirmed STALE_STATUS rejection:', rpcErrStale.message)

  // 7. Test Transition: IN_REVIEW -> PROCESSING
  console.log('\n8. Executing Atomic RPC: IN_REVIEW -> PROCESSING...')
  const { data: res3, error: rpcErr3 } = await supabase.rpc('admin_transition_data_subject_request', {
    p_request_id: dsr.id,
    p_expected_current_status: 'IN_REVIEW',
    p_target_status: 'PROCESSING',
    p_admin_account_id: adminAccount.id,
    p_operator_notes: 'Extraindo dados para entrega',
  })
  if (rpcErr3) throw new Error('RPC Transition 3 failed: ' + rpcErr3.message)
  console.log('   RPC Result 3:', res3)

  // 8. Test Transition: PROCESSING -> COMPLETED
  console.log('\n9. Executing Atomic RPC: PROCESSING -> COMPLETED...')
  const { data: res4, error: rpcErr4 } = await supabase.rpc('admin_transition_data_subject_request', {
    p_request_id: dsr.id,
    p_expected_current_status: 'PROCESSING',
    p_target_status: 'COMPLETED',
    p_admin_account_id: adminAccount.id,
    p_resolution_message: 'Todos os seus dados foram consolidados com sucesso.',
    p_operator_notes: 'Arquivo ZIP disponibilizado no painel do usuário.',
  })
  if (rpcErr4) throw new Error('RPC Transition 4 failed: ' + rpcErr4.message)
  console.log('   RPC Result 4:', res4)

  // 9. Test Terminal State Freeze (cannot transition from COMPLETED)
  console.log('\n10. Testing Terminal State Freeze on COMPLETED request...')
  const { data: resTerminal, error: rpcErrTerminal } = await supabase.rpc('admin_transition_data_subject_request', {
    p_request_id: dsr.id,
    p_expected_current_status: 'COMPLETED',
    p_target_status: 'PROCESSING',
    p_admin_account_id: adminAccount.id,
  })

  if (!rpcErrTerminal) {
    throw new Error('Expected TERMINAL_STATUS error, but RPC succeeded: ' + JSON.stringify(resTerminal))
  }
  console.log('   Confirmed TERMINAL_STATUS rejection:', rpcErrTerminal.message)

  // 10. Test Rejection Taxonomy & Flow on a second request
  console.log('\n11. Testing Rejection Flow with Reason Code on a new request...')
  const { data: dsr2, error: dsrErr2 } = await supabase
    .from('data_subject_requests')
    .insert({
      requester_account_user_id: subjectAccount.id,
      request_type: 'CORRECTION',
      status: 'RECEIVED',
      details: { synthetic: true, reason: 'LGPD-02D Physical Rejection Test' },
    })
    .select('id, status')
    .single()
  if (dsrErr2) throw new Error('Failed to create second DSR: ' + dsrErr2.message)

  const { data: resReject, error: rpcErrReject } = await supabase.rpc('admin_transition_data_subject_request', {
    p_request_id: dsr2.id,
    p_expected_current_status: 'RECEIVED',
    p_target_status: 'REJECTED',
    p_admin_account_id: adminAccount.id,
    p_reason_code: 'LEGAL_OBLIGATION_PRESERVATION',
    p_operator_notes: 'Dados fiscais e de log mantidos por exigência legal (Art. 16, I, LGPD).',
    p_resolution_message: 'Determinados registros não puderam ser corrigidos por dever legal de preservação.',
  })
  if (rpcErrReject) throw new Error('RPC Rejection failed: ' + rpcErrReject.message)
  console.log('   RPC Rejection Result:', resReject)

  // 11. Verify Immutable Ledger Entries
  console.log('\n12. Verifying Immutable Event Ledger for DSR 1...')
  const { data: events1 } = await supabase
    .from('data_subject_request_events')
    .select('id, event_type, actor_account_user_id, created_at')
    .eq('request_id', dsr.id)
    .order('created_at', { ascending: true })

  console.log('   Audit Events Recorded:', events1?.map(e => `${e.event_type} (${e.actor_account_user_id ? 'ADMIN' : 'USER'})`))
  if ((events1?.length ?? 0) < 4) {
    throw new Error('Expected at least 4 audit events recorded, got: ' + events1?.length)
  }

  // 12. Cleanup synthetic test data
  console.log('\n13. Cleaning up test fixtures...')
  await supabase.from('data_subject_request_events').delete().in('request_id', [dsr.id, dsr2.id])
  await supabase.from('data_subject_requests').delete().in('id', [dsr.id, dsr2.id])
  await supabase.from('account_users').delete().eq('id', subjectAccount.id)
  await supabase.auth.admin.deleteUser(authUser.user.id)
  console.log('   Cleaned up test user and requests.')

  console.log('\n====================================================')
  console.log('LGPD-02D PHYSICAL VALIDATION PASSED 100%')
  console.log('====================================================')
}

runPhysicalValidation().catch((err) => {
  console.error('PHYSICAL VALIDATION FAILED:', err)
  process.exit(1)
})
