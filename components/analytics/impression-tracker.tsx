/**
 * Impression Tracker Client Component — FASE 09
 *
 * Observes search result card visibility using IntersectionObserver.
 * Enforces:
 * - 50% card visibility in viewport
 * - 500ms continuous visibility timer
 * - Session-scoped deduplication (profile + page + placement)
 * - Zero render interference / fail-safe network dispatch
 */

'use client'

import React, { useEffect, useRef } from 'react'
import { getVisitorSessionId } from './session'
import type { PlacementType } from '@/modules/search/types'

interface ImpressionTrackerProps {
  profileSlug: string
  citySlug: string
  locationSlug?: string | null
  placementType: PlacementType
  resultPage: number
  resultPosition: number
  children: React.ReactNode
}

const memorySeenSet = new Set<string>()

function isImpressionAlreadySeen(dedupKey: string): boolean {
  if (memorySeenSet.has(dedupKey)) return true
  try {
    const raw = window.sessionStorage.getItem('ad_mkt_imp_seen')
    if (raw) {
      const keys = JSON.parse(raw)
      if (Array.isArray(keys) && keys.includes(dedupKey)) {
        memorySeenSet.add(dedupKey)
        return true
      }
    }
  } catch {}
  return false
}

function markImpressionSeen(dedupKey: string): void {
  memorySeenSet.add(dedupKey)
  try {
    const raw = window.sessionStorage.getItem('ad_mkt_imp_seen')
    const keys: string[] = raw ? JSON.parse(raw) : []
    if (!keys.includes(dedupKey)) {
      keys.push(dedupKey)
      // Limit storage to 500 entries per session
      if (keys.length > 500) keys.shift()
      window.sessionStorage.setItem('ad_mkt_imp_seen', JSON.stringify(keys))
    }
  } catch {}
}

export function ImpressionTracker({
  profileSlug,
  citySlug,
  locationSlug,
  placementType,
  resultPage,
  resultPosition,
  children,
}: ImpressionTrackerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasFiredRef = useRef(false)

  const dedupKey = `${profileSlug}:${citySlug}:${locationSlug || ''}:${placementType}:${resultPage}`

  useEffect(() => {
    if (hasFiredRef.current || isImpressionAlreadySeen(dedupKey)) {
      return
    }

    const element = containerRef.current
    if (!element || typeof IntersectionObserver === 'undefined') {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return

        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!timerRef.current && !hasFiredRef.current) {
            timerRef.current = setTimeout(() => {
              if (hasFiredRef.current || isImpressionAlreadySeen(dedupKey)) return

              const sessionId = getVisitorSessionId()
              if (!sessionId) return // DNT enabled

              hasFiredRef.current = true
              markImpressionSeen(dedupKey)

              const payload = {
                event_type: 'PROFILE_IMPRESSION',
                profile_slug: profileSlug,
                city_slug: citySlug,
                location_slug: locationSlug || undefined,
                placement_type: placementType,
                result_page: resultPage,
                result_position: resultPosition,
                occurred_at: new Date().toISOString(),
                visitor_session_id: sessionId,
              }

              try {
                fetch('/api/analytics/events', {
                  method: 'POST',
                  keepalive: true,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                }).catch(() => {
                  // Hard invariant: never throw or affect visitor UX
                })
              } catch {}
            }, 500) // 500ms continuous visibility threshold (HD-2)
          }
        } else {
          // Left viewport before 500ms elapsed -> cancel timer
          if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
          }
        }
      },
      {
        threshold: [0.5], // 50% visibility threshold (HD-1)
      }
    )

    observer.observe(element)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      observer.disconnect()
    }
  }, [dedupKey, profileSlug, citySlug, locationSlug, placementType, resultPage, resultPosition])

  return (
    <div ref={containerRef} className="w-full h-full">
      {children}
    </div>
  )
}
