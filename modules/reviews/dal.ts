import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AccountUser } from '@/modules/auth/types'
import type { PublicReviewsPage } from './types'

export const PUBLIC_REVIEW_PREVIEW_LIMIT = 3
export const PUBLIC_REVIEW_PAGE_SIZE = 10

export async function isConfirmedAdult(accountId: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('identity_verifications')
    .select('status, age_verified').eq('account_user_id', accountId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return data?.status === 'VERIFIED' && data.age_verified === true
}

export async function getReviewAccess(account: AccountUser | null, profileId: string) {
  if (!account) return { authenticated: false, adult: false, owner: false }
  const admin = createAdminClient()
  const [{ data: profile }, adult] = await Promise.all([
    admin.from('professional_profiles').select('account_user_id').eq('id', profileId).single(),
    isConfirmedAdult(account.id),
  ])
  return { authenticated: true, adult, owner: profile?.account_user_id === account.id }
}

export async function getPublicReviews(profileId: string, page = 1, pageSize = PUBLIC_REVIEW_PAGE_SIZE): Promise<PublicReviewsPage> {
  const admin = createAdminClient()
  const safePage = Math.max(1, Math.floor(page))
  const safeSize = Math.min(25, Math.max(1, Math.floor(pageSize)))
  const from = (safePage - 1) * safeSize
  const { data, count } = await admin.from('professional_reviews')
    .select('id,rating,comment,created_at,response:professional_review_responses(id,response,moderation_status)', { count: 'exact' })
    .eq('professional_profile_id', profileId).eq('moderation_status', 'APPROVED')
    .order('created_at', { ascending: false }).range(from, from + safeSize - 1)
  const { data: ratings } = await admin.from('professional_reviews').select('rating')
    .eq('professional_profile_id', profileId).eq('moderation_status', 'APPROVED')
  const total = count ?? 0
  const average = total ? (ratings ?? []).reduce((sum, item) => sum + item.rating, 0) / total : 0
  return {
    averageRating: Math.round(average * 10) / 10,
    totalReviews: total,
    items: (data ?? []).map((row: any) => {
      const response = Array.isArray(row.response) ? row.response[0] : row.response
      return { id: row.id, rating: row.rating, comment: row.comment, authorLabel: 'Velvet member', createdAt: row.created_at, professionalResponse: response?.moderation_status === 'APPROVED' ? response.response : null }
    }),
    page: safePage, pageSize: safeSize, totalPages: Math.max(1, Math.ceil(total / safeSize)),
  }
}

export async function getOwnerReviews(accountId: string) {
  const admin = createAdminClient()
  const { data: profile } = await admin.from('professional_profiles').select('id').eq('account_user_id', accountId).maybeSingle()
  if (!profile) return []
  const { data } = await admin.from('professional_reviews')
    .select('id,rating,comment,moderation_status,created_at,response:professional_review_responses(id,response,moderation_status)')
    .eq('professional_profile_id', profile.id).eq('moderation_status', 'APPROVED').order('created_at', { ascending: false })
  return data ?? []
}
