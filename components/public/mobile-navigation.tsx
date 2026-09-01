'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LanguageSelector } from '@/components/i18n/language-selector'
import { useI18n } from '@/components/i18n/i18n-provider'
import { localizePathname } from '@/lib/i18n/routing'
import { isPublicNavigationItemActive, type PublicNavigationItem } from './public-navigation-state'

interface MobileNavigationProps {
  isAuthenticated: boolean
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function MobileNavigation({ isAuthenticated }: MobileNavigationProps) {
  const { locale, t } = useI18n()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const localized = (path: string) => localizePathname(path, locale)
  const accountPath = isAuthenticated ? '/dashboard' : '/login'
  const closeDrawer = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    if (!isOpen) return

    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : triggerRef.current

    const previousOverflow = document.body.style.overflow
    const inertTargets = Array.from(document.querySelectorAll<HTMLElement>([
      '.velvet-public-shell > main',
      '.velvet-public-shell > footer',
      '.velvet-public-header > .velvet-public-wordmark',
      '.velvet-public-desktop-navigation',
    ].join(',')))
    const priorInert = inertTargets.map((element) => element.inert)

    document.body.style.overflow = 'hidden'
    inertTargets.forEach((element) => { element.inert = true })
    closeRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeDrawer()
        return
      }

      if (event.key !== 'Tab' || !drawerRef.current) return

      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1)

      if (focusable.length === 0) {
        event.preventDefault()
        drawerRef.current.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const activeElement = document.activeElement

      if (event.shiftKey && activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      inertTargets.forEach((element, index) => { element.inert = priorInert[index] })
      window.requestAnimationFrame(() => returnFocusRef.current?.focus())
    }
  }, [closeDrawer, isOpen])

  const current = (item: PublicNavigationItem) => (
    isPublicNavigationItemActive(pathname, item, isAuthenticated) ? 'page' as const : undefined
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="velvet-mobile-menu-trigger"
        aria-label={t('navigation.openMenu')}
        aria-expanded={isOpen}
        aria-controls="velvet-mobile-nav-drawer"
        tabIndex={isOpen ? -1 : undefined}
        onClick={() => setIsOpen(true)}
      >
        <svg width="22" height="18" viewBox="0 0 22 18" fill="none" aria-hidden="true">
          <path d="M0 1H22M0 9H22M0 17H22" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            className="velvet-mobile-nav-backdrop"
            aria-label={t('navigation.closeMenu')}
            tabIndex={-1}
            onClick={closeDrawer}
          />
          <div
            id="velvet-mobile-nav-drawer"
            ref={drawerRef}
            className="velvet-mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t('navigation.menu')}
            tabIndex={-1}
          >
            <div className="velvet-mobile-nav-head">
              <span className="velvet-mobile-nav-wordmark">velvet.</span>
              <button
                ref={closeRef}
                type="button"
                className="velvet-mobile-nav-close"
                aria-label={t('navigation.closeMenu')}
                onClick={closeDrawer}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M3 3L17 17M17 3L3 17" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            </div>

            <nav className="velvet-mobile-nav-groups" aria-label={t('navigation.main')}>
              <DrawerGroup label={t('navigation.sectionExplore')}>
                <DrawerLink href={localized('/sao-paulo')} current={current('explore')} onClick={closeDrawer}>
                  {t('navigation.explore')}
                </DrawerLink>
                <span className="velvet-mobile-location-context">São Paulo</span>
              </DrawerGroup>

              <DrawerGroup label={t('navigation.sectionProfessionals')}>
                <DrawerLink href={localized('/anuncie')} current={current('advertise')} onClick={closeDrawer}>
                  {t('navigation.advertise')}
                </DrawerLink>
              </DrawerGroup>

              <DrawerGroup label={t('navigation.sectionAccount')}>
                <DrawerLink href={localized(accountPath)} current={current('account')} onClick={closeDrawer}>
                  {isAuthenticated ? t('navigation.account') : t('navigation.login')}
                </DrawerLink>
              </DrawerGroup>

              <DrawerGroup label={t('navigation.sectionLanguage')}>
                <LanguageSelector expanded />
              </DrawerGroup>
            </nav>
          </div>
        </>
      ) : null}
    </>
  )
}

function DrawerGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="velvet-mobile-nav-group" aria-label={label}>
      <p>{label}</p>
      {children}
    </section>
  )
}

function DrawerLink({
  href,
  current,
  onClick,
  children,
}: {
  href: string
  current?: 'page'
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="velvet-link velvet-link--navigation velvet-mobile-nav-link"
      aria-current={current}
      onClick={onClick}
    >
      {children}
    </Link>
  )
}
