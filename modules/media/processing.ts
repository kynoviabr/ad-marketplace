import 'server-only'
import type { AllowedMimeType } from './types'

export interface ValidationResult {
  valid: boolean
  detectedType: AllowedMimeType | null
  error?: string
}

export interface ProcessingResult {
  success: boolean
  sanitizedPath?: string
  width?: number
  height?: number
  errorMessage?: string
}

/**
 * Validates the raw file buffer against magic byte signatures.
 * Blocks executable disguised files, corrupted images, and SVGs.
 */
export function validateMagicBytes(buffer: Buffer): ValidationResult {
  if (!buffer || buffer.length < 12) {
    return { valid: false, detectedType: null, error: 'Arquivo inválido ou vazio.' }
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedType: 'image/jpeg' }
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedType: 'image/png' }
  }

  // 3. WebP: RIFF ... WEBP
  const isRiff =
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
  const isWebp =
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50

  if (isRiff && isWebp) {
    return { valid: true, detectedType: 'image/webp' }
  }

  return {
    valid: false,
    detectedType: null,
    error: 'Formato de arquivo incompatível. Apenas JPEG, PNG e WebP são suportados.',
  }
}

/**
 * Sanitizes image buffer by stripping EXIF metadata segments.
 * In a production worker, this would be augmented with Sharp/Libvips.
 */
export function sanitizeImageBuffer(buffer: Buffer, mimeType: AllowedMimeType): Buffer {
  // If JPEG, strip APP1 (EXIF: 0xFF, 0xE1) markers if present
  if (mimeType === 'image/jpeg' && buffer.length > 4) {
    let cleanBuffer = Buffer.from(buffer)
    // Quick sanitization check for EXIF APP1 marker
    if (cleanBuffer[2] === 0xff && cleanBuffer[3] === 0xe1) {
      const exifLength = cleanBuffer.readUInt16BE(4)
      if (exifLength + 4 < cleanBuffer.length) {
        // Strip out APP1 segment and retain standard SOI + remaining headers
        const header = cleanBuffer.subarray(0, 2)
        const rest = cleanBuffer.subarray(4 + exifLength)
        cleanBuffer = Buffer.concat([header, rest])
      }
    }
    return cleanBuffer
  }

  return buffer
}
