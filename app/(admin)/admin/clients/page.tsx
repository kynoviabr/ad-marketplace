import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/modules/moderation/guards'

export default async function AdminClientsPage() {
  await requireAdmin()
  const admin = createAdminClient()
  const { data: clients } = await admin
    .from('account_users')
    .select('id, auth_user_id, client_memberships(membership_type)')
    .eq('role', 'CLIENT')
    .limit(50)

  async function toggleVip(formData: FormData) {
    'use server'
    const adminAccount = await requireAdmin()
    const accountId = formData.get('accountId') as string
    
    const adminClient = createAdminClient()

    const { data: targetAccount } = await adminClient
      .from('account_users')
      .select('id, role')
      .eq('id', accountId)
      .single()
    
    if (!targetAccount || targetAccount.role !== 'CLIENT') {
      throw new Error('Target is not a client')
    }

    const { data: membership } = await adminClient
      .from('client_memberships')
      .select('membership_type')
      .eq('account_id', accountId)
      .maybeSingle()
    
    const current = membership?.membership_type ?? 'FREE'
    const newType = current === 'VIP' ? 'FREE' : 'VIP'
    
    if (newType === 'VIP') {
      await adminClient.from('client_memberships').upsert({ account_id: accountId, membership_type: 'VIP' })
    } else {
      await adminClient.from('client_memberships').upsert({ account_id: accountId, membership_type: 'FREE' })
    }
    
    // Audit admin changes
    await adminClient.from('billing_admin_audit_logs').insert({
      admin_id: adminAccount.id,
      account_user_id: accountId,
      action: newType === 'VIP' ? 'ENTITLEMENT_OVERRIDE_GRANTED' : 'ENTITLEMENT_OVERRIDE_REVOKED',
      reason: 'Admin Panel Toggle',
      metadata: { override_type: 'VIP_MEMBERSHIP' }
    })
    revalidatePath('/admin/clients')
  }

  return (
    <div>
      <h1>Client VIP Management (Admin)</h1>
      <table style={{ width: '100%', textAlign: 'left', marginTop: '2rem' }}>
        <thead>
          <tr>
            <th>Account ID</th>
            <th>Membership</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {clients?.map((client: any) => {
            const memType = client.client_memberships?.[0]?.membership_type ?? 'FREE'
            return (
              <tr key={client.id}>
                <td>{client.id}</td>
                <td>{memType}</td>
                <td>
                  <form action={toggleVip}>
                    <input type="hidden" name="accountId" value={client.id} />
                    <button type="submit">{memType === 'VIP' ? 'Revoke VIP' : 'Grant VIP'}</button>
                  </form>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
