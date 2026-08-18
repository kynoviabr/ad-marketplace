import { getPendingProfileQueue } from '@/modules/moderation/dal'
import { ProfileModerationCard } from '@/components/admin/profile-moderation-card'

export const dynamic = 'force-dynamic'

export default async function AdminProfilesPage() {
  const pendingProfiles = await getPendingProfileQueue()

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '0.5rem' }}>
          Moderação de Conteúdo de Perfis
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
          Perfis completos ou com textos alterados aguardando aprovação editorial. Total na fila: {pendingProfiles.length}
        </p>
      </div>

      <ProfileModerationCard initialProfiles={pendingProfiles} />
    </div>
  )
}
