import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/modules/moderation/guards'
import { getTranslations } from '@/lib/i18n/server'

export default async function AdminAudiencePage() {
  await requireAdmin()
  const { locale } = await getTranslations()
  const admin = createAdminClient()
  const { data: profiles } = await admin
    .from('professional_profiles')
    .select('id, stage_name, audience_setting, account_user_id')
    .limit(50)

  async function toggleAudience(formData: FormData) {
    'use server'
    const adminAccount = await requireAdmin()
    const profileId = formData.get('profileId') as string
    
    const adminClient = createAdminClient()

    const { data: currentProfile } = await adminClient
      .from('professional_profiles')
      .select('audience_setting, account_user_id')
      .eq('id', profileId)
      .single()
    
    if (!currentProfile) throw new Error('Profile not found')

    const newType = currentProfile.audience_setting === 'VIP_ONLY' ? 'PUBLIC' : 'VIP_ONLY'
    
    // Atomic audience update + audit log via PostgreSQL RPC (PX7 / Backlog Item B)
    // Audited as actor_account_user_id: adminAccount.id and target_account_user_id: currentProfile.account_user_id
    const { error: rpcError } = await adminClient.rpc('admin_set_profile_audience', {
      p_actor_account_user_id: adminAccount.id,
      p_profile_id: profileId,
      p_audience_setting: newType,
    })

    if (rpcError) {
      throw new Error(`Falha ao alterar audiência: ${rpcError.message}`)
    }

    revalidatePath('/admin/profiles/audience')
  }

  return (
    <div>
      <h1>{locale === 'en' ? 'Audience Control (Admin)' : 'Controle de audiência (Admin)'}</h1>
      <table style={{ width: '100%', textAlign: 'left', marginTop: '2rem' }}>
        <thead>
          <tr>
            <th>Profile ID</th>
            <th>{locale === 'en' ? 'Stage name' : 'Nome artístico'}</th>
            <th>{locale === 'en' ? 'Audience' : 'Audiência'}</th>
            <th>{locale === 'en' ? 'Action' : 'Ação'}</th>
          </tr>
        </thead>
        <tbody>
          {profiles?.map((p: any) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.stage_name}</td>
              <td>{p.audience_setting}</td>
              <td>
                <form action={toggleAudience}>
                  <input type="hidden" name="profileId" value={p.id} />
                  <button type="submit">{locale === 'en' ? 'Set' : 'Definir'} {p.audience_setting === 'VIP_ONLY' ? 'PUBLIC' : 'VIP_ONLY'}</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
