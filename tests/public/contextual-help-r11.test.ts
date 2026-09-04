import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ESSENTIAL_HELP_SLUGS, isEssentialHelpSlug } from '@/modules/help/data'

describe('R11.4 Contextual Help Links', () => {
  const root = process.cwd()
  const read = (relPath: string) => readFileSync(join(root, relPath), 'utf8')

  it('verifies all 6 contextual help target slugs exist in ESSENTIAL_HELP_SLUGS', () => {
    const requiredTargets = [
      'verificacao-de-identidade-e-maioridade',
      'como-publicar-meu-perfil',
      'o-que-fica-publico-e-o-que-fica-privado',
      'fotos-e-videos-envio-aprovacao-e-limites',
      'perfil-publico-vs-vip',
      'como-pausar-ou-reativar-meu-perfil',
    ]

    for (const slug of requiredTargets) {
      expect(isEssentialHelpSlug(slug)).toBe(true)
      expect(ESSENTIAL_HELP_SLUGS).toContain(slug)
    }
  })

  it('includes contextual help in verification onboarding page', () => {
    const content = read('app/(dashboard)/onboarding/verificacao/page.tsx')
    expect(content).toContain('/ajuda/verificacao-de-identidade-e-maioridade')
    expect(content).toContain('/en/ajuda/verificacao-de-identidade-e-maioridade')
    expect(content).toContain('Precisa de ajuda? Saiba mais')
    expect(content).toContain('Need help? Learn more')
    expect(content).not.toContain('target="_blank"')
  })

  it('includes contextual help in photos onboarding page and dashboard photos page', () => {
    const onboardingPhotos = read('app/(dashboard)/onboarding/fotos/page.tsx')
    expect(onboardingPhotos).toContain('/ajuda/fotos-e-videos-envio-aprovacao-e-limites')
    expect(onboardingPhotos).toContain('/en/ajuda/fotos-e-videos-envio-aprovacao-e-limites')
    expect(onboardingPhotos).toContain('Precisa de ajuda? Saiba mais')
    expect(onboardingPhotos).not.toContain('target="_blank"')

    const dashboardPhotos = read('app/(dashboard)/dashboard/photos/page.tsx')
    expect(dashboardPhotos).toContain('/ajuda/fotos-e-videos-envio-aprovacao-e-limites')
    expect(dashboardPhotos).toContain('/en/ajuda/fotos-e-videos-envio-aprovacao-e-limites')
    expect(dashboardPhotos).toContain('Precisa de ajuda? Saiba mais')
    expect(dashboardPhotos).not.toContain('target="_blank"')
  })

  it('includes contextual help in seu-perfil onboarding page (privacy/public data)', () => {
    const content = read('app/(dashboard)/onboarding/seu-perfil/page.tsx')
    expect(content).toContain('/ajuda/o-que-fica-publico-e-o-que-fica-privado')
    expect(content).toContain('/en/ajuda/o-que-fica-publico-e-o-que-fica-privado')
    expect(content).toContain('Precisa de ajuda? Saiba mais')
    expect(content).not.toContain('target="_blank"')
  })

  it('includes contextual help in public-presentation-form for PUBLIC/VIP audience setting', () => {
    const content = read('components/onboarding/public-presentation-form.tsx')
    expect(content).toContain('/ajuda/perfil-publico-vs-vip')
    expect(content).toContain('/en/ajuda/perfil-publico-vs-vip')
    expect(content).toContain('Precisa de ajuda? Saiba mais')
    expect(content).not.toContain('target="_blank"')
  })

  it('includes contextual help in review & publish onboarding page', () => {
    const content = read('app/(dashboard)/onboarding/revisar/page.tsx')
    expect(content).toContain('/ajuda/como-publicar-meu-perfil')
    expect(content).toContain('/en/ajuda/como-publicar-meu-perfil')
    expect(content).toContain('Precisa de ajuda? Saiba mais')
    expect(content).not.toContain('target="_blank"')
  })

  it('includes contextual help in dashboard page for publication status and pause/reactivate', () => {
    const content = read('app/(dashboard)/dashboard/page.tsx')
    expect(content).toContain('/ajuda/como-publicar-meu-perfil')
    expect(content).toContain('/en/ajuda/como-publicar-meu-perfil')
    expect(content).toContain('/ajuda/como-pausar-ou-reativar-meu-perfil')
    expect(content).toContain('/en/ajuda/como-pausar-ou-reativar-meu-perfil')
    expect(content).toContain('Precisa de ajuda?')
    expect(content).toContain('Saiba mais')
    expect(content).not.toContain('target="_blank"')
  })
})
