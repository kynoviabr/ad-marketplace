'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAccount } from '@/modules/auth/dal'
import { isConfirmedAdult } from './dal'
import { SubmitReviewSchema, ReviewResponseSchema, ReportReviewSchema } from './schemas'

export type ReviewActionResult = { success: boolean; error?: string; status?: 'PENDING' }

export async function submitReviewAction(input: { profileId: string; rating: number; comment?: string }): Promise<ReviewActionResult> {
  const parsed = SubmitReviewSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Avaliação inválida.' }
  const account = await requireAccount()
  if (!(await isConfirmedAdult(account.id))) return { success: false, error: 'A maioridade precisa estar confirmada.' }
  const admin = createAdminClient()
  const { data: profile } = await admin.from('professional_profiles').select('id,account_user_id,slug,status').eq('id', parsed.data.profileId).single()
  if (!profile || profile.status !== 'ACTIVE') return { success: false, error: 'Perfil indisponível.' }
  if (profile.account_user_id === account.id) return { success: false, error: 'Você não pode avaliar o próprio perfil.' }
  const { error } = await admin.from('professional_reviews').upsert({
    professional_profile_id: profile.id, reviewer_account_user_id: account.id,
    rating: parsed.data.rating, comment: parsed.data.comment,
    moderation_status: 'PENDING', moderation_reason: null, moderated_by: null, moderated_at: null,
  }, { onConflict: 'professional_profile_id,reviewer_account_user_id' })
  if (error) return { success: false, error: 'Não foi possível enviar a avaliação.' }
  revalidatePath(`/perfil/${profile.slug}`)
  return { success: true, status: 'PENDING' }
}

export async function saveProfessionalResponseAction(input: { reviewId: string; response: string }): Promise<ReviewActionResult> {
  const parsed = ReviewResponseSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Resposta inválida.' }
  const account = await requireAccount()
  const admin = createAdminClient()
  const { data: review } = await admin.from('professional_reviews').select('id,professional_profile_id,profile:professional_profiles(account_user_id,slug)').eq('id', parsed.data.reviewId).eq('moderation_status', 'APPROVED').single()
  const profile = Array.isArray((review as any)?.profile) ? (review as any).profile[0] : (review as any)?.profile
  if (!review || profile?.account_user_id !== account.id) return { success: false, error: 'Operação não autorizada.' }
  const { error } = await admin.from('professional_review_responses').upsert({
    review_id: review.id, professional_account_user_id: account.id, response: parsed.data.response,
    moderation_status: 'PENDING', moderation_reason: null, moderated_by: null, moderated_at: null,
  }, { onConflict: 'review_id' })
  if (error) return { success: false, error: 'Não foi possível salvar a resposta.' }
  revalidatePath('/dashboard/reviews'); revalidatePath(`/perfil/${profile.slug}`)
  return { success: true, status: 'PENDING' }
}

export async function reportReviewAction(input: { reviewId: string; reason: string; description?: string }): Promise<ReviewActionResult> {
  const parsed = ReportReviewSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Denúncia inválida.' }
  const account = await requireAccount()
  if (!(await isConfirmedAdult(account.id))) return { success: false, error: 'A maioridade precisa estar confirmada.' }
  const admin = createAdminClient()
  const { data: review } = await admin.from('professional_reviews').select('id').eq('id', parsed.data.reviewId).eq('moderation_status', 'APPROVED').maybeSingle()
  if (!review) return { success: false, error: 'Avaliação indisponível.' }
  const { error } = await admin.from('review_reports').upsert({ review_id: review.id, reporter_account_user_id: account.id, reason_category: parsed.data.reason, description: parsed.data.description, status: 'OPEN' }, { onConflict: 'review_id,reporter_account_user_id' })
  return error ? { success: false, error: 'Não foi possível enviar a denúncia.' } : { success: true }
}
