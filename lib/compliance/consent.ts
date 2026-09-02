export const AGE_COOKIE = 'velvet_adult_access'
export const CONSENT_COOKIE = 'velvet_cookie_consent'
export const CONSENT_VERSION = 'r6-v1'
export const ANALYTICS_STORAGE_KEYS = ['ad_mkt_vsid', 'ad_mkt_imp_seen'] as const

export type ConsentPreferences = {
  version: string
  necessary: true
  analytics: boolean
  marketing: false
  updatedAt: string
}

export function parseConsent(value?: string | null): ConsentPreferences | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<ConsentPreferences>
    if (parsed.version !== CONSENT_VERSION || typeof parsed.analytics !== 'boolean') return null
    return { version: CONSENT_VERSION, necessary: true, analytics: parsed.analytics, marketing: false, updatedAt: String(parsed.updatedAt || '') }
  } catch { return null }
}

export function readClientConsent(): ConsentPreferences | null {
  if (typeof document === 'undefined') return null
  const raw = document.cookie.split('; ').find((item) => item.startsWith(`${CONSENT_COOKIE}=`))?.slice(CONSENT_COOKIE.length + 1)
  return parseConsent(raw)
}

export function hasAnalyticsConsent(): boolean {
  return readClientConsent()?.analytics === true
}

