/**
 * WhatsApp CTA Client Component — FASE 09
 *
 * Dispatches a fire-and-forget CONTACT_WHATSAPP_CLICKED event on click.
 * Hard invariant: Analytics dispatch NEVER delays or prevents WhatsApp navigation.
 */

'use client'

import React from 'react'
import { getVisitorSessionId } from '@/components/analytics/session'
import type { PlacementType } from '@/modules/search/types'

interface WhatsAppCTAProps {
  whatsappUrl: string
  analyticsPayload: {
    profileSlug: string
    citySlug: string
    locationSlug?: string | null
    placementType: PlacementType
    resultPage?: number | null
    resultPosition?: number | null
  }
  className?: string
  children?: React.ReactNode
}

export function WhatsAppCTA({
  whatsappUrl,
  analyticsPayload,
  className = 'w-full text-center py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5',
  children,
}: WhatsAppCTAProps) {
  const handleClick = () => {
    try {
      const sessionId = getVisitorSessionId()
      if (!sessionId) return // DNT enabled or server environment

      const payload = {
        event_type: 'CONTACT_WHATSAPP_CLICKED',
        profile_slug: analyticsPayload.profileSlug,
        city_slug: analyticsPayload.citySlug,
        location_slug: analyticsPayload.locationSlug || undefined,
        placement_type: analyticsPayload.placementType,
        result_page: analyticsPayload.resultPage ?? undefined,
        result_position: analyticsPayload.resultPosition ?? undefined,
        occurred_at: new Date().toISOString(),
        visitor_session_id: sessionId,
      }

      const jsonString = JSON.stringify(payload)

      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([jsonString], { type: 'application/json' })
        navigator.sendBeacon('/api/analytics/events', blob)
      } else if (typeof fetch !== 'undefined') {
        fetch('/api/analytics/events', {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: jsonString,
        }).catch(() => {})
      }
    } catch {
      // Hard invariant: never throw or disrupt link navigation
    }
  }

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={className}
    >
      {children || <span>WhatsApp</span>}
    </a>
  )
}
