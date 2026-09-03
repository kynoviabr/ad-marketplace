import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/modules/moderation/guards'

export default async function AdminAudiencePage() {
  await requireAdmin()
  const admin = createAdminClient()
  const { data: profiles } = await admin
    .from('professional_profiles')
    .select('id, stage_name, audience_setting, account_id')
    .limit(50)

  async function toggleAudience(formData: FormData) {
    'use server'
    const adminAccount = await requireAdmin()
    const profileId = formData.get('profileId') as string
    
    const adminClient = createAdminClient()

    const { data: currentProfile } = await adminClient
      .from('professional_profiles')
      .select('audience_setting, account_id')
      .eq('id', profileId)
      .single()
    
    if (!currentProfile) throw new Error('Profile not found')

    const newType = currentProfile.audience_setting === 'VIP_ONLY' ? 'PUBLIC' : 'VIP_ONLY'
    
    await adminClient.from('professional_profiles').update({ audience_setting: newType }).eq('id', profileId)
    
    // Audit admin changes
    await adminClient.from('billing_admin_audit_logs').insert({
      admin_id: adminAccount.id,
      account_user_id: currentProfile.account_id,
      action: newType === 'VIP_ONLY' ? 'AUDIENCE_SET_VIP_ONLY' : 'AUDIENCE_SET_PUBLIC',
      reason: 'Admin Panel Toggle',
      metadata: { profile_id: profileId, old_audience_setting: currentProfile.audience_setting, new_audience_setting: newType }
    })
    revalidatePath('/admin/profiles/audience')
  }

  return (
    <div>
      <h1>Audience Control Management (Admin)</h1>
      <table style={{ width: '100%', textAlign: 'left', marginTop: '2rem' }}>
        <thead>
          <tr>
            <th>Profile ID</th>
            <th>Stage Name</th>
            <th>Audience Setting</th>
            <th>Action</th>
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
                  <button type="submit">Toggle to {p.audience_setting === 'VIP_ONLY' ? 'PUBLIC' : 'VIP_ONLY'}</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
