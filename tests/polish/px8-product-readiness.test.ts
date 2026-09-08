import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('PX8 — Product Polish & Pre-GTM Readiness Verification', () => {
  it('redirects legacy /onboarding/media to canonical /onboarding/fotos', () => {
    const content = read('app/(dashboard)/onboarding/media/page.tsx')
    expect(content).toContain("redirect('/onboarding/fotos')")
    expect(content).not.toContain('Passo 5 de 5')
    expect(content).not.toContain('bg-blue-600')
  })

  it('redirects legacy /onboarding/profile to canonical /onboarding/seu-perfil', () => {
    const content = read('app/(dashboard)/onboarding/profile/page.tsx')
    expect(content).toContain("redirect('/onboarding/seu-perfil')")
    expect(content).not.toContain('AD-Marketplace')
  })

  it('ensures /onboarding/revisar back navigation points to /onboarding/fotos', () => {
    const content = read('app/(dashboard)/onboarding/revisar/page.tsx')
    expect(content).toContain('<Link className="onboarding-secondary" href="/onboarding/fotos">')
  })

  it('ensures dashboard boosts links to canonical /onboarding dispatcher', () => {
    const content = read('app/(dashboard)/dashboard/boosts/page.tsx')
    expect(content).toContain('href="/onboarding"')
    expect(content).not.toContain('href="/onboarding/profile"')
  })

  it('provides an editorial 404 page (not-found.tsx) with calm return navigation', () => {
    const content = read('app/not-found.tsx')
    expect(content).toContain('velvet.')
    expect(content).toContain('Página não encontrada.')
    expect(content).toContain('Explorar São Paulo')
    expect(content).toContain('href="/"')
    expect(content).toContain('href="/sao-paulo"')
  })

  it('provides an editorial error boundary (error.tsx) with non-technical copy and retry', () => {
    const content = read('app/error.tsx')
    expect(content).toContain('Algo inesperado aconteceu.')
    expect(content).toContain('Tentar novamente')
    expect(content).toContain('Voltar ao início')
  })

  it('supports loadingText in Button component and avoids hardcoded text', () => {
    const content = read('components/ui/button.tsx')
    expect(content).toContain('loadingText?: string')
    expect(content).toContain("loadingText ?? 'Carregando…'")
    expect(content).not.toContain("'Aguarde...'")
  })

  it('localizes inquiries inbox modal close button aria-label', () => {
    const content = read('components/concierge/concierge-inquiries-inbox.tsx')
    expect(content).toContain("aria-label={isPt ? 'Fechar' : 'Close'}")
  })
})
