import { PublicHeader } from '@/components/public/public-header'
import { PublicFooter } from '@/components/public/public-footer'
import { VelvetAppBottomNav } from '@/components/pwa'
import { getPublicAccount } from '@/components/public/public-auth-state'

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
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const account = await getPublicAccount()
  const role = account?.role ?? 'CLIENT'

  return (
    <div className="velvet-public-shell">
      <PublicHeader />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <PublicFooter />
      {/* Standalone client/visitor bottom navigation (hidden in normal browser web mode) */}
      <VelvetAppBottomNav role={role === 'ADVERTISER' ? 'ADVERTISER' : 'CLIENT'} />
    </div>
  )
}
