import Link from 'next/link'
import { getMarketplaceName } from '@/lib/brand'
import { getSession } from '@/modules/auth/dal'
import { MobileNavigation } from './mobile-navigation'

/**
 * PublicHeader — sticky top navigation for all public marketplace pages.
 *
 * Server Component. Reads brand name and auth session server-side.
 * Passes `isAuthenticated` boolean to MobileNavigation client component.
 * Does NOT pass raw user data to the client.
 *
 * Visual contract (FASE 12.1C):
 * - Desktop: brand left | nav center | auth+anuncie right
 * - Mobile: brand left | anuncie text | hamburger
 * - Height: 60px mobile, 64px desktop
 * - Sticky, z-index: var(--z-sticky)
 * - Warm surface, 1px bottom border
 * - No mega menu, no color buttons, no visual clutter
 */
export async function PublicHeader() {
  const brandName = getMarketplaceName()
  const user = await getSession()
  const isAuthenticated = Boolean(user)

  return (
    <>
      {/* Skip to content — accessibility fast-path */}
      <a className="skip-to-content" href="#main-content">
        Ir para o conteúdo principal
      </a>

      <header
        role="banner"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 'var(--z-sticky)',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          height: '60px',
        }}
      >
        <div
          style={{
            maxWidth: 'var(--container-xl)',
            margin: '0 auto',
            padding: '0 16px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          {/* Brand / Logo */}
          <Link
            href="/"
            aria-label={`${brandName} — página inicial`}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--color-foreground)',
              textDecoration: 'none',
              letterSpacing: '-0.01em',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {brandName}
          </Link>

          {/* Desktop navigation — hidden on mobile */}
          <nav
            aria-label="Navegação principal"
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '8px',
              flex: 1,
              justifyContent: 'flex-end',
            }}
            className="public-header-desktop-nav"
          >
            <DesktopNavLink href="/sao-paulo">Explorar</DesktopNavLink>

            {/* Separator */}
            <div
              aria-hidden="true"
              style={{
                width: '1px',
                height: '18px',
                background: 'var(--color-border)',
                margin: '0 4px',
              }}
            />

            <DesktopNavLink href="/anuncie" subtle>
              Anuncie
            </DesktopNavLink>

            {isAuthenticated ? (
              <DesktopNavLink href="/dashboard">Minha conta</DesktopNavLink>
            ) : (
              <DesktopNavLink href="/login">Entrar</DesktopNavLink>
            )}
          </nav>

          {/* Mobile right cluster — visible on mobile only */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            className="public-header-mobile-cluster"
          >
            {/* Anuncie text link — always visible on mobile */}
            <Link
              href="/anuncie"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--color-foreground-2)',
                textDecoration: 'none',
                padding: '0 8px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              Anuncie
            </Link>

            {/* Hamburger (MobileNavigation is a Client Component) */}
            <MobileNavigation brandName={brandName} isAuthenticated={isAuthenticated} />
          </div>
        </div>
      </header>

      {/* Responsive breakpoint styles via inline style tag */}
      <style>{`
        @media (min-width: 768px) {
          .public-header-desktop-nav { display: flex !important; }
          .public-header-mobile-cluster { display: none !important; }
        }
        @media (min-width: 768px) {
          header[role="banner"] { height: 64px; }
        }
      `}</style>
    </>
  )
}

function DesktopNavLink({
  href,
  children,
  subtle = false,
}: {
  href: string
  children: React.ReactNode
  subtle?: boolean
}) {
  return (
    <Link
      href={href}
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: '14px',
        fontWeight: subtle ? 400 : 500,
        color: subtle ? 'var(--color-foreground-2)' : 'var(--color-foreground)',
        textDecoration: 'none',
        padding: '8px 12px',
        borderRadius: 'var(--radius-md)',
        whiteSpace: 'nowrap',
        transition: 'background 120ms ease-out',
      }}
    >
      {children}
    </Link>
  )
}
