#!/usr/bin/env node
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

const SYNTHETIC_CLIENT_EMAIL = 'synthetic-lgpd-client-01@ad-marketplace-synthetic.invalid'
const SYNTHETIC_PASSWORD = 'SyntheticPass123!Secure'

export async function seedSyntheticLgpdClient() {
  console.log('=== LGPD-02C.1: Seeding Synthetic Client ===')

  // 1. Check or Create Auth User
  let authUserId = null
  const { data: userList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existingUser = userList?.users?.find((u) => u.email === SYNTHETIC_CLIENT_EMAIL)

  if (existingUser) {
    authUserId = existingUser.id
    console.log(`Found existing synthetic Auth client: ${authUserId} (${SYNTHETIC_CLIENT_EMAIL})`)
  } else {
    const { data: newUser, error: createAuthError } = await supabase.auth.admin.createUser({
      email: SYNTHETIC_CLIENT_EMAIL,
      email_confirm: true,
      password: SYNTHETIC_PASSWORD,
      user_metadata: {
        role: 'CLIENT',
        synthetic: true,
        fixture: 'LGPD-02C.1',
      },
    })
    if (createAuthError || !newUser.user) {
      throw new Error(`Failed to create synthetic Auth client: ${createAuthError?.message}`)
    }
    authUserId = newUser.user.id
    console.log(`Created synthetic Auth client: ${authUserId}`)
  }

  // 2. Ensure account_users record
  const { data: existingAccount } = await supabase
    .from('account_users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  let accountId = null
  const now = new Date().toISOString()

  if (existingAccount) {
    accountId = existingAccount.id
    await supabase
      .from('account_users')
      .update({
        role: 'CLIENT',
        status: 'ACTIVE',
        terms_version: '1.0.0',
        terms_accepted_at: now,
        privacy_version: '1.0.0',
        privacy_accepted_at: now,
      })
      .eq('id', accountId)
    console.log(`Updated account_users record for client: ${accountId}`)
  } else {
    const { data: newAccount, error: accError } = await supabase
      .from('account_users')
      .insert({
        auth_user_id: authUserId,
        role: 'CLIENT',
        status: 'ACTIVE',
        terms_version: '1.0.0',
        terms_accepted_at: now,
        privacy_version: '1.0.0',
        privacy_accepted_at: now,
      })
      .select('id')
      .single()

    if (accError || !newAccount) {
      throw new Error(`Failed to create account_users for client: ${accError?.message}`)
    }
    accountId = newAccount.id
    console.log(`Created account_users record for client: ${accountId}`)
  }

  // 3. Ensure client_memberships record
  const { data: existingMem } = await supabase
    .from('client_memberships')
    .select('id')
    .eq('account_id', accountId)
    .maybeSingle()

  if (existingMem) {
    await supabase
      .from('client_memberships')
      .update({
        membership_type: 'VIP',
        valid_until: '2028-12-31T23:59:59Z',
        updated_at: now,
      })
      .eq('id', existingMem.id)
  } else {
    await supabase.from('client_memberships').insert({
      account_id: accountId,
      membership_type: 'VIP',
      valid_until: '2028-12-31T23:59:59Z',
      created_at: now,
      updated_at: now,
    })
  }

  console.log(`=== SYNTHETIC CLIENT READY ===`)
  console.log(JSON.stringify({
    authUserId,
    accountId,
    email: SYNTHETIC_CLIENT_EMAIL,
    role: 'CLIENT',
    membership: 'VIP'
  }, null, 2))
}

seedSyntheticLgpdClient().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
