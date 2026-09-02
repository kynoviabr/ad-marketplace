'use client'

export function CookiePreferencesButton({ label }: { label: string }) {
  return <button type="button" className="velvet-footer-button" onClick={() => window.dispatchEvent(new Event('velvet:open-cookie-preferences'))}>{label}</button>
}
