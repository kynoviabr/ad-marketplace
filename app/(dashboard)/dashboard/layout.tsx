import { requireAdvertiser } from '@/modules/moderation/guards'

export const dynamic = 'force-dynamic'

export default async function AdvertiserDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side Advertiser Role Barrier:
  // Blocks ADMIN (redirects to /admin) and CLIENT (redirects to /cliente).
  await requireAdvertiser()

  return <>{children}</>
}
