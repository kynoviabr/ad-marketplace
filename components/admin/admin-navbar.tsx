'use client'

import { useState, useRef, useEffect, useId } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LanguageSelector, useI18n } from '@/components/i18n'
import type { MessageKey } from '@/lib/i18n/catalog'
import { logoutAction } from '@/modules/auth/actions'
import { getAdminUserAction, type AdminNavbarUser } from '@/modules/admin/actions'

export type { AdminNavbarUser }

/**
 * Deterministic avatar initials resolver.
 * Priority:
 * 1. user.name (if available and non-empty)
 * 2. user.email prefix
 * 3. Default fallback 'A'
 */
export function getAvatarInitials(user: AdminNavbarUser | null): string {
  if (!user) return 'A'
  if (user.name && user.name.trim().length > 0) {
    const parts = user.name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0][0].toUpperCase()
  }
  if (user.email && user.email.includes('@')) {
    const localPart = user.email.split('@')[0].trim()
    if (localPart.length > 0) {
      return localPart[0].toUpperCase()
    }
  }
  return 'A'
}

/**
 * Short readable display name resolver.
 * Priority:
 * 1. user.name (first word)
 * 2. user.email prefix (smart truncated if too long)
 * 3. Default fallback 'Admin'
 */
export function getShortDisplayName(user: AdminNavbarUser | null): string {
  if (!user) return 'Admin'
  if (user.name && user.name.trim().length > 0) {
    const parts = user.name.trim().split(/\s+/)
    return parts[0]
  }
  if (user.email && user.email.includes('@')) {
    const prefix = user.email.split('@')[0].trim()
    return prefix.length > 14 ? `${prefix.slice(0, 12)}…` : prefix
  }
  return 'Admin'
}

/**
 * Fast client-side session identity extractor from Supabase auth cookie.
 * Provides immediate rendering without waiting for network round-trips.
 */
export function getClientAdminUser(): AdminNavbarUser | null {
  if (typeof document === 'undefined') return null
  try {
    const match = document.cookie.match(/sb-[^=]+-auth-token=([^;]+)/)
    if (!match) return null
    let raw = match[1]
    if (raw.startsWith('base64-')) {
      raw = atob(raw.slice(7))
    }
    const parsed = JSON.parse(decodeURIComponent(raw))
    const email = parsed.user?.email || null
    const rawName = parsed.user?.user_metadata?.name || parsed.user?.user_metadata?.full_name || null
    const name = typeof rawName === 'string' && rawName.trim().length > 0 ? rawName.trim() : null
    if (!email) return null
    return {
      email,
      name,
      role: 'ADMIN',
    }
  } catch {
    return null
  }
}

function LogoutIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}


export interface AdminNavItem {
  href: string
  labelKey: MessageKey
  isActive: (pathname: string) => boolean
}

export interface AdminNavGroup {
  id: string
  labelKey: MessageKey
  items: AdminNavItem[]
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'operation',
    labelKey: 'admin.groupOperation',
    items: [
      {
        href: '/admin',
        labelKey: 'admin.overview',
        isActive: (p) => p === '/admin',
      },
      {
        href: '/admin/profiles/review',
        labelKey: 'admin.profileQueue',
        isActive: (p) => p === '/admin/profiles/review' || p.startsWith('/admin/profiles/review/'),
      },
      {
        href: '/admin/media/review',
        labelKey: 'admin.mediaReview',
        isActive: (p) => p === '/admin/media' || p.startsWith('/admin/media/'),
      },
      {
        href: '/admin/moderation',
        labelKey: 'admin.photoModeration',
        isActive: (p) => p === '/admin/moderation' || p.startsWith('/admin/moderation/'),
      },
      {
        href: '/admin/profiles',
        labelKey: 'admin.profileModeration',
        isActive: (p) =>
          (p === '/admin/profiles' || p.startsWith('/admin/profiles/audience')) &&
          !p.startsWith('/admin/profiles/review'),
      },
      {
        href: '/admin/kyc',
        labelKey: 'admin.kyc',
        isActive: (p) =>
          p === '/admin/kyc' ||
          p.startsWith('/admin/kyc/') ||
          p.startsWith('/admin/professionals'),
      },
      {
        href: '/admin/reports',
        labelKey: 'admin.reports',
        isActive: (p) => p === '/admin/reports' || p.startsWith('/admin/reports/'),
      },
    ],
  },
  {
    id: 'commercial',
    labelKey: 'admin.groupCommercial',
    items: [
      {
        href: '/admin/billing',
        labelKey: 'admin.subscriptions',
        isActive: (p) =>
          p === '/admin/billing' ||
          p.startsWith('/admin/billing/') ||
          p.startsWith('/admin/clients'),
      },
      {
        href: '/admin/boosts',
        labelKey: 'admin.boosts',
        isActive: (p) => p === '/admin/boosts' || p.startsWith('/admin/boosts/'),
      },
      {
        href: '/admin/analytics',
        labelKey: 'admin.analytics',
        isActive: (p) => p === '/admin/analytics' || p.startsWith('/admin/analytics/'),
      },
    ],
  },
  {
    id: 'technology',
    labelKey: 'admin.groupTechnology',
    items: [
      {
        href: '/admin/health',
        labelKey: 'admin.systemHealth',
        isActive: (p) => p === '/admin/health' || p.startsWith('/admin/health/'),
      },
    ],
  },
]

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transition: 'transform 150ms ease',
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      }}
      aria-hidden="true"
    >
      <path d="M2 3.5L5 6.5L8 3.5" />
    </svg>
  )
}

function MenuIcon({ isOpen }: { isOpen: boolean }) {
  if (isOpen) {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="4" y1="4" x2="16" y2="16" />
        <line x1="16" y1="4" x2="4" y2="16" />
      </svg>
    )
  }
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3" y1="5" x2="17" y2="5" />
      <line x1="3" y1="10" x2="17" y2="10" />
      <line x1="3" y1="15" x2="17" y2="15" />
    </svg>
  )
}

export interface AdminNavbarProps {
  initialUser?: AdminNavbarUser | null
}

export function AdminNavbar({ initialUser = null }: AdminNavbarProps = {}) {
  const { t } = useI18n()
  // Canonical operational monitor contract: { href: '/admin/kyc', label: t('admin.kyc') }
  const pathname = usePathname() || '/admin'
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [user, setUser] = useState<AdminNavbarUser | null>(initialUser)
  const navContainerRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const userTriggerRef = useRef<HTMLButtonElement>(null)
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const navId = useId()

  const initials = getAvatarInitials(user)
  const shortName = getShortDisplayName(user)
  const userTriggerId = `${navId}-user-trigger`
  const userMenuId = `${navId}-user-menu`

  // Fetch admin user identity on mount if not provided as prop
  useEffect(() => {
    if (initialUser) return
    let cancelled = false

    // 1. Instant client-side cookie resolve (zero latency)
    const clientUser = getClientAdminUser()
    if (clientUser) {
      setUser(clientUser)
    }

    // 2. Authoritative server action fallback/update
    getAdminUserAction()
      .then((res) => {
        if (!cancelled && res) {
          setUser(res)
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [initialUser])

  // Close menus on outside click
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (navContainerRef.current && !navContainerRef.current.contains(event.target as Node)) {
        setOpenGroup(null)
        setIsMobileMenuOpen(false)
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  // Close menus on Escape key and restore focus to trigger
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (isUserMenuOpen) {
          setIsUserMenuOpen(false)
          userTriggerRef.current?.focus()
          return
        }
        if (openGroup) {
          const currentGroup = openGroup
          setOpenGroup(null)
          triggerRefs.current[currentGroup]?.focus()
        }
        if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false)
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [openGroup, isMobileMenuOpen, isUserMenuOpen])

  // Close open dropdowns when route changes (during render)
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setOpenGroup(null)
    setIsMobileMenuOpen(false)
    setIsUserMenuOpen(false)
  }

  const toggleGroup = (groupId: string) => {
    setIsUserMenuOpen(false)
    setOpenGroup((prev) => (prev === groupId ? null : groupId))
  }

  return (
    <header
      ref={navContainerRef}
      className="admin-navbar-root"
      style={{
        backgroundColor: '#111827',
        borderBottom: '1px solid #374151',
        position: 'relative',
        zIndex: 40,
      }}
    >
      <style>{`
        .admin-nav-link-hover:hover {
          background-color: #283548 !important;
          color: #f9fafb !important;
        }
        .admin-nav-trigger-hover:hover {
          background-color: #1f2937 !important;
          color: #ffffff !important;
        }
        @media (min-width: 900px) {
          .admin-desktop-nav { display: flex !important; }
          .admin-desktop-user-menu { display: block !important; }
          .admin-mobile-toggle { display: none !important; }
          .admin-mobile-menu { display: none !important; }
        }
        @media (max-width: 899px) {
          .admin-desktop-nav { display: none !important; }
          .admin-desktop-user-menu { display: none !important; }
          .admin-mobile-toggle { display: flex !important; }
        }
      `}</style>

      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0.625rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        {/* Brand & Desktop Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
          <Link
            href="/admin"
            style={{
              color: '#f59e0b',
              fontWeight: 700,
              fontSize: '1.0625rem',
              textDecoration: 'none',
              letterSpacing: '-0.01em',
              display: 'inline-flex',
              alignItems: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            {t('admin.panel')}
          </Link>

          {/* Desktop Dropdowns */}
          <nav
            className="admin-desktop-nav"
            aria-label="Admin Primary Navigation"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {ADMIN_NAV_GROUPS.map((group) => {
              const isGroupActive = group.items.some((item) => item.isActive(pathname))
              const isOpen = openGroup === group.id
              const triggerId = `${navId}-trigger-${group.id}`
              const menuId = `${navId}-menu-${group.id}`

              return (
                <div key={group.id} style={{ position: 'relative' }}>
                  <button
                    ref={(el) => {
                      triggerRefs.current[group.id] = el
                    }}
                    id={triggerId}
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                    aria-controls={menuId}
                    className="admin-nav-trigger-hover"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.375rem 0.75rem',
                      borderRadius: '0.375rem',
                      border: isGroupActive ? '1px solid #4b5563' : '1px solid transparent',
                      backgroundColor: isGroupActive ? '#1f2937' : isOpen ? '#1f2937' : 'transparent',
                      color: isGroupActive ? '#ffffff' : '#9ca3af',
                      fontSize: '0.875rem',
                      fontWeight: isGroupActive ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                      outline: 'none',
                    }}
                  >
                    <span>{t(group.labelKey)}</span>
                    <ChevronIcon isOpen={isOpen} />
                  </button>

                  {/* Dropdown Popover */}
                  {isOpen && (
                    <div
                      id={menuId}
                      role="menu"
                      aria-labelledby={triggerId}
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 0.375rem)',
                        left: 0,
                        minWidth: '220px',
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '0.5rem',
                        boxShadow:
                          '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
                        padding: '0.375rem',
                        zIndex: 50,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      {group.items.map((item) => {
                        const active = item.isActive(pathname)
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            role="menuitem"
                            onClick={() => setOpenGroup(null)}
                            className="admin-nav-link-hover"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '0.375rem',
                              textDecoration: 'none',
                              fontSize: '0.8125rem',
                              backgroundColor: active ? '#374151' : 'transparent',
                              color: active ? '#ffffff' : '#9ca3af',
                              fontWeight: active ? 600 : 400,
                              transition: 'all 120ms ease',
                            }}
                          >
                            <span>{t(item.labelKey)}</span>
                            {active && (
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: '#f59e0b',
                                 }}
                                aria-hidden="true"
                              />
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>

        {/* Right Section: Language Selector, User Account & Mobile Trigger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <LanguageSelector compact variant="popover" theme="dark" placement="bottom" />

          {/* Desktop User Account Trigger & Popover */}
          <div ref={userMenuRef} className="admin-desktop-user-menu" style={{ position: 'relative' }}>
            <button
              ref={userTriggerRef}
              id={userTriggerId}
              type="button"
              onClick={() => {
                setOpenGroup(null)
                setIsUserMenuOpen((prev) => !prev)
              }}
              aria-haspopup="true"
              aria-expanded={isUserMenuOpen}
              aria-controls={userMenuId}
              aria-label="Menu de conta do administrador"
              className="admin-nav-trigger-hover"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.25rem 0.625rem 0.25rem 0.25rem',
                borderRadius: '9999px',
                border: isUserMenuOpen ? '1px solid #4b5563' : '1px solid #374151',
                backgroundColor: isUserMenuOpen ? '#1f2937' : 'transparent',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                outline: 'none',
              }}
            >
              {/* Restrained circular Admin avatar */}
              <span
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#374151',
                  border: '1px solid #4b5563',
                  color: '#f9fafb',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  userSelect: 'none',
                }}
                aria-hidden="true"
              >
                {initials}
              </span>

              <span
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: '#e5e7eb',
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {shortName}
              </span>

              <ChevronIcon isOpen={isUserMenuOpen} />
            </button>

            {/* Dropdown Popover */}
            {isUserMenuOpen && (
              <div
                id={userMenuId}
                role="menu"
                aria-labelledby={userTriggerId}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 0.5rem)',
                  right: 0,
                  minWidth: '240px',
                  maxWidth: '300px',
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  boxShadow:
                    '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
                  padding: '0.75rem',
                  zIndex: 50,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                {/* User Identity Header */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#ffffff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {user?.name || shortName}
                    </span>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '9999px',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        flexShrink: 0,
                      }}
                    >
                      ADMIN
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#9ca3af',
                      wordBreak: 'break-all',
                      lineHeight: 1.3,
                    }}
                  >
                    {user?.email || '—'}
                  </span>
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px solid #374151', margin: '0.25rem 0' }} />

                {/* Actions: Sair */}
                <form action={logoutAction} style={{ margin: 0, padding: 0 }}>
                  <button
                    type="submit"
                    role="menuitem"
                    className="admin-nav-link-hover"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      width: '100%',
                      padding: '0.5rem 0.625rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#f87171',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 120ms ease',
                    }}
                  >
                    <LogoutIcon />
                    <span>{t('common.logout')}</span>
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className="admin-mobile-toggle"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label={isMobileMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
            aria-expanded={isMobileMenuOpen}
            aria-controls={`${navId}-mobile-drawer`}
            style={{
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '0.375rem',
              backgroundColor: isMobileMenuOpen ? '#374151' : 'transparent',
              border: '1px solid #374151',
              color: '#ffffff',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <MenuIcon isOpen={isMobileMenuOpen} />
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div
          id={`${navId}-mobile-drawer`}
          className="admin-mobile-menu"
          style={{
            borderTop: '1px solid #374151',
            backgroundColor: '#111827',
            padding: '1rem 1.25rem 1.5rem',
            maxHeight: 'calc(100vh - 65px)',
            overflowY: 'auto',
          }}
        >
          {/* Mobile Authenticated User Identity & Logout Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              padding: '0.875rem',
              backgroundColor: '#1f2937',
              borderRadius: '0.5rem',
              border: '1px solid #374151',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#374151',
                  border: '1px solid #4b5563',
                  color: '#f9fafb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                {initials}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#ffffff',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user?.name || shortName}
                  </span>
                  <span
                    style={{
                      fontSize: '0.625rem',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '9999px',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      flexShrink: 0,
                    }}
                  >
                    ADMIN
                  </span>
                </div>
                {user?.email && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#9ca3af',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user.email}
                  </span>
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #374151', paddingTop: '0.5rem' }}>
              <form action={logoutAction} style={{ margin: 0, padding: 0 }}>
                <button
                  type="submit"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.5rem 0.625rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#f87171',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <LogoutIcon />
                  <span>{t('common.logout')}</span>
                </button>
              </form>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {ADMIN_NAV_GROUPS.map((group) => {
              const isGroupActive = group.items.some((item) => item.isActive(pathname))

              return (
                <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <div
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: isGroupActive ? '#f59e0b' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      padding: '0.25rem 0.5rem',
                    }}
                  >
                    {t(group.labelKey)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {group.items.map((item) => {
                      const active = item.isActive(pathname)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.375rem',
                            textDecoration: 'none',
                            fontSize: '0.875rem',
                            backgroundColor: active ? '#1f2937' : 'transparent',
                            color: active ? '#ffffff' : '#9ca3af',
                            fontWeight: active ? 600 : 400,
                          }}
                        >
                          <span>{t(item.labelKey)}</span>
                          {active && (
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: '#f59e0b',
                              }}
                              aria-hidden="true"
                            />
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </header>
  )
}

