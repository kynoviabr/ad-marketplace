import type { Metadata } from 'next'
import { PublicHeader } from '@/components/public/public-header'
import { PublicFooter } from '@/components/public/public-footer'
import { PublicContainer } from '@/components/public/public-container'
import { getMarketplaceName } from '@/lib/brand'

/**
 * Home page — FASE 12.2A shell validation.
 *
 * Minimal implementation to validate:
 * - PublicHeader (brand, navigation, auth state, mobile drawer)
 * - PublicFooter (+18 notice, links)
 * - Typography (Plus Jakarta Sans + Inter)
 * - Design tokens (warm background, foreground colors)
 * - PublicContainer responsive padding
 *
 * This content will be ENTIRELY REPLACED in FASE 12.2B with:
 * - Compact discovery hero
 * - 8 profile preview cards
 * - Location zone grid (25 bairros)
 * - Trust row
 * - Professional acquisition section
 *
 * DO NOT ADD marketplace content here.
 * DO NOT implement discovery UX here.
 * FASE 12.2B implements the full Home experience.
 */
export async function generateMetadata(): Promise<Metadata> {
  const brandName = getMarketplaceName()
  return {
    title: `${brandName} — Em breve`,
    robots: { index: false, follow: false },
  }
}

export default async function HomePage() {
  const brandName = getMarketplaceName()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--color-background)',
      }}
    >
      <PublicHeader />

      <main
        id="main-content"
        tabIndex={-1}
        style={{ flex: 1 }}
      >
        <PublicContainer>
          <div
            style={{
              paddingTop: '80px',
              paddingBottom: '80px',
              textAlign: 'center',
            }}
          >
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(26px, 5vw, 48px)',
                fontWeight: 700,
                color: 'var(--color-foreground)',
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                marginBottom: '16px',
              }}
            >
              {brandName}
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '15px',
                color: 'var(--color-foreground-muted)',
                lineHeight: 1.6,
                maxWidth: '360px',
                margin: '0 auto',
              }}
            >
              Perfis verificados em São Paulo — em breve.
            </p>
          </div>
        </PublicContainer>
      </main>

      <PublicFooter />
    </div>
  )
}
