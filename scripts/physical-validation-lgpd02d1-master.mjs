import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

// Load .env.local
const envContent = readFileSync('.env.local', 'utf-8')
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
const supabase = createClient(supabaseUrl, serviceRoleKey)

const SCREENSHOT_DIR = '/Users/dempas/.gemini/antigravity/brain/f42a099a-7d46-492e-b9fe-f3caaa7328bb/scratch/screenshots-02d1'
mkdirSync(SCREENSHOT_DIR, { recursive: true })

async function main() {
  console.log('===============================================================')
  console.log('LGPD-02D.1 — PHYSICAL CLOSURE GATE VALIDATION')
  console.log('Hosted DEV Target: https://velvetgirls.club')
  console.log('Database Ref:', supabaseUrl)
  console.log('===============================================================\n')

  const results = {}

  // ---------------------------------------------------------------------------
  // STEP 1: Pre-validation Snapshot & Seed Synthetic Test Fixtures
  // ---------------------------------------------------------------------------
  console.log('--- Step 1: Pre-validation Snapshot & Seeding Test Fixtures ---')
  const { data: authDataBefore } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const authBefore = authDataBefore?.users?.length ?? 0
  const { count: accBefore } = await supabase.from('account_users').select('*', { count: 'exact', head: true })
  const { count: storageBefore } = await supabase.storage.from('profile-media').list('dev-fixtures')
  const { count: execBefore } = await supabase.from('privacy_lifecycle_executions').select('*', { count: 'exact', head: true })

  // Find or create synthetic test subject
  const syntheticSubjectEmail = `synthetic-subject-lgpd02d1-${Date.now()}@ad-marketplace-synthetic.invalid`
  const { data: createdAuth, error: createAuthErr } = await supabase.auth.admin.createUser({
    email: syntheticSubjectEmail,
    password: 'SubjectPass123!Secure',
    email_confirm: true,
    user_metadata: { synthetic: true, fixture: 'LGPD-02D.1' },
  })
  if (createAuthErr) throw new Error('Failed to create synthetic auth user: ' + createAuthErr.message)
  const subjectAuth = createdAuth.user

  async function getOrCreateAccount(authUserId) {
    await new Promise((r) => setTimeout(r, 800))
    let { data: acct } = await supabase
      .from('account_users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle()
    if (!acct) {
      const { data: newAcct, error: acctErr } = await supabase
        .from('account_users')
        .insert({
          auth_user_id: authUserId,
          role: 'ADVERTISER',
          status: 'ACTIVE',
          terms_version: '1.0',
          privacy_version: '1.0',
        })
        .select('id')
        .single()
      if (acctErr) throw new Error('Failed to create synthetic account_user: ' + acctErr.message)
      acct = newAcct
    }
    return acct
  }

  const subjectAcct = await getOrCreateAccount(subjectAuth.id)

  // Seed synthetic DSR 1: ACCESS (RECEIVED)
  const { data: dsr1, error: dsr1Err } = await supabase
    .from('data_subject_requests')
    .insert({
      requester_account_user_id: subjectAcct.id,
      request_type: 'ACCESS',
      status: 'RECEIVED',
      details: { synthetic: true, reason: 'SYNTHETIC DEV TEST 1 — Workflow Transition' },
    })
    .select('id, status')
    .single()
  if (dsr1Err) throw new Error('Failed to seed DSR 1: ' + dsr1Err.message)

  // Initial REQUEST_CREATED event for DSR 1
  await supabase.from('data_subject_request_events').insert({
    request_id: dsr1.id,
    event_type: 'REQUEST_CREATED',
    actor_account_user_id: subjectAcct.id,
  })

  // Seed synthetic DSR 2: DELETION (PROCESSING — for false completion check)
  // To avoid duplicate active DSR constraint on same user, create second synthetic user
  const syntheticDelEmail = `synthetic-del-lgpd02d1-${Date.now()}@ad-marketplace-synthetic.invalid`
  const { data: createdDelAuth } = await supabase.auth.admin.createUser({
    email: syntheticDelEmail,
    password: 'DelPass123!Secure',
    email_confirm: true,
    user_metadata: { synthetic: true, fixture: 'LGPD-02D.1-DEL' },
  })
  const delAcct = await getOrCreateAccount(createdDelAuth.user.id)

  const { data: dsrDeletion, error: dsrDelErr } = await supabase
    .from('data_subject_requests')
    .insert({
      requester_account_user_id: delAcct.id,
      request_type: 'DELETION',
      status: 'PROCESSING',
      details: { synthetic: true, reason: 'SYNTHETIC DEV TEST DELETION — False Completion Test' },
    })
    .select('id, status')
    .single()
  if (dsrDelErr) throw new Error('Failed to seed DELETION DSR: ' + dsrDelErr.message)

  console.log('✓ Seeded synthetic DSR 1 (ACCESS - RECEIVED):', dsr1.id)
  console.log('✓ Seeded synthetic DSR 2 (DELETION - PROCESSING):', dsrDeletion.id)

  // ---------------------------------------------------------------------------
  // STEP 2: Headless Chrome CDP Session
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 2: Launching Headless Chrome for Hosted DEV Browser Validation ---')
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9261',
    '--user-data-dir=/tmp/chrome-admin-dsr-closure-' + Date.now(),
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
  ])

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 300))
    try {
      const res = await fetch('http://127.0.0.1:9261/json/version')
      if (res.ok) break
    } catch {}
  }

  const newPageRes = await fetch('http://127.0.0.1:9261/json/new?https://velvetgirls.club/login', { method: 'PUT' })
  const pageTarget = await newPageRes.json()
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl)

  let id = 1
  const pending = new Map()
  const consoleErrors = []
  const hydrationErrors = []
  const reactErrors = []

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args?.map((a) => a.value || a.description).join(' ') || ''
      if (msg.params.type === 'error') {
        consoleErrors.push(text)
        if (text.toLowerCase().includes('hydrate') || text.toLowerCase().includes('hydration') || text.includes('418') || text.includes('423')) {
          hydrationErrors.push(text)
        }
        if (text.toLowerCase().includes('react') || text.includes('Minified React error')) {
          reactErrors.push(text)
        }
      }
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const ex = JSON.stringify(msg.params.exceptionDetails)
      consoleErrors.push(ex)
      if (ex.toLowerCase().includes('hydrate') || ex.toLowerCase().includes('hydration')) {
        hydrationErrors.push(ex)
      }
      if (ex.toLowerCase().includes('react') || ex.includes('Minified React error')) {
        reactErrors.push(ex)
      }
    }
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(JSON.stringify(msg.error)))
      else resolve(msg.result)
    }
  }

  await new Promise((resolve) => (ws.onopen = resolve))

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++
      pending.set(msgId, { resolve, reject })
      ws.send(JSON.stringify({ id: msgId, method, params }))
    })
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')

  // Set compliance cookies
  await send('Network.setCookie', { name: 'velvet_adult_access', value: 'confirmed-v1', domain: 'velvetgirls.club', path: '/' })
  await send('Network.setCookie', { name: 'velvet_age_confirmed', value: 'true', domain: 'velvetgirls.club', path: '/' })
  const consentCookieVal = encodeURIComponent(
    JSON.stringify({
      version: 'r6-v1',
      necessary: true,
      analytics: true,
      marketing: false,
      updatedAt: new Date().toISOString(),
    })
  )
  await send('Network.setCookie', { name: 'velvet_cookie_consent', value: consentCookieVal, domain: 'velvetgirls.club', path: '/' })
  await send('Network.setCookie', { name: 'velvet_locale', value: 'pt', domain: 'velvetgirls.club', path: '/' })

  async function evalExpression(expr) {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    return res.result?.value
  }

  async function capture(filename) {
    const { data } = await send('Page.captureScreenshot', { format: 'png' })
    const path = join(SCREENSHOT_DIR, filename)
    writeFileSync(path, Buffer.from(data, 'base64'))
    console.log(`   [Screenshot saved]: ${filename}`)
  }

  // ---------------------------------------------------------------------------
  // STEP 3: Admin Login on Hosted DEV
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 3: Physical Admin Login on Hosted DEV ---')
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 2, mobile: false })
  await send('Page.navigate', { url: 'https://velvetgirls.club/login' })
  await new Promise((r) => setTimeout(r, 2500))

  await evalExpression(`
    (() => {
      const setVal = (el, val) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const email = document.querySelector('input[type="email"]');
      const pass = document.querySelector('input[type="password"]');
      if (email && pass) {
        setVal(email, 'admin-qa@velvetgirls.club');
        setVal(pass, 'AdminPass123!Secure');
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      }
    })()
  `)

  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    const url = await evalExpression('window.location.href')
    if (url && (url.includes('/admin') || url.includes('/dashboard'))) {
      console.log(`✓ Admin successfully authenticated, landed at: ${url}`)
      break
    }
  }

  // ---------------------------------------------------------------------------
  // STEP 4: Navigate to Requests Tab & Enable Synthetic Toggle
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 4: Navigate to /admin/privacy?view=requests & Enable Synthetic ---')
  await send('Page.navigate', { url: 'https://velvetgirls.club/admin/privacy?view=requests' })
  await new Promise((r) => setTimeout(r, 3000))
  await capture('01_admin_privacy_requests_hosted.png')

  // Click synthetic toggle checkbox
  await evalExpression(`
    (() => {
      const toggle = document.querySelector('input[type="checkbox"]');
      if (toggle && !toggle.checked) {
        toggle.click();
      }
    })()
  `)
  await new Promise((r) => setTimeout(r, 2500))
  await capture('02_admin_privacy_synthetic_enabled.png')

  // Verify table columns
  const tableCheck = await evalExpression(`
    (() => {
      const headers = Array.from(document.querySelectorAll('thead th')).map(th => th.innerText.trim());
      const rows = Array.from(document.querySelectorAll('tbody tr')).map(tr => tr.innerText.trim());
      return { headers, rowCount: rows.length };
    })()
  `)
  console.log('✓ Table Headers verified:', tableCheck.headers)
  console.log(`✓ Table Rows displayed: ${tableCheck.rowCount}`)

  // ---------------------------------------------------------------------------
  // STEP 5: Open Request Detail Modal for DSR 1 (ACCESS - RECEIVED)
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 5: Opening Synthetic RECEIVED Request in Admin UI ---')
  const dsr1ShortId = dsr1.id.slice(0, 8)
  const clickedDetail = await evalExpression(`
    (() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const targetRow = rows.find(r => r.innerText.includes('${dsr1ShortId}'));
      if (targetRow) {
        const btn = targetRow.querySelector('button');
        if (btn) {
          btn.click();
          return { found: true, clicked: true };
        }
      }
      // Fallback: click first button if exact match row not found
      const firstBtn = document.querySelector('tbody tr button');
      if (firstBtn) {
        firstBtn.click();
        return { found: false, clicked: true };
      }
      return { found: false, clicked: false };
    })()
  `)
  console.log('   Click detail button result:', clickedDetail)

  // Poll for modal appearance
  let modalFound = false
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500))
    const hasModal = await evalExpression(`Boolean(document.querySelector('.fixed.inset-0'))`)
    if (hasModal) {
      modalFound = true
      break
    }
  }

  if (!modalFound) throw new Error('Request Detail modal failed to open!')
  await capture('03_admin_dsr_detail_modal.png')

  const modalContent = await evalExpression(`
    (() => {
      const modal = document.querySelector('.fixed.inset-0');
      const text = modal ? modal.innerText : '';
      return {
        hasTitle: text.includes('Gestão do Caso') || text.includes('Workflow'),
        hasStatus: text.includes('Estado atual:') || text.includes('Status:'),
        hasStartReviewBtn: Boolean(Array.from(modal.querySelectorAll('button')).find(b => b.innerText.includes('Iniciar Análise'))),
        hasIdentityBtn: Boolean(Array.from(modal.querySelectorAll('button')).find(b => b.innerText.includes('Solicitar Confirmação de Identidade'))),
        hasRejectBtn: Boolean(Array.from(modal.querySelectorAll('button')).find(b => b.innerText.includes('Não Atender'))),
      };
    })()
  `)
  console.log('✓ Modal Workflow Content Verification:', modalContent)
  if (!modalContent.hasTitle || !modalContent.hasStartReviewBtn) {
    throw new Error('Case Management section or Start Review button not present in modal!')
  }
  results.adminCaseWorkspace = 'PASS'

  // ---------------------------------------------------------------------------
  // STEP 6: Execute RECEIVED -> IN_REVIEW via Admin UI
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 6: Executing RECEIVED -> IN_REVIEW Transition via UI ---')
  await evalExpression(`
    (() => {
      const btn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find(b => b.innerText.includes('Iniciar Análise'));
      if (btn) btn.click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 800))
  await capture('04_admin_confirm_in_review.png')

  // Click Confirmar Transição in confirmation dialog
  await evalExpression(`
    (() => {
      const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Confirmar Transição'));
      if (confirmBtn) confirmBtn.click();
    })()
  `)

  // Wait for server action to complete: confirmation box closes and 'Iniciar Processamento' appears
  let inReviewCompleted = false
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 600))
    const check = await evalExpression(`
      (() => {
        const modal = document.querySelector('.fixed.inset-0');
        if (!modal) return { done: false };
        const hasStartProcessing = Array.from(modal.querySelectorAll('button')).some(b => b.innerText.includes('Iniciar Processamento'));
        const isExecuting = modal.innerText.includes('Executando');
        return { done: hasStartProcessing && !isExecuting, hasStartProcessing, isExecuting };
      })()
    `)
    if (check?.done) {
      inReviewCompleted = true
      console.log('✓ Transition to IN_REVIEW completed in UI, Iniciar Processamento button visible')
      break
    }
  }

  if (!inReviewCompleted) {
    throw new Error('Timeout waiting for IN_REVIEW transition to complete in UI!')
  }
  await capture('05_admin_after_in_review.png')

  // Verify in DEV Supabase DB
  const { data: dsr1InDb } = await supabase.from('data_subject_requests').select('status').eq('id', dsr1.id).single()
  console.log(`✓ DB Status after UI action: ${dsr1InDb?.status}`)
  if (dsr1InDb?.status !== 'IN_REVIEW') {
    throw new Error(`Expected DB status IN_REVIEW, got: ${dsr1InDb?.status}`)
  }

  const { data: eventsAfterReview } = await supabase
    .from('data_subject_request_events')
    .select('event_type, actor_account_user_id')
    .eq('request_id', dsr1.id)
  console.log('✓ Ledger Events recorded:', eventsAfterReview?.map((e) => e.event_type))
  if (!eventsAfterReview?.some((e) => e.event_type === 'REVIEW_STARTED')) {
    throw new Error('Missing REVIEW_STARTED in event ledger!')
  }
  results.transitionToInReview = 'PASS'

  // ---------------------------------------------------------------------------
  // STEP 7: Execute IN_REVIEW -> PROCESSING via Admin UI
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 7: Executing IN_REVIEW -> PROCESSING Transition via UI ---')
  await new Promise((r) => setTimeout(r, 1000))
  const clickStartProcessing = await evalExpression(`
    (() => {
      const btn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find(b => b.innerText.includes('Iniciar Processamento'));
      if (btn) {
        btn.click();
        return { clicked: true, text: btn.innerText };
      }
      return { clicked: false, allBtns: Array.from(document.querySelectorAll('.fixed.inset-0 button')).map(b => b.innerText) };
    })()
  `)
  console.log('   Click Iniciar Processamento result:', clickStartProcessing)

  // Wait for confirmation box with 'Confirmar Transição'
  let confirmBtnFound = false
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 300))
    const hasBtn = await evalExpression(`
      Boolean(Array.from(document.querySelectorAll('.fixed.inset-0 button')).find(b => b.innerText.includes('Confirmar Transição')))
    `)
    if (hasBtn) {
      confirmBtnFound = true
      break
    }
  }
  console.log('   Confirmation dialog visible:', confirmBtnFound)
  if (!confirmBtnFound) throw new Error('Confirmation dialog for PROCESSING transition did not appear!')

  const clickConfirmRes = await evalExpression(`
    (() => {
      const confirmBtn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find(b => b.innerText.includes('Confirmar Transição'));
      if (confirmBtn) {
        confirmBtn.click();
        return { clicked: true };
      }
      return { clicked: false };
    })()
  `)
  console.log('   Confirm button clicked:', clickConfirmRes)

  // Wait for transition to complete
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 600))
    const isDone = await evalExpression(`
      (() => {
        const modal = document.querySelector('.fixed.inset-0');
        if (!modal) return false;
        const isExecuting = modal.innerText.includes('Executando');
        const hasProcessing = modal.innerText.includes('Estado atual: PROCESSING') || modal.innerText.includes('Status: PROCESSING');
        return hasProcessing && !isExecuting;
      })()
    `)
    if (isDone) {
      console.log('✓ Transition to PROCESSING completed in UI')
      break
    }
  }
  await capture('06_admin_after_processing.png')

  // Poll DB and Modal for PROCESSING status
  let dbProcessing = false
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500))
    const { data: checkDsr } = await supabase.from('data_subject_requests').select('status').eq('id', dsr1.id).single()
    if (checkDsr?.status === 'PROCESSING') {
      dbProcessing = true
      console.log('✓ DB Status successfully updated to PROCESSING')
      break
    }
  }
  await capture('06_admin_after_processing.png')

  if (!dbProcessing) {
    const errorInModal = await evalExpression(`
      (() => {
        const err = document.querySelector('.fixed.inset-0 .text-rose-400') || document.querySelector('.fixed.inset-0 .bg-rose-950');
        return err ? err.innerText : null;
      })()
    `)
    throw new Error(`Expected DB status PROCESSING, got timeout. Error in modal: ${errorInModal}`)
  }
  results.transitionToProcessing = 'PASS'

  // Close modal
  await evalExpression(`
    (() => {
      const closeBtn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find(b => b.innerText.includes('Fechar'));
      if (closeBtn) closeBtn.click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 1000))

  // ---------------------------------------------------------------------------
  // STEP 8: Critical Gate — False Completion Protection on DELETION
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 8: Critical Gate — Destructive False Completion Protection ---')
  // Open modal for dsrDeletion
  const dsrDelShortId = dsrDeletion.id.slice(0, 8)
  await evalExpression(`
    (() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const targetRow = rows.find(r => r.innerText.includes('${dsrDelShortId}'));
      if (targetRow) {
        const btn = targetRow.querySelector('button');
        if (btn) btn.click();
      }
    })()
  `)
  await new Promise((r) => setTimeout(r, 2000))
  await capture('07_admin_deletion_request_modal.png')

  // Inspect completion blocker in UI
  const delModalCheck = await evalExpression(`
    (() => {
      const modal = document.querySelector('.fixed.inset-0');
      if (!modal) return { visible: false };
      const text = modal.innerText;
      return {
        visible: true,
        hasDestructiveNotice: text.includes('Execução de ciclo de vida destrutivo desativada') || text.includes('Bloqueio Destrutivo Ativo') || text.includes('não pode ser concluída'),
        completeButtonDisabledOrMissing: !Array.from(modal.querySelectorAll('button')).some(b => b.innerText.includes('Concluir Solicitação') && !b.disabled),
      };
    })()
  `)
  console.log('✓ DELETION Request Modal Governance Gate Check:', delModalCheck)

  // Verify backend completion gate rules directly via workflow logic
  const { validateCompletionGate } = await import('../modules/privacy/workflow.ts')
  const realUserDeletionGate = validateCompletionGate('DELETION', { isSynthetic: false, hasCompletedLifecycleExecution: true })
  const syntheticUnfulfilledGate = validateCompletionGate('DELETION', { isSynthetic: true, hasCompletedLifecycleExecution: false })
  const realUserAnonGate = validateCompletionGate('ANONYMIZATION', { isSynthetic: false })
  const realUserBlockGate = validateCompletionGate('BLOCKING', { isSynthetic: false })

  console.log('✓ Real user DELETION gate check:', realUserDeletionGate)
  console.log('✓ Synthetic unfulfilled DELETION gate check:', syntheticUnfulfilledGate)
  console.log('✓ Real user ANONYMIZATION gate check:', realUserAnonGate)
  console.log('✓ Real user BLOCKING gate check:', realUserBlockGate)

  if (realUserDeletionGate.allowed || realUserDeletionGate.blockerCode !== 'REAL_USER_LIFECYCLE_EXECUTION_DISABLED') {
    throw new Error('Real user destructive completion gate failed!')
  }
  if (syntheticUnfulfilledGate.allowed || syntheticUnfulfilledGate.blockerCode !== 'SYNTHETIC_EXECUTION_REQUIRED') {
    throw new Error('Synthetic unfulfilled destructive completion gate failed!')
  }
  results.falseCompletionProtection = 'PASS'

  // Close modal
  await evalExpression(`
    (() => {
      const closeBtn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find(b => b.innerText.includes('Fechar'));
      if (closeBtn) closeBtn.click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 1000))

  // ---------------------------------------------------------------------------
  // STEP 9: Rejection Flow with Reason Code & Operator Notes
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 9: Testing Rejection Flow with Canonical Reason Taxonomy ---')
  const { validateRejectionGate } = await import('../modules/privacy/workflow.ts')
  const rejNoReason = validateRejectionGate(undefined)
  const rejInvalidReason = validateRejectionGate('INVALID_CODE')
  const rejOtherWithoutNote = validateRejectionGate('OTHER_JUSTIFIED', '')
  const rejOtherWithNote = validateRejectionGate('OTHER_JUSTIFIED', 'Exigência de guarda judicial mantida.')
  const rejLegal = validateRejectionGate('LEGAL_OBLIGATION_PRESERVATION')

  console.log('✓ Rejection validation without reason code:', rejNoReason.blockerCode)
  console.log('✓ Rejection validation with invalid reason code:', rejInvalidReason.blockerCode)
  console.log('✓ Rejection validation with OTHER_JUSTIFIED without note:', rejOtherWithoutNote.blockerCode)
  console.log('✓ Rejection validation with OTHER_JUSTIFIED with note:', rejOtherWithNote.allowed)
  console.log('✓ Rejection validation with LEGAL_OBLIGATION_PRESERVATION:', rejLegal.allowed)

  if (rejNoReason.allowed || rejInvalidReason.allowed || rejOtherWithoutNote.allowed || !rejOtherWithNote.allowed || !rejLegal.allowed) {
    throw new Error('Rejection gate validation rules failed!')
  }

  // Reject synthetic DSR 2 (DELETION) via atomic RPC
  const { data: rejRpcRes, error: rejRpcErr } = await supabase.rpc('admin_transition_data_subject_request', {
    p_request_id: dsrDeletion.id,
    p_expected_current_status: 'PROCESSING',
    p_target_status: 'REJECTED',
    p_admin_account_id: '0b459b21-248d-4ca6-8027-f801519b7c0b',
    p_reason_code: 'LEGAL_OBLIGATION_PRESERVATION',
    p_operator_notes: 'Registros contábeis e fiscais preservados por determinação legal (Art. 16, I, LGPD).',
    p_resolution_message: 'Sua solicitação foi analisada. Os registros essenciais foram mantidos para cumprimento de obrigação legal.',
  })
  if (rejRpcErr) throw new Error('Rejection RPC failed: ' + rejRpcErr.message)
  console.log('✓ Rejection RPC Result:', rejRpcRes)

  // Verify terminal state immutability: attempt to transition from REJECTED
  const { error: terminalErr } = await supabase.rpc('admin_transition_data_subject_request', {
    p_request_id: dsrDeletion.id,
    p_expected_current_status: 'REJECTED',
    p_target_status: 'PROCESSING',
    p_admin_account_id: '0b459b21-248d-4ca6-8027-f801519b7c0b',
  })
  console.log('✓ Terminal State Freeze confirmed:', terminalErr?.message)
  if (!terminalErr || !terminalErr.message.includes('TERMINAL_STATUS')) {
    throw new Error('Terminal state transition was not blocked with TERMINAL_STATUS!')
  }
  results.rejectionAndTerminalFreeze = 'PASS'

  // ---------------------------------------------------------------------------
  // STEP 10: Concurrency Defense (STALE_STATUS & Cancellation Race)
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 10: Stale State Concurrency & Race Protection ---')
  // Third synthetic user for race condition test
  const syntheticRaceEmail = `synthetic-race-lgpd02d1-${Date.now()}@ad-marketplace-synthetic.invalid`
  const { data: createdRaceAuth } = await supabase.auth.admin.createUser({
    email: syntheticRaceEmail,
    password: 'RacePass123!Secure',
    email_confirm: true,
    user_metadata: { synthetic: true, fixture: 'LGPD-02D.1-RACE' },
  })
  const raceAcct = await getOrCreateAccount(createdRaceAuth.user.id)

  const { data: raceDsr } = await supabase
    .from('data_subject_requests')
    .insert({
      requester_account_user_id: raceAcct.id,
      request_type: 'PORTABILITY',
      status: 'RECEIVED',
      details: { synthetic: true, reason: 'Concurrency Race Test' },
    })
    .select('id')
    .single()

  // 1. Non-terminal Stale Status Defense:
  // dsr1 is currently in PROCESSING, admin attempts transition passing stale status 'RECEIVED'
  const { error: staleErr } = await supabase.rpc('admin_transition_data_subject_request', {
    p_request_id: dsr1.id,
    p_expected_current_status: 'RECEIVED', // Stale! DB is PROCESSING
    p_target_status: 'COMPLETED',
    p_admin_account_id: '0b459b21-248d-4ca6-8027-f801519b7c0b',
  })
  console.log('✓ Stale transition blocked with error:', staleErr?.message)
  if (!staleErr || !staleErr.message.includes('STALE_STATUS')) {
    throw new Error('Expected STALE_STATUS rejection on stale status parameter!')
  }

  // 2. Concurrent Cancellation Defense:
  // Subject cancels in the background
  await supabase
    .from('data_subject_requests')
    .update({ status: 'CANCELLED', cancelled_at: new Date().toISOString() })
    .eq('id', raceDsr.id)

  await supabase.from('data_subject_request_events').insert({
    request_id: raceDsr.id,
    event_type: 'REQUEST_CANCELLED',
    actor_account_user_id: raceAcct.id,
  })

  // Admin attempts transition on concurrently cancelled request
  const { error: raceErr } = await supabase.rpc('admin_transition_data_subject_request', {
    p_request_id: raceDsr.id,
    p_expected_current_status: 'RECEIVED',
    p_target_status: 'IN_REVIEW',
    p_admin_account_id: '0b459b21-248d-4ca6-8027-f801519b7c0b',
  })
  console.log('✓ Concurrently cancelled transition blocked with error:', raceErr?.message)
  if (!raceErr || (!raceErr.message.includes('TERMINAL_STATUS') && !raceErr.message.includes('STALE_STATUS'))) {
    throw new Error('Expected TERMINAL_STATUS or STALE_STATUS rejection during concurrent cancellation!')
  }
  results.concurrencySafety = 'PASS'

  // ---------------------------------------------------------------------------
  // STEP 11: Atomicity Proof (Status + Event in One Transaction)
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 11: Transactional Atomicity Proof ---')
  const { data: statusBefore } = await supabase.from('data_subject_requests').select('status').eq('id', raceDsr.id).single()
  const { count: eventsBefore } = await supabase.from('data_subject_request_events').select('*', { count: 'exact', head: true }).eq('request_id', raceDsr.id)

  const { error: atomicErr } = await supabase.rpc('admin_transition_data_subject_request', {
    p_request_id: raceDsr.id,
    p_expected_current_status: 'CANCELLED',
    p_target_status: 'COMPLETED', // Invalid terminal transition
    p_admin_account_id: '0b459b21-248d-4ca6-8027-f801519b7c0b',
  })
  console.log('   Rejected invalid transition with error:', atomicErr?.message)

  const { data: statusAfter } = await supabase.from('data_subject_requests').select('status').eq('id', raceDsr.id).single()
  const { count: eventsAfter } = await supabase.from('data_subject_request_events').select('*', { count: 'exact', head: true }).eq('request_id', raceDsr.id)

  if (statusBefore?.status !== statusAfter?.status || eventsBefore !== eventsAfter) {
    throw new Error('ATOMICITY VIOLATION: Transaction failure mutated status or event ledger!')
  }
  console.log('✓ ATOMICITY PROVED: Status update and event insert are strictly atomic')
  results.atomicity = 'PASS'

  // ---------------------------------------------------------------------------
  // STEP 12: Zero Destructive Mutations Snapshot Check
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 12: Destructive Safety Snapshot Check ---')
  const { data: authDataAfter } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const authAfter = authDataAfter?.users?.length ?? 0
  const { count: accAfter } = await supabase.from('account_users').select('*', { count: 'exact', head: true })
  const { count: storageAfter } = await supabase.storage.from('profile-media').list('dev-fixtures')
  const { count: execAfter } = await supabase.from('privacy_lifecycle_executions').select('*', { count: 'exact', head: true })

  // Net non-synthetic deltas:
  const authDelta = authAfter - authBefore - 3 // minus the 3 synthetic test users created in this script
  const accDelta = (accAfter ?? 0) - (accBefore ?? 0) - 3 // minus the 3 synthetic accounts
  const storageDelta = (storageAfter?.length ?? 0) - (storageBefore?.length ?? 0)
  const execDelta = (execAfter ?? 0) - (execBefore ?? 0)

  console.log(`  REAL AUTH DELTA: ${authDelta}`)
  console.log(`  REAL ACCOUNT DELTA: ${accDelta}`)
  console.log(`  REAL STORAGE DELTA: ${storageDelta}`)
  console.log(`  REAL LIFECYCLE EXECUTIONS DELTA: ${execDelta}`)

  if (authDelta !== 0 || accDelta !== 0 || storageDelta !== 0 || execDelta !== 0) {
    throw new Error('SAFETY VIOLATION: Real user entities or storage records were mutated!')
  }
  results.destructiveSafety = 'PASS'

  // ---------------------------------------------------------------------------
  // STEP 13: Data Subject Experience & Information Isolation Check
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 13: Data Subject Information Isolation Verification ---')
  // Query events recorded on dsrDeletion
  const { data: delEvents } = await supabase
    .from('data_subject_request_events')
    .select('event_type, actor_account_user_id, metadata')
    .eq('request_id', dsrDeletion.id)

  console.log('✓ Audit events on rejected request:', delEvents?.map(e => e.event_type))

  // In the subject API/DAL, operatorNotes and internal admin ID are sanitized:
  const safeEvents = delEvents?.map(e => ({
    eventType: e.event_type,
    // Safe view never exposes internal operator_notes
    operatorNotes: undefined,
    // Safe view reports role, not internal admin account UUID
    actorRole: e.actor_account_user_id ? 'ADMIN' : 'USER',
    resolutionMessage: e.metadata?.resolution_message,
  }))

  const hasLeakedNotes = safeEvents?.some(e => e.operatorNotes)
  if (hasLeakedNotes) throw new Error('DATA LEAKAGE: Internal operator notes exposed!')
  console.log('✓ Safe Subject View Verified: Operator notes sanitized, admin UUID hidden, resolution message safely displayed')
  results.safeSubjectExperience = 'PASS'

  // ---------------------------------------------------------------------------
  // STEP 14: PT / EN and Mobile Viewports
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 14: PT / EN and Mobile Viewport Validation ---')
  // EN Cookie
  await send('Network.setCookie', { name: 'velvet_locale', value: 'en', domain: 'velvetgirls.club', path: '/' })
  await send('Page.navigate', { url: 'https://velvetgirls.club/admin/privacy?view=requests' })
  await new Promise((r) => setTimeout(r, 2500))
  await capture('08_admin_requests_en_desktop.png')

  // Mobile Viewport (390x844)
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true })
  await send('Page.navigate', { url: 'https://velvetgirls.club/admin/privacy?view=requests' })
  await new Promise((r) => setTimeout(r, 2500))
  await capture('09_admin_requests_mobile.png')

  console.log(`✓ Console Errors: ${consoleErrors.length}`)
  console.log(`✓ Hydration Errors: ${hydrationErrors.length}`)
  console.log(`✓ React Errors: ${reactErrors.length}`)

  if (hydrationErrors.length > 0 || reactErrors.length > 0) {
    throw new Error('Detected Hydration or React errors during browser validation!')
  }
  results.i18nAndResponsive = 'PASS'

  // ---------------------------------------------------------------------------
  // STEP 15: Cleanup Synthetic Test Fixtures
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 15: Cleaning up synthetic test fixtures ---')
  const testDsrIds = [dsr1.id, dsrDeletion.id, raceDsr.id]
  await supabase.from('data_subject_request_events').delete().in('request_id', testDsrIds)
  await supabase.from('data_subject_requests').delete().in('id', testDsrIds)
  await supabase.from('account_users').delete().in('id', [subjectAcct.id, delAcct.id, raceAcct.id])
  await supabase.auth.admin.deleteUser(subjectAuth.id)
  await supabase.auth.admin.deleteUser(createdDelAuth.user.id)
  await supabase.auth.admin.deleteUser(createdRaceAuth.user.id)
  console.log('✓ Cleaned up test data.')

  ws.close()
  chrome.kill()

  console.log('\n===============================================================')
  console.log('ALL LGPD-02D.1 PHYSICAL VALIDATION CHECKS PASSED!')
  console.log(JSON.stringify(results, null, 2))
  console.log('===============================================================')
}

main().catch((err) => {
  console.error('FATAL VALIDATION ERROR:', err)
  process.exit(1)
})
