/**
 * Analytics Event Writers — FASE 09
 *
 * Server-only module for recording authoritative server events (e.g. SEARCH_PERFORMED, BOOST_ACTIVATED)
 * and ingesting client-reported interaction events (PROFILE_IMPRESSION, CONTACT_WHATSAPP_CLICKED).
 *
 * Security & Integrity Invariants:
 * - Uses createAdminClient() exclusively on the server.
 * - Client NEVER provides boost_campaign_id; server authoritatively validates and resolves it.
 * - Raw IPs are never received, stored, or logged here.
 * - Errors do not throw into the visitor request path.
 */

import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfileBySlug } from '@/modules/profiles/dal'
import { getCityBySlug, getLocationBySlug } from '@/modules/locations/dal'
import type { IngestionEventPayload } from './schemas'
import type { PlacementType } from '@/modules/search/types'

export interface RecordSearchPerformedParams {
  cityId: string
  locationId: string | null
  resultPage: number
  totalProfiles: number
  sponsoredCount: number
  hasFilters: boolean
}

/**
 * Records a server-authoritative SEARCH_PERFORMED event.
 * Designed to be called inside Next.js after() in search Server Components.
 */
export async function recordSearchPerformedEvent(params: RecordSearchPerformedParams): Promise<void> {
  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { error } = await admin.from('analytics_events').insert({
    event_type: 'SEARCH_PERFORMED',
    occurred_at: now,
    received_at: now,
    city_id: params.cityId,
    location_id: params.locationId,
    result_page: params.resultPage,
    total_profiles: params.totalProfiles,
    sponsored_count: params.sponsoredCount,
    has_filters: params.hasFilters,
    profile_id: null,
    placement_type: null,
    boost_campaign_id: null,
    visitor_session_id: null,
  })

  if (error) {
    console.error('[analytics:recordSearchPerformedEvent] Failed to record search event:', error.message)
  }
}

/**
 * Records a server-lifecycle BOOST_ACTIVATED event with idempotency via event_key.
 */
export async function recordBoostActivatedEvent(campaign: {
  id: string
  profile_id: string
  city_id: string
  location_id: string | null
  starts_at: string
}): Promise<void> {
  const admin = createAdminClient()
  const eventKey = `boost_activated:${campaign.id}`
  const now = new Date().toISOString()

  const { error } = await admin.from('analytics_events').insert({
    event_key: eventKey,
    event_type: 'BOOST_ACTIVATED',
    occurred_at: campaign.starts_at || now,
    received_at: now,
    profile_id: campaign.profile_id,
    city_id: campaign.city_id,
    location_id: campaign.location_id,
    boost_campaign_id: campaign.id,
    placement_type: null,
    visitor_session_id: null,
  })

  // 23505 = unique_violation on event_key (idempotent no-op)
  if (error && error.code !== '23505') {
    console.error('[analytics:recordBoostActivatedEvent] Error recording boost activation:', error.message)
  }
}

/**
 * Ingests a client-submitted analytics event (PROFILE_IMPRESSION, CONTACT_WHATSAPP_CLICKED, etc.).
 * Validates and enriches context server-side.
 */
export async function ingestClientEvent(payload: IngestionEventPayload): Promise<{ success: boolean; ignored?: boolean }> {
  const admin = createAdminClient()
  const nowIso = new Date().toISOString()
  const eventTime = new Date(payload.occurred_at)

  // 1. Resolve Profile
  const profile = await getProfileBySlug(payload.profile_slug)
  if (!profile) {
    // Silently ignore to avoid leaking profile existence
    return { success: true, ignored: true }
  }

  // 2. Resolve City
  const city = await getCityBySlug(payload.city_slug)
  if (!city) {
    return { success: true, ignored: true }
  }

  // 3. Resolve Location (if provided)
  let resolvedLocationId: string | null = null
  if (payload.location_slug) {
    const loc = await getLocationBySlug(city.id, payload.location_slug)
    resolvedLocationId = loc?.id ?? null
  }

  // 4. Server-Authoritative Sponsored Attribution Validation
  let finalPlacementType: PlacementType | null = (payload.placement_type as PlacementType) || null
  let resolvedCampaignId: string | null = null

  if (payload.placement_type === 'SPONSORED') {
    const { data: activeCampaigns } = await admin
      .from('profile_boosts')
      .select('id, scope_type, location_id')
      .eq('profile_id', profile.id)
      .eq('city_id', city.id)
      .eq('status', 'ACTIVE')
      .lte('starts_at', eventTime.toISOString())
      .gt('ends_at', eventTime.toISOString())

    const matchingCampaign = (activeCampaigns || []).find((c: any) => {
      if (c.scope_type === 'CITY') return true
      if (c.scope_type === 'MARKETPLACE_LOCATION') {
        return resolvedLocationId && c.location_id === resolvedLocationId
      }
      return false
    })

    if (matchingCampaign) {
      resolvedCampaignId = matchingCampaign.id
      finalPlacementType = 'SPONSORED'
    } else {
      // Graceful fallback to ORGANIC — do not corrupt sponsored metrics with invalid attribution
      resolvedCampaignId = null
      finalPlacementType = 'ORGANIC'
    }
  }

  // 5. Build canonical row
  const resultPage = 'result_page' in payload ? payload.result_page ?? null : null
  const resultPosition = 'result_position' in payload ? payload.result_position ?? null : null
  const referrerType = 'referrer_type' in payload ? payload.referrer_type ?? null : null

  const { error } = await admin.from('analytics_events').insert({
    event_type: payload.event_type,
    occurred_at: payload.occurred_at,
    received_at: nowIso,
    profile_id: profile.id,
    city_id: city.id,
    location_id: resolvedLocationId,
    placement_type: finalPlacementType,
    boost_campaign_id: resolvedCampaignId,
    result_page: resultPage,
    result_position: resultPosition,
    visitor_session_id: payload.visitor_session_id,
    referrer_type: referrerType,
  })

  if (error) {
    console.error('[analytics:ingestClientEvent] Database insert error:', error.message)
    return { success: false }
  }

  return { success: true }
}
