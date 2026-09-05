import 'server-only'
import sharp from 'sharp'
import { MAX_FILE_SIZE_BYTES } from './schemas'
import type { AllowedMimeType } from './types'

export const MAX_IMAGE_DIMENSION = 12_000
export const MAX_IMAGE_PIXELS = 40_000_000

export type ImageProcessingErrorCode =
  | 'INVALID_IMAGE'
  | 'UNSUPPORTED_FORMAT'
  | 'IMAGE_TOO_LARGE'
  | 'INVALID_DIMENSIONS'
  | 'PROCESSING_FAILED'

export class ImageProcessingError extends Error {
  constructor(readonly code: ImageProcessingErrorCode) {
    super(code)
    this.name = 'ImageProcessingError'
  }
}

export interface ValidationResult {
  valid: boolean
  detectedType: AllowedMimeType | null
  error?: string
}

export interface SanitizedImage {
  buffer: Buffer
  mimeType: AllowedMimeType
  width: number
  height: number
  fileSizeBytes: number
}

/**
 * Signature detection is an early rejection only; successful decode remains mandatory.
 */
export function validateMagicBytes(buffer: Buffer): ValidationResult {
  if (!buffer || buffer.length < 12) {
    return { valid: false, detectedType: null, error: 'INVALID_IMAGE' }
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
    error: 'UNSUPPORTED_FORMAT',
  }
}

function mimeForFormat(format?: string): AllowedMimeType | null {
  if (format === 'jpeg') return 'image/jpeg'
  if (format === 'png') return 'image/png'
  if (format === 'webp') return 'image/webp'
  return null
}

/**
 * Decodes and re-encodes stored bytes. Sharp strips EXIF/IPTC/XMP/ICC and
 * other embedded metadata because keepMetadata/withMetadata is never enabled.
 */
export async function validateAndSanitizeImage(input: Buffer): Promise<SanitizedImage> {
  if (!input.length) throw new ImageProcessingError('INVALID_IMAGE')
  if (input.length > MAX_FILE_SIZE_BYTES) throw new ImageProcessingError('IMAGE_TOO_LARGE')

  const signature = validateMagicBytes(input)
  if (!signature.valid || !signature.detectedType) {
    throw new ImageProcessingError(signature.error === 'UNSUPPORTED_FORMAT' ? 'UNSUPPORTED_FORMAT' : 'INVALID_IMAGE')
  }

  try {
    const decoder = sharp(input, {
      failOn: 'error',
      limitInputPixels: MAX_IMAGE_PIXELS,
      unlimited: false,
      animated: false,
    })
    const metadata = await decoder.metadata()
    const decodedMime = mimeForFormat(metadata.format)
    if (!decodedMime || decodedMime !== signature.detectedType) {
      throw new ImageProcessingError('UNSUPPORTED_FORMAT')
    }
    if (!metadata.width || !metadata.height || (metadata.pages && metadata.pages > 1)) {
      throw new ImageProcessingError('INVALID_DIMENSIONS')
    }
    if (
      metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION ||
      metadata.width * metadata.height > MAX_IMAGE_PIXELS
    ) {
      throw new ImageProcessingError('INVALID_DIMENSIONS')
    }

    let encoder = sharp(input, {
      failOn: 'error',
      limitInputPixels: MAX_IMAGE_PIXELS,
      unlimited: false,
      animated: false,
    }).rotate()
    if (decodedMime === 'image/jpeg') encoder = encoder.jpeg({ quality: 90, mozjpeg: true })
    if (decodedMime === 'image/png') encoder = encoder.png({ compressionLevel: 9 })
    if (decodedMime === 'image/webp') encoder = encoder.webp({ quality: 90 })

    const { data, info } = await encoder.toBuffer({ resolveWithObject: true })
    if (!info.width || !info.height || data.length > MAX_FILE_SIZE_BYTES) {
      throw new ImageProcessingError(data.length > MAX_FILE_SIZE_BYTES ? 'IMAGE_TOO_LARGE' : 'INVALID_DIMENSIONS')
    }

    const cleanMetadata = await sharp(data, {
      failOn: 'error',
      limitInputPixels: MAX_IMAGE_PIXELS,
    }).metadata()
    if (cleanMetadata.exif || cleanMetadata.iptc || cleanMetadata.xmp || cleanMetadata.icc) {
      throw new ImageProcessingError('PROCESSING_FAILED')
    }

    return {
      buffer: data,
      mimeType: decodedMime,
      width: info.width,
      height: info.height,
      fileSizeBytes: data.length,
    }
  } catch (error) {
    if (error instanceof ImageProcessingError) throw error
    throw new ImageProcessingError('INVALID_IMAGE')
  }
}
