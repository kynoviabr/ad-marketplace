import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase DEV environment variables are required.')

const admin = createClient(SUPABASE_URL, SUPABASE_KEY)

async function debug() {
  const { data: city, error: cityErr } = await admin.from('cities').select('id').eq('slug', 'sao-paulo').single()
  console.log('City:', city, cityErr)

  const { data: eligible, error: eligErr } = await admin.from('v_publication_eligible_profiles').select('*').eq('city_id', city.id)
  console.log('Eligible Profiles Count:', eligible?.length, eligErr)

  if (eligible?.length === 0) {
      console.log('Zero eligible profiles! Querying specific reasons...')
      const { data: profs } = await admin.from('professional_profiles').select('id, account_user_id, status, content_moderation_status').limit(1)
      if (profs && profs.length > 0) {
          const pid = profs[0].id
          console.log('Sample profile:', profs[0])

          const { data: locs } = await admin.from('professional_profile_locations').select('*').eq('profile_id', pid)
          console.log('Locations:', locs)

          const { data: media } = await admin.from('profile_media').select('status, is_primary').eq('profile_id', pid)
          console.log('Media:', media)

          const { data: ident } = await admin.from('identity_verifications').select('*').eq('account_user_id', profs[0].account_user_id)
          console.log('Identity Verifications:', ident)

          const { data: sub } = await admin.from('subscriptions').select('status, plan_id, price_id, current_period_start, current_period_end').eq('account_user_id', profs[0].account_user_id)
          console.log('Subscriptions:', sub)
      }
  } else {
      console.log('First eligible profile:', eligible[0])
  }
}
debug().catch(console.error)
