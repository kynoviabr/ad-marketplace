import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('FATAL: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
  process.exit(1)
}

if (!SUPABASE_URL.includes('mwzlunkkyigxzjpnybxj')) {
  console.error('FATAL: Attempting to run DEV fixture script against UNKNOWN project. Aborting.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const SYNTHETIC_NAMES = ['Marina', 'Luna', 'Isabella', 'Rafaela', 'Camila', 'Beatriz', 'Alessandra', 'Juliana']
const SYNTHETIC_EMAIL_DOMAIN = 'fixture.example.com'
const DEV_FIXTURE_IDENTIFIER = 'dev-fixture-12-2b-r2'

async function clearOldFixtures() {
  console.log('Cleaning up old fixtures...')
  // Clean by identifying auth users
  const { data: usersData, error } = await supabase.auth.admin.listUsers()
  if (error) {
    console.error('Error listing auth users:', error)
    return
  }
  const users = usersData?.users || []
  const fixtureUsers = users.filter(u => u.email?.includes(SYNTHETIC_EMAIL_DOMAIN))

  if (fixtureUsers.length > 0) {
    for (const u of fixtureUsers) {
      await supabase.auth.admin.deleteUser(u.id)
    }
  }

  // Optional: Also clean up storage items if you want, but they'll be overwritten or we can just leave them or delete them by prefix.
  const { data: storageFiles } = await supabase.storage.from('profile-media').list('dev-fixtures/profiles')
  if (storageFiles && storageFiles.length > 0) {
     for (const folder of storageFiles) {
        const { data: innerFiles } = await supabase.storage.from('profile-media').list(`dev-fixtures/profiles/${folder.name}`)
        if (innerFiles && innerFiles.length > 0) {
            await supabase.storage.from('profile-media').remove(innerFiles.map(f => `dev-fixtures/profiles/${folder.name}/${f.name}`))
        }
     }
  }
}

async function getLocations() {
  const { data: city, error: cityError } = await supabase.from('cities').select('id').eq('slug', 'sao-paulo').single()
  if (cityError || !city) throw new Error('Could not fetch city sao-paulo')

  const { data: locations, error } = await supabase.from('marketplace_locations').select('*').eq('city_id', city.id)
  if (error) {
    console.error('Error fetching locations:', error)
    throw new Error('Could not fetch locations')
  }
  return locations
}

async function getPlanInfo() {
  const { data: plan, error: pErr } = await supabase.from('subscription_plans').select('id').eq('code', 'FOUNDER').single()
  const { data: price, error: prErr } = await supabase.from('plan_prices').select('id').eq('plan_id', plan?.id).eq('price_code', 'LAUNCH_FREE').single()
  if (pErr || prErr) {
    console.warn('Could not find deterministic billing plan (FOUNDER/LAUNCH_FREE)', { pErr, prErr })
  }
  return { planId: plan?.id || null, priceId: price?.id || null }
}

async function seedFixtures() {
  console.log('Starting DEV fixture creation...')

  await clearOldFixtures()

  const locations = await getLocations()
  const { planId, priceId } = await getPlanInfo()

  if (locations.length === 0) {
    console.error('No locations found in DEV. Please ensure migrations and location seeds ran.')
    process.exit(1)
  }

  for (let i = 0; i < SYNTHETIC_NAMES.length; i++) {
    const name = SYNTHETIC_NAMES[i]
    const email = `${name.toLowerCase()}.${DEV_FIXTURE_IDENTIFIER}@${SYNTHETIC_EMAIL_DOMAIN}`
    const profileId = crypto.randomUUID()

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      email_confirm: true,
      password: 'FixturePassword123!',
    })

    if (authError || !authData.user) {
      console.error('Auth insert error:', authError)
      continue
    }

    const userId = authData.user.id

    await new Promise(r => setTimeout(r, 500))

    const { data: existingAccount } = await supabase.from('account_users').select('id').eq('auth_user_id', userId).single()
    let accountId = existingAccount?.id

    if (!accountId) {
      accountId = crypto.randomUUID()
      const { error: accError } = await supabase.from('account_users').insert({
        id: accountId,
        auth_user_id: userId,
        role: 'PROFESSIONAL',
        status: 'ACTIVE'
      })
      if (accError) { console.error('Account insert error:', accError); continue; }
    } else {
      await supabase.from('account_users').update({ role: 'PROFESSIONAL', status: 'ACTIVE' }).eq('id', accountId)
    }

    await supabase.from('identity_verifications').insert({
      account_user_id: accountId,
      status: 'VERIFIED',
      provider: 'didit',
      provider_session_id: `mock-didit-${crypto.randomUUID()}`,
      identity_verified: true,
      age_verified: true
    })

    const { error: profileError } = await supabase.from('professional_profiles').insert({
      id: profileId,
      account_user_id: accountId,
      slug: `${name.toLowerCase()}-sp-${i}`,
      stage_name: name,
      headline: `Profissionalismo e encanto em São Paulo`,
      bio: `Olá, sou a ${name}. Sou apaixonada por oferecer uma companhia incrível e momentos inesquecíveis. Perfil de teste sintético gerado para validação do DEV.`,
      status: 'ACTIVE',
      content_moderation_status: 'APPROVED',
      public_age: 22 + i,
      show_age: true,
      height_cm: 165 + (i % 10),
      show_height: true,
      weight_kg: 55 + (i % 5),
      show_weight: true,
      eye_color: ['BROWN', 'GREEN', 'BLUE'][i % 3],
      hair_color: ['BRUNETTE', 'BLONDE', 'BLACK'][i % 3],
      hair_length: 'LONG',
      body_type: ['SLIM', 'ATHLETIC', 'CURVY'][i % 3],
      has_tattoos: i % 2 === 0,
      has_piercings: false,
      whatsapp_phone: '11999999999'
    })

    if (profileError) {
      console.error(`Profile insert error for ${name}:`, profileError)
      continue
    }

    const loc = locations[i % locations.length]
    await supabase.from('professional_profile_locations').insert({
      profile_id: profileId,
      location_id: loc.id,
      is_primary: true
    })

    const localImagePath = `.tmp_assets/${name.toLowerCase()}.jpg`
    const storagePathStr = `dev-fixtures/profiles/${profileId}/primary.jpg`
    let fileSize = 0

    if (fs.existsSync(localImagePath)) {
      const fileBuffer = fs.readFileSync(localImagePath)
      fileSize = fs.statSync(localImagePath).size
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-media')
        .upload(storagePathStr, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        })
      if (uploadError) {
        console.error(`Storage upload error for ${name}:`, uploadError)
      } else {
        console.log(`Uploaded physical asset for ${name}`)
      }
    }

    const { error: mediaError } = await supabase.from('profile_media').insert({
      id: crypto.randomUUID(),
      profile_id: profileId,
      storage_path: storagePathStr,
      status: 'APPROVED',
      position: 1,
      is_primary: true,
      mime_type: 'image/jpeg',
      file_size_bytes: fileSize
    })
    if (mediaError) console.error(`Media insert error for ${name}:`, mediaError)

    if (planId && priceId) {
      await supabase.from('subscriptions').insert({
        id: crypto.randomUUID(),
        account_user_id: accountId,
        plan_id: planId,
        price_id: priceId,
        status: 'ACTIVE',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
    }

    console.log(`Created fixture profile: ${name} in ${loc.zone}`)
  }

  console.log(`Successfully created ${SYNTHETIC_NAMES.length} DEV fixtures with physical images.`)
}

seedFixtures().catch(console.error)
