import { canUploadAdultMedia } from '@/modules/verification/gates'
import type { AccountUser } from '@/modules/auth/types'
import type { IdentityVerification } from '@/modules/verification/types'
import { MAX_PHOTOS_PER_PROFILE } from './schemas'

/**
 * Validates whether an advertiser can upload adult photo media.
 * Checks account active status, adult KYC verification, and plan photo quota.
 */
export function canUploadMedia(
  account: Pick<AccountUser, 'status'> | null,
  verification: Pick<IdentityVerification, 'status' | 'identity_verified' | 'age_verified'> | null,
  currentActivePhotosCount: number,
  maxAllowed: number = MAX_PHOTOS_PER_PROFILE
): { allowed: boolean; reason?: string } {
  if (!account || account.status !== 'ACTIVE' || !canUploadAdultMedia(verification as any)) {
    return {
      allowed: false,
      reason: 'Upload de mídia bloqueado. Requer conta ativa e verificação de identidade e maioridade (18+).',
    }
  }

  if (currentActivePhotosCount >= maxAllowed) {
    return {
      allowed: false,
      reason: `Limite de fotos atingido. Você pode enviar no máximo ${maxAllowed} fotos.`,
    }
  }

  return { allowed: true }
}

/**
 * Calculates remaining available photo slots.
 */
export function getRemainingPhotoQuota(
  currentActivePhotosCount: number,
  maxAllowed: number = MAX_PHOTOS_PER_PROFILE
): number {
  return Math.max(0, maxAllowed - currentActivePhotosCount)
}
