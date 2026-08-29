import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Velvet dashboard photos visual harmonization R1 — INTEGRATION CONTRACT', () => {
  const page = read('app/(dashboard)/dashboard/photos/page.tsx')
  const manager = read('components/media/media-gallery-manager.tsx')
  const header = read('components/dashboard/professional-dashboard-header.tsx')
  const actions = read('modules/media/actions.ts')
  const dal = read('modules/media/dal.ts')
  const css = read('app/globals.css')

  it('keeps verified ownership gate and canonical media services', () => {
    expect(page).toContain('requireVerifiedAdvertiser()')
    expect(page).toContain('getProfileByAccountUserId(account.id)')
    expect(page).toContain('getManageableProfileMedia(profile.id)')
  })
  it('reconciles stale uploads before rendering private previews', () => {
    expect(page).toContain('await reconcileStaleUploadingMedia(profile.id)')
    expect(dal).toContain("status: 'PROCESSING_FAILED'")
  })
  it('reuses the established navigation with Fotos active', () => {
    expect(page).toContain('<ProfessionalDashboardHeader activeHref="/dashboard/photos" />')
    expect(header).toContain("['Fotos', '/dashboard/photos']")
  })
  it('shows the public link only for an actually public profile', () => expect(page).toContain('publication.isPublic && publication.slug'))
  it('preserves canonical upload formats, size and count limits', () => {
    expect(manager).toContain('ALLOWED_MIME_TYPES.join')
    expect(manager).toContain('MAX_FILE_SIZE_BYTES')
    expect(manager).toContain('MAX_PHOTOS_PER_PROFILE')
  })
  it('translates every moderation state and explains non-public pending media', () => {
    for (const label of ['Enviando', 'Processando', 'Em análise', 'Aprovada', 'Falha no processamento', 'Não aprovada', 'Indisponível', 'Removida']) expect(manager).toContain(label)
    expect(manager).toContain('Fotos em análise ainda não aparecem no seu perfil público.')
  })
  it('keeps primary, reorder, retry and destructive actions canonical', () => {
    expect(manager).toContain('setPrimaryMediaAction')
    expect(manager).toContain('reorderMediaAction')
    expect(manager).toContain('retryMediaUploadUrlAction')
    expect(manager).toContain('deleteMediaAction')
    expect(manager).toContain('Excluir esta foto? Ela será removida do seu perfil.')
    expect(actions).toContain("admin.rpc('set_primary_profile_media'")
    expect(actions).toContain("admin.rpc('reorder_profile_media'")
  })
  it('retains keyboard and touch accessible controls', () => {
    expect(manager).toContain('<summary aria-label={`Abrir ações da foto')
    expect(css).toContain('.photo-menu button, .photo-menu label { min-height: 44px')
    expect(manager).toContain('aria-live="polite"')
  })
  it('uses optimized signed previews and only bypasses optimization for local blobs', () => {
    expect(manager).toContain("unoptimized={item.previewUrl.startsWith('blob:')}")
    expect(manager).toContain("sizes={item.is_primary ?")
    expect(dal).toContain("createSignedUrl(item.storage_path, 900)")
  })
  it('keeps Step 05 on the same shared manager without dashboard chrome', () => {
    expect(read('app/(dashboard)/onboarding/fotos/page.tsx')).toContain('<MediaGalleryManager initialMedia={media} showOnboardingNavigation />')
  })
})
