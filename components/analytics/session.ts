/**
 * Visitor Session Utilities — FASE 09
 *
 * Privacy-preserving, pseudonymous session identifier management.
 * Strictly first-party, session-scoped (sessionStorage), zero cookies, zero cross-session tracking.
 *
 * Respects Do Not Track (DNT).
 */

const STORAGE_KEY = 'ad_mkt_vsid'
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

let ephemeralMemoryId: string | null = null

export function isDoNotTrackEnabled(): boolean {
  if (typeof window === 'undefined') return false
  const dnt = navigator.doNotTrack || (window as any).doNotTrack || (navigator as any).msDoNotTrack
  return dnt === '1' || dnt === 'yes'
}

/**
 * Returns a pseudonymous session UUID for visitor analytics.
 * Returns null if Do Not Track (DNT) is enabled.
 */
export function getVisitorSessionId(): string | null {
  if (typeof window === 'undefined') return null
  if (!hasAnalyticsConsent()) return null

  // HD-4: Respect Do Not Track
  if (isDoNotTrackEnabled()) {
    return null
  }

  try {
    let sid = window.sessionStorage.getItem(STORAGE_KEY)
    if (sid && UUID_REGEX.test(sid)) {
      return sid
    }

    sid = crypto.randomUUID()
    window.sessionStorage.setItem(STORAGE_KEY, sid)
    return sid
  } catch {
    // sessionStorage inaccessible (e.g. strict private sandboxes)
    if (!ephemeralMemoryId) {
      ephemeralMemoryId = crypto.randomUUID()
    }
    return ephemeralMemoryId
  }
}
import { hasAnalyticsConsent } from '@/lib/compliance/consent'
