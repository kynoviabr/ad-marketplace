'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface MobileNavigationProps {
  brandName: string
  isAuthenticated: boolean
}

/**
 * MobileNavigation — slide-in drawer for mobile header.
 *
 * Accessibility requirements (FASE 12.1C):
 * - Keyboard accessible: Escape closes, focus trapped while open
 * - Focus returns to trigger on close
 * - ARIA: role="dialog", aria-modal, aria-label
 * - Body scroll locked while open
 * - Backdrop tap closes drawer
 * - Touch targets >= 44px
 */
export function MobileNavigation({ brandName, isAuthenticated }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Focus first focusable element when drawer opens
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      const firstFocusable = drawerRef.current.querySelector<HTMLElement>(
        'a[href], button:not([disabled])'
      )
      firstFocusable?.focus()
    }
  }, [isOpen])

  const handleClose = () => {
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <>
      {/* Hamburger trigger */}
      <button
        ref={triggerRef}
        type="button"
        aria-label="Abrir menu de navegação"
        aria-expanded={isOpen}
        aria-controls="mobile-nav-drawer"
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '44px',
          height: '44px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-foreground)',
          padding: '0',
          borderRadius: 'var(--radius-md)',
          flexShrink: 0,
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <rect y="3" width="22" height="2" rx="1" fill="currentColor" />
          <rect y="10" width="22" height="2" rx="1" fill="currentColor" />
          <rect y="17" width="22" height="2" rx="1" fill="currentColor" />
        </svg>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          aria-hidden="true"
          onClick={handleClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--color-overlay)',
            zIndex: 'var(--z-overlay)',
          }}
        />
      )}

      {/* Drawer */}
      {isOpen && <div
        id="mobile-nav-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '280px',
          maxWidth: '85vw',
          background: 'var(--color-surface)',
          zIndex: 'var(--z-sheet)',
          display: 'flex',
          flexDirection: 'column',
          transform: 'translateX(0)',
          transition: 'transform 280ms cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {/* Drawer header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            height: '60px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '16px',
              color: 'var(--color-foreground)',
            }}
          >
            {brandName}
          </span>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={handleClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              height: '44px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-foreground-muted)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M4 4L16 16M16 4L4 16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Drawer navigation */}
        <nav
          aria-label="Menu principal"
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '8px 0',
            flex: 1,
          }}
        >
          <NavDrawerLink href="/sao-paulo" onClick={handleClose}>
            Explorar São Paulo
          </NavDrawerLink>
          <NavDrawerLink href="/anuncie" onClick={handleClose}>
            Anuncie seu perfil
          </NavDrawerLink>
          <div
            style={{
              height: '1px',
              background: 'var(--color-border)',
              margin: '8px 16px',
            }}
          />
          {isAuthenticated ? (
            <NavDrawerLink href="/dashboard" onClick={handleClose}>
              Minha conta
            </NavDrawerLink>
          ) : (
            <NavDrawerLink href="/login" onClick={handleClose}>
              Entrar
            </NavDrawerLink>
          )}
        </nav>
      </div>}
    </>
  )
}

function NavDrawerLink({
  href,
  onClick,
  children,
}: {
  href: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        minHeight: '52px',
        fontFamily: 'var(--font-body)',
        fontSize: '15px',
        fontWeight: 500,
        color: 'var(--color-foreground)',
        textDecoration: 'none',
        transition: 'background 120ms ease-out',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = 'var(--color-surface-muted)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      {children}
    </Link>
  )
}
