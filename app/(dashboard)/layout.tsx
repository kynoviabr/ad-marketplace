/**
 * (dashboard) route group layout
 * Protects all routes in this group server-side.
 * The proxy.ts handles redirect-level protection; this layout enforces
 * the data access layer requirement (double protection).
 */

import { requireAccount } from '@/modules/auth/dal'
import { VelvetAppShell } from '@/components/pwa'

export const metadata = { robots: { index: false, follow: false } }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Double protection: proxy.ts redirects unauthenticated users.
  // This layout enforces auth at the data layer level.
  const account = await requireAccount()

  return (
    <VelvetAppShell role={account.role}>
      <main className="dashboard-layout">
        <div className="dashboard-container">{children}</div>
      </main>
    </VelvetAppShell>
  )
}
