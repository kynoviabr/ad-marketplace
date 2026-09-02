import { z } from 'zod'
export const MAX_VIDEOS_PER_PROFILE=3
export const MAX_VIDEO_DURATION_SECONDS=30
export const MAX_VIDEO_FILE_SIZE_BYTES=50*1024*1024
export const MAX_POSTER_FILE_SIZE_BYTES=2*1024*1024
export const VIDEO_MIME_TYPES=['video/mp4','video/webm'] as const
export const RequestVideoUploadSchema=z.object({mime_type:z.enum(VIDEO_MIME_TYPES),file_size_bytes:z.number().int().min(1).max(MAX_VIDEO_FILE_SIZE_BYTES)})
export const VideoIdSchema=z.object({video_id:z.string().uuid()})
export const ReorderVideosSchema=z.object({video_ids:z.array(z.string().uuid()).min(1).max(3)})

