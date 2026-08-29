'use server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAccount } from '@/modules/auth/dal'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { isProfileCanonicallyEligible } from './dal'
import type { PublishProfileActionState } from './types'

export async function publishProfileAction(_previousState: PublishProfileActionState, _formData: FormData): Promise<PublishProfileActionState> {
  const account = await requireAccount()
  const profile = await getProfileByAccountUserId(account.id)
  if (!profile) return { success: false, error: 'Perfil não encontrado.' }
  try {
    if (!(await isProfileCanonicallyEligible(account.id, profile.id))) return { success: false, error: 'Seu perfil ainda possui pendências. Atualize a página e revise os itens indicados.' }
    const admin = createAdminClient(); const now = new Date().toISOString()
    const { data: activated, error: profileError } = await admin.from('professional_profiles').update({ status: 'ACTIVE', updated_at: now }).eq('id', profile.id).eq('account_user_id', account.id).in('status', ['READY_FOR_REVIEW', 'ACTIVE']).select('id').maybeSingle()
    if (profileError || !activated) return { success: false, error: 'Não foi possível publicar seu perfil agora.' }
    const { error: accountError } = await admin.from('account_users').update({ onboarding_status: 'COMPLETED', onboarding_step: 6, updated_at: now }).eq('id', account.id)
    if (accountError) return { success: false, error: 'O perfil foi validado, mas não foi possível concluir o cadastro.' }
    if (!(await isProfileCanonicallyEligible(account.id, profile.id))) return { success: false, error: 'A elegibilidade mudou durante a publicação. Revise seu perfil.' }
  } catch (error) {
    console.error('[publication:publish] Failed closed:', error instanceof Error ? error.message : error)
    return { success: false, error: 'Não foi possível confirmar sua elegibilidade agora. Tente novamente.' }
  }
  redirect('/onboarding/revisar?published=1')
}
