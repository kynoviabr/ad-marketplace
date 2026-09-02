'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/components/i18n/i18n-provider'
import { AGE_COOKIE, ANALYTICS_STORAGE_KEYS, CONSENT_COOKIE, CONSENT_VERSION, readClientConsent } from '@/lib/compliance/consent'
import { localizePathname } from '@/lib/i18n/routing'

const COOKIE_AGE = 60 * 60 * 24 * 180
const excluded = ['/dashboard', '/onboarding', '/suspended', '/acesso-restrito']

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; Path=/; Max-Age=${COOKIE_AGE}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
}

export function PublicComplianceLayer({ initialAgeAccepted, initialAnalyticsConsent }: { initialAgeAccepted: boolean; initialAnalyticsConsent: boolean | null }) {
  const { locale } = useI18n()
  const pathname = usePathname()
  const en = locale === 'en'
  const isExcluded = excluded.some((path) => pathname === path || pathname.startsWith(`${path}/`) || pathname === `/en/access-restricted`)
  const [ageOpen, setAgeOpen] = useState(!initialAgeAccepted)
  const [consentOpen, setConsentOpen] = useState(initialAgeAccepted && initialAnalyticsConsent === null)
  const [preferences, setPreferences] = useState(false)
  const [analytics, setAnalytics] = useState(initialAnalyticsConsent ?? false)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const open = () => { setPreferences(true); setConsentOpen(true) }
    window.addEventListener('velvet:open-cookie-preferences', open)
    return () => window.removeEventListener('velvet:open-cookie-preferences', open)
  }, [])

  const modalOpen = ageOpen || consentOpen
  useEffect(() => {
    if (!modalOpen) return
    const previous = document.activeElement as HTMLElement | null
    const app = document.getElementById('velvet-app-content')
    app?.setAttribute('inert', '')
    app?.setAttribute('aria-hidden', 'true')
    document.body.style.overflow = 'hidden'
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialogRef.current) return
      const items = [...dialogRef.current.querySelectorAll<HTMLElement>('button,a,input:not([disabled])')]
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; app?.removeAttribute('inert'); app?.removeAttribute('aria-hidden'); document.removeEventListener('keydown', onKey); previous?.focus() }
  }, [modalOpen, preferences])

  if (isExcluded || !modalOpen) return null

  const acceptAge = () => { setCookie(AGE_COOKIE, 'confirmed-v1'); setAgeOpen(false); if (!readClientConsent()) setConsentOpen(true) }
  const save = (analyticsAllowed: boolean) => {
    setCookie(CONSENT_COOKIE, encodeURIComponent(JSON.stringify({ version: CONSENT_VERSION, necessary: true, analytics: analyticsAllowed, marketing: false, updatedAt: new Date().toISOString() })))
    if (!analyticsAllowed) ANALYTICS_STORAGE_KEYS.forEach((key) => sessionStorage.removeItem(key))
    setAnalytics(analyticsAllowed); setConsentOpen(false); setPreferences(false)
    window.dispatchEvent(new Event('velvet:consent-changed'))
  }

  return <div className="velvet-compliance-backdrop" role="presentation">
    <div ref={dialogRef} className="velvet-compliance-dialog" role="dialog" aria-modal="true" aria-labelledby="compliance-title">
      {ageOpen ? <>
        <p className="velvet-overline">VELVET · 18+</p>
        <h1 id="compliance-title">{en ? 'Adults only' : 'Acesso exclusivo para adultos'}</h1>
        <p>{en ? 'This website contains adult-oriented professional profiles. You must be at least 18 years old to continue.' : 'Este site apresenta perfis profissionais voltados ao público adulto. Você precisa ter 18 anos ou mais para continuar.'}</p>
        <div className="velvet-compliance-actions">
          <button type="button" className="velvet-compliance-primary" onClick={acceptAge}>{en ? 'I am 18 or older' : 'Tenho 18 anos ou mais'}</button>
          <a className="velvet-compliance-secondary" href={localizePathname('/acesso-restrito', locale)}>{en ? 'Leave' : 'Sair'}</a>
        </div>
      </> : <>
        <p className="velvet-overline">{en ? 'PRIVACY CHOICES' : 'ESCOLHAS DE PRIVACIDADE'}</p>
        <h1 id="compliance-title">{preferences ? (en ? 'Cookie preferences' : 'Preferências de cookies') : (en ? 'Your privacy, your choice' : 'Sua privacidade, sua escolha')}</h1>
        <p>{en ? 'We use necessary storage for security and operation. Optional first-party analytics only runs with your permission. No marketing trackers are installed.' : 'Usamos armazenamento necessário para segurança e funcionamento. Analytics próprios opcionais só funcionam com sua permissão. Não há rastreadores de marketing instalados.'}</p>
        {preferences && <div className="velvet-consent-categories">
          <label><span><strong>{en ? 'Necessary' : 'Necessários'}</strong><small>{en ? 'Authentication, security, age and consent choices.' : 'Autenticação, segurança, idade e escolhas de consentimento.'}</small></span><input type="checkbox" checked disabled aria-label={en ? 'Necessary cookies always active' : 'Cookies necessários sempre ativos'} /></label>
          <label><span><strong>Analytics</strong><small>{en ? 'First-party, session-scoped usage measurement.' : 'Medição própria de uso, limitada à sessão.'}</small></span><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} /></label>
          <label><span><strong>Marketing</strong><small>{en ? 'Not currently used.' : 'Não utilizado atualmente.'}</small></span><input type="checkbox" checked={false} disabled /></label>
        </div>}
        <div className="velvet-compliance-actions">
          {preferences ? <button type="button" className="velvet-compliance-primary" onClick={() => save(analytics)}>{en ? 'Save choices' : 'Salvar escolhas'}</button> : <button type="button" className="velvet-compliance-primary" onClick={() => save(true)}>{en ? 'Accept optional analytics' : 'Aceitar analytics opcionais'}</button>}
          {!preferences && <button type="button" className="velvet-compliance-secondary" onClick={() => save(false)}>{en ? 'Necessary only' : 'Somente necessários'}</button>}
          {!preferences && <button type="button" className="velvet-compliance-link" onClick={() => setPreferences(true)}>{en ? 'Customize' : 'Personalizar'}</button>}
        </div>
        <a className="velvet-compliance-policy" href={localizePathname('/cookies', locale)}>{en ? 'Read the Cookie Policy' : 'Ler a Política de Cookies'}</a>
      </>}
    </div>
  </div>
}
