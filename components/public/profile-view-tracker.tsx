'use client'

import { useEffect } from 'react'
import { getVisitorSessionId } from '@/components/analytics/session'

interface ProfileViewTrackerProps {
  profileSlug: string
  citySlug: string
  locationSlug?: string
}

const memoryViewSeenSet = new Set<string>()

function isProfileViewAlreadySeen(dedupKey: string): boolean {
  if (memoryViewSeenSet.has(dedupKey)) return true
  try {
    const raw = window.sessionStorage.getItem('ad_mkt_view_seen')
    if (raw) {
      const keys = JSON.parse(raw)
      if (Array.isArray(keys) && keys.includes(dedupKey)) {
        memoryViewSeenSet.add(dedupKey)
        return true
      }
    }
  } catch {}
  return false
}

function markProfileViewSeen(dedupKey: string): void {
  memoryViewSeenSet.add(dedupKey)
  try {
    const raw = window.sessionStorage.getItem('ad_mkt_view_seen')
    const keys: string[] = raw ? JSON.parse(raw) : []
    if (!keys.includes(dedupKey)) {
      keys.push(dedupKey)
      // Bound sessionStorage to 500 entries per session
      if (keys.length > 500) keys.shift()
      window.sessionStorage.setItem('ad_mkt_view_seen', JSON.stringify(keys))
    }
  } catch {}
}

export function ProfileViewTracker({ profileSlug, citySlug, locationSlug }: ProfileViewTrackerProps) {
  useEffect(() => {
    const sessionId = getVisitorSessionId()
    if (!sessionId) return

    const dedupKey = `view:${profileSlug}:${sessionId}`
    if (isProfileViewAlreadySeen(dedupKey)) return

    markProfileViewSeen(dedupKey)

    const payload = JSON.stringify({
      event_type: 'PROFILE_VIEWED',
      profile_slug: profileSlug,
      city_slug: citySlug,
      location_slug: locationSlug,
      placement_type: 'ORGANIC',
      occurred_at: new Date().toISOString(),
      visitor_session_id: sessionId,
      referrer_type: document.referrer.includes(`/${citySlug}`) ? 'SEARCH' : 'DIRECT',
    })

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/events', new Blob([payload], { type: 'application/json' }))
    } else {
      fetch('/api/analytics/events', {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      }).catch(() => {})
    }
  }, [citySlug, locationSlug, profileSlug])

  return null
}
