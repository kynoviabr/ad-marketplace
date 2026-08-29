'use client'
import { useEffect } from 'react'
import { getVisitorSessionId } from '@/components/analytics/session'

export function ProfileViewTracker({ profileSlug, citySlug, locationSlug }: { profileSlug: string; citySlug: string; locationSlug?: string }) {
  useEffect(() => {
    const sessionId = getVisitorSessionId()
    if (!sessionId) return
    const payload = JSON.stringify({ event_type: 'PROFILE_VIEWED', profile_slug: profileSlug, city_slug: citySlug, location_slug: locationSlug, placement_type: 'ORGANIC', occurred_at: new Date().toISOString(), visitor_session_id: sessionId, referrer_type: document.referrer.includes(`/${citySlug}`) ? 'SEARCH' : 'DIRECT' })
    if (navigator.sendBeacon) navigator.sendBeacon('/api/analytics/events', new Blob([payload], { type: 'application/json' }))
    else fetch('/api/analytics/events', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: payload }).catch(() => {})
  }, [citySlug, locationSlug, profileSlug])
  return null
}
