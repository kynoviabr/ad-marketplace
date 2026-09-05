'use server'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { requireAccount } from '@/modules/auth/dal'
import type { PublishProfileActionState } from './types'

export async function publishProfileAction(_previousState: PublishProfileActionState, _formData: FormData): Promise<PublishProfileActionState> {
  await requireAccount()
  try {
    const supabase = await createServerClient()
    const { error } = await supabase.rpc('publish_owned_profile')
    if (error) {
      if (error.message.includes('PROFILE_NOT_FOUND')) return { success: false, error: 'Perfil não encontrado.' }
      if (error.message.includes('MODERATION_REQUIRED')) return { success: false, error: 'A moderação do perfil ainda não foi concluída.' }
      if (error.message.includes('INVALID_STATE') || error.message.includes('PUBLICATION_GATE_FAILED')) {
        return { success: false, error: 'Seu perfil ainda possui pendências. Atualize a página e revise os itens indicados.' }
      }
      if (error.message.includes('ALREADY_ACTIVE')) return { success: false, error: 'Seu perfil já está publicado.' }
      return { success: false, error: 'Não foi possível publicar seu perfil agora.' }
    }
  } catch (error) {
    console.error('[publication:publish] Failed closed:', error instanceof Error ? error.message : error)
    return { success: false, error: 'Não foi possível confirmar sua elegibilidade agora. Tente novamente.' }
  }
  redirect('/onboarding/revisar?published=1')
}
