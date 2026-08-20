import { PublicHeader } from '@/components/public/public-header'
import { PublicFooter } from '@/components/public/public-footer'

/**
 * (public) route group layout — Public Marketplace Shell
 *
 * Wraps all public marketplace routes with PublicHeader and PublicFooter.
 * Route group uses parentheses — (public) — so it does NOT appear in URLs.
 *
 * Public routes in this group (FASE 12.2A+):
 * - / (Home — currently dev placeholder, full Home in FASE 12.2B)
 *
 * Future routes (later subphases):
 * - /sao-paulo
 * - /sao-paulo/[bairro]
 * - /perfil/[slug]
 * - /anuncie
 *
 * IMPORTANT: The [city] dynamic route at app/[city]/* and existing auth/
 * dashboard routes are NOT in this group — they use their own layouts.
 * This layout only wraps routes explicitly placed inside app/(public)/.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
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
        {children}
      </main>
      <PublicFooter />
    </div>
  )
}
