'use client'

import { useState, useRef, useEffect, type MouseEvent } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { LOCALE_COOKIE, type Locale } from '@/lib/i18n/config'
import { localizePathname } from '@/lib/i18n/routing'
import { useI18n } from './i18n-provider'

export interface LanguageSelectorProps {
  compact?: boolean
  expanded?: boolean
  variant?: 'inline' | 'popover'
  theme?: 'light' | 'dark'
  placement?: 'top' | 'bottom'
  showLabel?: boolean
  className?: string
}

function BrazilFlag({ size = 20 }: { size?: number }) {
  return (
    <span
      className="velvet-flag-circle"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.08)',
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <rect width="32" height="32" fill="#009c3b" />
        <polygon points="16,4 28,16 16,28 4,16" fill="#ffdf00" />
        <circle cx="16" cy="16" r="6.5" fill="#002776" />
        <path
          d="M 10 16 C 12.5 14, 18.5 14, 22 17"
          stroke="#ffffff"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

function UsaFlag({ size = 20 }: { size?: number }) {
  return (
    <span
      className="velvet-flag-circle"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.08)',
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <rect width="32" height="32" fill="#ffffff" />
        <rect y="0" width="32" height="2.46" fill="#b22234" />
        <rect y="4.92" width="32" height="2.46" fill="#b22234" />
        <rect y="9.85" width="32" height="2.46" fill="#b22234" />
        <rect y="14.77" width="32" height="2.46" fill="#b22234" />
        <rect y="19.69" width="32" height="2.46" fill="#b22234" />
        <rect y="24.62" width="32" height="2.46" fill="#b22234" />
        <rect y="29.54" width="32" height="2.46" fill="#b22234" />
        <rect width="15" height="17.23" fill="#3c3b6e" />
        <circle cx="3.5" cy="3.5" r="0.9" fill="#ffffff" />
        <circle cx="7.5" cy="3.5" r="0.9" fill="#ffffff" />
        <circle cx="11.5" cy="3.5" r="0.9" fill="#ffffff" />
        <circle cx="5.5" cy="7" r="0.9" fill="#ffffff" />
        <circle cx="9.5" cy="7" r="0.9" fill="#ffffff" />
        <circle cx="3.5" cy="10.5" r="0.9" fill="#ffffff" />
        <circle cx="7.5" cy="10.5" r="0.9" fill="#ffffff" />
        <circle cx="11.5" cy="10.5" r="0.9" fill="#ffffff" />
        <circle cx="5.5" cy="14" r="0.9" fill="#ffffff" />
        <circle cx="9.5" cy="14" r="0.9" fill="#ffffff" />
      </svg>
    </span>
  )
}

function ChevronDownIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.5 4.5L6 8L9.5 4.5" />
    </svg>
  )
}

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.5 7.5L5.5 10.5L11.5 3.5" />
    </svg>
  )
}

export function LanguageSelector({
  compact = false,
  expanded = false,
  variant = 'inline',
  theme = 'light',
  placement = 'bottom',
  showLabel = false,
  className = '',
}: LanguageSelectorProps) {
  const { locale, t } = useI18n()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.toString()

  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const destinationFor = (nextLocale: Locale) => {
    const localizedPath = localizePathname(pathname, nextLocale)
    return `${localizedPath}${query ? `?${query}` : ''}`
  }

  const persistLocale = (nextLocale: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(nextLocale)}; Path=/; Max-Age=31536000; SameSite=Lax${typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''}`
  }

  const changeLocale = (event: MouseEvent<HTMLAnchorElement>, nextLocale: Locale) => {
    event.preventDefault()
    setIsOpen(false)
    persistLocale(nextLocale)
    window.location.assign(destinationFor(nextLocale))
  }

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isOpen])

  if (variant === 'popover') {
    const isPt = locale === 'pt-BR'
    const popoverClasses = [
      'velvet-language-selector',
      'velvet-language-popover',
      compact ? 'is-compact' : '',
      `velvet-language-popover--${theme}`,
      `velvet-language-popover--${placement}`,
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div
        ref={containerRef}
        className={popoverClasses}
        role="group"
        aria-label={t('common.language')}
      >
        <button
          type="button"
          className="velvet-language-trigger"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={isPt ? 'Selecionar idioma (Português selecionado)' : 'Select language (English selected)'}
        >
          {isPt ? <BrazilFlag size={showLabel ? 18 : 20} /> : <UsaFlag size={showLabel ? 18 : 20} />}
          {showLabel && (
            <span className="velvet-language-trigger-text">
              {isPt ? 'Português' : 'English'}
            </span>
          )}
          <ChevronDownIcon className="velvet-language-chevron" />
        </button>

        {isOpen && (
          <ul className="velvet-language-menu" role="listbox" aria-label={t('common.language')}>
            <li className="velvet-language-menu-item" role="none">
              <a
                href={destinationFor('pt-BR')}
                onClick={(event) => changeLocale(event, 'pt-BR')}
                className={`velvet-language-menu-link${isPt ? ' is-active' : ''}`}
                role="option"
                aria-selected={isPt}
                lang="pt-BR"
              >
                <BrazilFlag size={18} />
                <span>Português</span>
                {isPt && <CheckIcon className="velvet-language-menu-check" />}
              </a>
            </li>
            <li className="velvet-language-menu-item" role="none">
              <a
                href={destinationFor('en')}
                onClick={(event) => changeLocale(event, 'en')}
                className={`velvet-language-menu-link${!isPt ? ' is-active' : ''}`}
                role="option"
                aria-selected={!isPt}
                lang="en"
              >
                <UsaFlag size={18} />
                <span>English</span>
                {!isPt && <CheckIcon className="velvet-language-menu-check" />}
              </a>
            </li>
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className={`velvet-language-selector${compact ? ' is-compact' : ''}${expanded ? ' is-expanded' : ''}`} role="group" aria-label={t('common.language')}>
      <a href={destinationFor('pt-BR')} onClick={(event) => changeLocale(event, 'pt-BR')} aria-current={locale === 'pt-BR' ? 'page' : undefined} lang="pt-BR">{expanded ? t('common.portuguese') : 'PT'}</a>
      {!expanded && <span aria-hidden="true">/</span>}
      <a href={destinationFor('en')} onClick={(event) => changeLocale(event, 'en')} aria-current={locale === 'en' ? 'page' : undefined} lang="en">{expanded ? t('common.english') : 'EN'}</a>
    </div>
  )
}

