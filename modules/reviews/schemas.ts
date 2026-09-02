import { z } from 'zod'

export const SubmitReviewSchema = z.object({
  profileId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().transform((value) => value || null),
})

export const ReviewResponseSchema = z.object({
  reviewId: z.string().uuid(),
  response: z.string().trim().min(1).max(2000),
})

export const ReportReviewSchema = z.object({
  reviewId: z.string().uuid(),
  reason: z.enum(['HARASSMENT', 'FALSE_OR_MISLEADING', 'PERSONAL_INFORMATION', 'HATE_OR_VIOLENCE', 'SPAM', 'OTHER']),
  description: z.string().trim().max(1000).optional().transform((value) => value || null),
})
