import type { MediaActionResult, MediaStatus } from '@/modules/media/types'

export type VideoMimeType = 'video/mp4' | 'video/webm'
export interface ProfileVideo {
  id:string; profile_id:string; storage_path:string; poster_storage_path:string; duration_seconds:number|null
  file_size_bytes:number; mime_type:VideoMimeType; position:number; status:MediaStatus
  created_at:string; updated_at:string; approved_at:string|null; deleted_at:string|null
}
export interface ManageableProfileVideo extends ProfileVideo { posterUrl:string|null }
export interface VideoUploadUrls { videoId:string; videoUploadUrl:string; posterUploadUrl:string; expiresAt:string }
export type VideoActionResult<T=void> = MediaActionResult<T>

