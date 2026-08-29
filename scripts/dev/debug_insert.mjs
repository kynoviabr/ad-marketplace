import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase DEV environment variables are required.')

const admin = createClient(SUPABASE_URL, SUPABASE_KEY)

async function debug() {
  const accountId = 'ceb936af-86dc-45a7-af4f-5205d0e925f5' // one of the existing accounts

  // First, check if I need to update the role to PROFESSIONAL before insert
  await admin.from('account_users').update({role: 'PROFESSIONAL'}).eq('id', accountId)

  const profileId = crypto.randomUUID()

  const { data, error } = await admin.from('professional_profiles').insert({
      id: profileId,
      account_user_id: accountId,
      slug: `debug-sp-1`,
      stage_name: 'Debug',
      headline: `Debug`,
      bio: `Debug`,
      status: 'PUBLISHED',
      content_moderation_status: 'APPROVED',
      public_age: 22,
      show_age: true,
      height_cm: 165,
      show_height: true,
      weight_kg: 55,
      show_weight: true,
      eye_color: 'BROWN',
      hair_color: 'BRUNETTE',
      hair_length: 'LONG',
      body_type: 'SLIM',
      has_tattoos: false,
      has_piercings: false,
      whatsapp: '11999999999',
      phone: '11999999999'
    })
  console.log('Insert error:', error)
}
debug()
