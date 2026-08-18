import { requireAdmin } from '@/modules/moderation/guards'
import { AdminNavbar } from '@/components/admin/admin-navbar'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side Admin Authorization Barrier
  await requireAdmin()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#111827', color: '#f9fafb' }}>
      <AdminNavbar />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {children}
      </main>
    </div>
  )
}
