/**
 * Media domain types — FASE 05
 */

export type MediaStatus =
  | 'UPLOADING'
  | 'PROCESSING'
  | 'PENDING_MODERATION'
  | 'APPROVED'
  | 'PROCESSING_FAILED'
  | 'REJECTED'
  | 'QUARANTINED'
  | 'DELETED'

export interface ProfileMedia {
  id: string
  profile_id: string
  storage_path: string
  status: MediaStatus
  position: number
  is_primary: boolean
  mime_type: string
  file_size_bytes: number
  width: number | null
  height: number | null
  created_at: string
  updated_at: string
  approved_at: string | null
  deleted_at: string | null
}

export interface MediaDTO {
  id: string
  position: number
  isPrimary: boolean
  status: MediaStatus
  url: string // Signed or display URL
  width: number | null
  height: number | null
}

export interface SignedUploadUrlResponse {
  mediaId: string
  uploadUrl: string
  storagePath: string
  expiresAt: string
}

export type MediaActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
