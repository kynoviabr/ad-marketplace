/**
 * (dashboard) route group layout
 * Protects all routes in this group server-side.
 * The proxy.ts handles redirect-level protection; this layout enforces
 * the data access layer requirement (double protection).
 */

import { requireAccount } from '@/modules/auth/dal'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Double protection: proxy.ts redirects unauthenticated users.
  // This layout enforces auth at the data layer level.
  await requireAccount()

  return (
    <main className="dashboard-layout">
      <div className="dashboard-container">{children}</div>
    </main>
  )
}
