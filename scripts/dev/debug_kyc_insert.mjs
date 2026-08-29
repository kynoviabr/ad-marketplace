import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase DEV environment variables are required.')

const admin = createClient(SUPABASE_URL, SUPABASE_KEY)

async function debug() {
  const { data: profs } = await admin.from('professional_profiles').select('id, account_user_id').limit(1)
  const accountId = profs[0].account_user_id
  const profileId = profs[0].id

  const { error } = await admin.from('identity_verifications').insert({
      account_user_id: accountId,
      status: 'VERIFIED',
      provider: 'didit',
      document_type: 'PASSPORT',
      verified_age: 22,
      provider_id: `mock-didit-123`
    })
  console.log('KYC error:', error)

  const { error: mError } = await admin.from('profile_media').insert({
      id: crypto.randomUUID(),
      profile_id: profileId,
      file_path: `mock`,
      type: 'PHOTO',
      is_primary: true,
      status: 'APPROVED',
      mime_type: 'image/jpeg',
      file_size_bytes: 100
  })
  console.log('Media error:', mError)
}
debug()
