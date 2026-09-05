import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { describe, expect, it, vi } from 'vitest'
import {
  ImageProcessingError,
  MAX_IMAGE_PIXELS,
  validateAndSanitizeImage,
  validateMagicBytes,
} from '@/modules/media/processing'
import { MAX_FILE_SIZE_BYTES } from '@/modules/media/schemas'

async function synthetic(format: 'jpeg' | 'png' | 'webp'): Promise<Buffer> {
  const image = sharp({ create: { width: 32, height: 24, channels: 4, background: '#a02060' } })
  return image[format]().toBuffer()
}

async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  await expect(promise).rejects.toMatchObject({ name: 'ImageProcessingError', code })
}

describe('R12 P1-3 professional photo byte validation and privacy', () => {
  it.each([
    ['jpeg', 'image/jpeg'],
    ['png', 'image/png'],
    ['webp', 'image/webp'],
  ] as const)('decodes and sanitizes a valid %s from actual bytes', async (format, mimeType) => {
    const result = await validateAndSanitizeImage(await synthetic(format))
    expect(result.mimeType).toBe(mimeType)
    expect(result.width).toBe(32)
    expect(result.height).toBe(24)
    expect(result.fileSizeBytes).toBe(result.buffer.length)
    await expect(sharp(result.buffer).metadata()).resolves.toMatchObject({ width: 32, height: 24 })
  })

  it('derives the authoritative MIME from bytes rather than a filename or declared MIME', async () => {
    const actualPng = await synthetic('png')
    expect(validateMagicBytes(actualPng).detectedType).toBe('image/png')
    await expect(validateAndSanitizeImage(actualPng)).resolves.toMatchObject({ mimeType: 'image/png' })
  })

  it('rejects a fake JPEG signature that cannot be decoded', async () => {
    await expectCode(
      validateAndSanitizeImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 0])),
      'INVALID_IMAGE'
    )
  })

  it('rejects unsupported image bytes even when they are otherwise decodable', async () => {
    const gif = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'red' } }).gif().toBuffer()
    await expectCode(validateAndSanitizeImage(gif), 'UNSUPPORTED_FORMAT')
  })

  it('rejects the actual stored byte length above the configured maximum', async () => {
    await expectCode(validateAndSanitizeImage(Buffer.alloc(MAX_FILE_SIZE_BYTES + 1)), 'IMAGE_TOO_LARGE')
  })

  it('rejects a decompression/pixel bomb above the configured pixel limit', async () => {
    const width = 10_000
    const height = Math.floor(MAX_IMAGE_PIXELS / width) + 1
    const compressed = await sharp({ create: { width, height, channels: 3, background: 'black' } }).png().toBuffer()
    await expect(validateAndSanitizeImage(compressed)).rejects.toBeInstanceOf(ImageProcessingError)
  }, 20_000)

  it('removes GPS, device, timestamp and description EXIF by decode plus re-encode', async () => {
    const privateImage = await sharp({ create: { width: 32, height: 24, channels: 3, background: 'blue' } })
      .jpeg()
      .withExif({
        IFD0: {
          Make: 'Private Camera',
          Model: 'Private Device',
          DateTime: '2026:09:05 12:00:00',
          ImageDescription: 'Private description',
          Software: 'Private App',
        },
        IFD3: {
          GPSLatitudeRef: 'N',
          GPSLatitude: '12/1 34/1 56/1',
          GPSLongitudeRef: 'W',
          GPSLongitude: '45/1 6/1 7/1',
        },
      })
      .toBuffer()
    expect((await sharp(privateImage).metadata()).exif).toBeDefined()

    const result = await validateAndSanitizeImage(privateImage)
    const metadata = await sharp(result.buffer).metadata()
    expect(metadata.exif).toBeUndefined()
    expect(metadata.iptc).toBeUndefined()
    expect(metadata.xmp).toBeUndefined()
    expect(metadata.icc).toBeUndefined()
  })

  it('does not log image bytes or embedded metadata during validation failures', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await expect(validateAndSanitizeImage(Buffer.alloc(12))).rejects.toBeInstanceOf(ImageProcessingError)
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('wires stored bytes, processing state, canonical overwrite and authoritative metadata into confirmation', () => {
    const actions = fs.readFileSync(path.join(process.cwd(), 'modules/media/actions.ts'), 'utf8')
    const confirm = actions.slice(actions.indexOf('confirmMediaUploadAction'), actions.indexOf('reorderMediaAction'))
    expect(confirm).toContain('requireVerifiedAdvertiser()')
    expect(confirm).toContain('media.profile_id !== profile.id')
    expect(confirm).toContain(".download(media.storage_path)")
    expect(confirm).toContain('validateAndSanitizeImage(rawBytes)')
    expect(confirm).toContain("status: 'PROCESSING'")
    expect(confirm).toContain("status: 'PENDING_MODERATION'")
    expect(confirm.indexOf('validateAndSanitizeImage(rawBytes)')).toBeLessThan(confirm.indexOf("status: 'PENDING_MODERATION'"))
    expect(confirm).toContain('markMediaProcessingFailed(processingMediaId)')
    expect(confirm).toContain('sanitized.mimeType')
    expect(confirm).toContain('sanitized.fileSizeBytes')
    expect(confirm).toContain('sanitized.width')
    expect(confirm).toContain('sanitized.height')
    expect(confirm).toContain('upsert: true')
    expect(confirm).not.toContain('validated.data.width')
    expect(confirm).not.toContain('validated.data.height')
  })

  it('keeps raw pending/failed photos out of signed public delivery', () => {
    const delivery = fs.readFileSync(path.join(process.cwd(), 'modules/media/delivery.ts'), 'utf8')
    expect(delivery.indexOf("media.status !== 'APPROVED'")).toBeLessThan(delivery.indexOf('createSignedUrl'))
  })

  it('uses the canonical server-side auth, active advertiser, KYC and adult gate', () => {
    const guard = fs.readFileSync(path.join(process.cwd(), 'modules/verification/dal.ts'), 'utf8')
    expect(guard).toContain('const account = await requireAccount()')
    expect(guard).toContain('canProceedToProfessionalProfile(verification)')
    expect(guard).toContain("redirect('/onboarding/verificacao')")
  })
})
