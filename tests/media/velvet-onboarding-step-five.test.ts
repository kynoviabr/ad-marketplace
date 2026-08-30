import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, MAX_PHOTOS_PER_PROFILE, RequestUploadSchema, RetryUploadSchema } from '@/modules/media/schemas'

const ROOT = join(__dirname, '../..')
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')

describe('Velvet onboarding Step 05 — Fotos', () => {
  it('uses the canonical verified-adult gate and persisted media', () => {
    const page = read('app/(dashboard)/onboarding/fotos/page.tsx')
    expect(page).toContain('requireVerifiedAdvertiser()')
    expect(page).toContain('getManageableProfileMedia(profile.id)')
    expect(page).toContain('reconcileStaleUploadingMedia(profile.id)')
  })

  it('reuses canonical JPEG, PNG, WebP, 15 MB and count rules', () => {
    expect(ALLOWED_MIME_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp'])
    expect(MAX_FILE_SIZE_BYTES).toBe(15 * 1024 * 1024)
    expect(MAX_PHOTOS_PER_PROFILE).toBe(10)
    for (const mime_type of ALLOWED_MIME_TYPES) expect(RequestUploadSchema.safeParse({ mime_type, file_size_bytes: 1024 }).success).toBe(true)
    expect(RequestUploadSchema.safeParse({ mime_type: 'image/gif', file_size_bytes: 1024 }).success).toBe(false)
    expect(RequestUploadSchema.safeParse({ mime_type: 'image/jpeg', file_size_bytes: MAX_FILE_SIZE_BYTES + 1 }).success).toBe(false)
  })

  it('keeps the canonical record-first signed upload lifecycle', () => {
    const actions = read('modules/media/actions.ts')
    const request = actions.slice(actions.indexOf('requestMediaUploadUrlAction'), actions.indexOf('confirmMediaUploadAction'))
    expect(request.indexOf("status: 'UPLOADING'")).toBeLessThan(request.indexOf('createSignedUploadUrl(storagePath)'))
    expect(request).toContain('profiles/${profile.id}/${mediaId}.${ext}')
    expect(actions).toContain("status: 'PENDING_MODERATION'")
    expect(actions).toContain(".list(folder, { search: filename, limit: 2 })")
    expect(actions).toContain('object.name === filename')
    expect(actions).not.toContain("status: 'APPROVED'")
  })

  it('derives ownership from the session for every mutation', () => {
    const actions = read('modules/media/actions.ts')
    expect(actions.match(/requireVerifiedAdvertiser\(\)/g)?.length).toBeGreaterThanOrEqual(7)
    expect(actions).not.toContain("formData.get('profile_id')")
    expect(actions).toContain('media.profile_id !== profile.id')
  })

  it('supports sequential multi-select with honest per-file states and retry', () => {
    const manager = read('components/media/media-gallery-manager.tsx')
    expect(manager).toContain('type="file" multiple')
    expect(manager).toContain('for (const item of items) await uploadFile(item)')
    for (const label of ['Enviando', 'Processando', 'Em análise', 'Tentar novamente']) expect(manager).toContain(label)
    expect(manager).not.toContain('Concluído')
    expect(RetryUploadSchema.safeParse({ media_id: crypto.randomUUID(), mime_type: 'image/webp', file_size_bytes: 2048 }).success).toBe(true)
  })

  it('reuses the same record and path on retry to prevent duplicates', () => {
    const actions = read('modules/media/actions.ts')
    const retry = actions.slice(actions.indexOf('retryMediaUploadUrlAction'), actions.indexOf('continueAfterPhotosAction'))
    expect(retry).toContain('getMediaById(validated.data.media_id)')
    expect(retry).toContain('createSignedUploadUrl(media.storage_path)')
    expect(retry).not.toContain('crypto.randomUUID()')
  })

  it('uses canonical primary, reorder and soft-delete behavior', () => {
    const actions = read('modules/media/actions.ts')
    expect(actions).toContain("rpc('set_primary_profile_media'")
    expect(actions).toContain("rpc('reorder_profile_media'")
    expect(actions).toContain("status: 'DELETED'")
    expect(actions).toContain('if (media.is_primary)')
    expect(actions).toContain("remaining.find((item) => item.status === 'APPROVED') ?? remaining[0]")
    expect(actions).toContain('new Set(submitted).size !== submitted.length')
  })

  it('marks old UPLOADING attempts retryable instead of leaving them stuck', () => {
    const dal = read('modules/media/dal.ts')
    expect(dal).toContain('STALE_UPLOAD_AGE_MS = 60 * 60 * 1000')
    expect(dal).toContain("status: 'PROCESSING_FAILED'")
    expect(dal).toContain(".eq('status', 'UPLOADING')")
  })

  it('continues with one persisted successful upload into the implemented Step 06 review', () => {
    const actions = read('modules/media/actions.ts')
    expect(actions).toContain('continueAfterPhotosAction')
    expect(actions).toContain('submitOwnedProfileForReview(account.id)')
    expect(actions).toContain('onboarding_step: 6')
    expect(actions).toContain("redirect('/onboarding/revisar')")
    const review = read('app/(dashboard)/onboarding/revisar/page.tsx')
    expect(review).toContain('REVISAR &amp; PUBLICAR')
    expect(review).toContain('getPublicationReviewState')
  })

  it('provides text status, image alt, keyboard controls and confirmation', () => {
    const manager = read('components/media/media-gallery-manager.tsx')
    expect(manager).toContain('alt={`Foto ${index + 1} do perfil${item.is_primary ? \'')
    expect(manager).toContain('aria-label={`Mover foto')
    expect(manager).toContain("window.confirm('Excluir esta foto? Ela será removida do seu perfil.')")
    expect(manager).toContain('aria-live="polite"')
  })
})
