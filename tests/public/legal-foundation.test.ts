import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Velvet public legal foundation', () => {
  const privacy = read('app/(public)/privacidade/page.tsx')
  const terms = read('app/(public)/termos/page.tsx')
  const security = read('app/(public)/seguranca/page.tsx')
  const footer = read('components/public/public-footer.tsx')
  const layout = read('app/(public)/layout.tsx')
  const legal = read('lib/legal.ts')
  const envExample = read('.env.example')

  it('creates all three routes with the shared public shell contract', () => {
    for (const source of [privacy, terms, security]) {
      expect(source).toContain('<LegalDocument')
      expect(source).not.toContain('<PublicHeader')
      expect(source).not.toContain('<PublicFooter')
    }
    expect(layout).toContain('<PublicHeader />')
    expect(layout).toContain('<PublicFooter />')
  })

  it('provides exact metadata and canonical URLs without marketing schema', () => {
    expect(privacy).toContain("absolute: 'Privacidade | Velvet'")
    expect(terms).toContain("absolute: 'Termos de Uso | Velvet'")
    expect(security).toContain("absolute: 'Segurança | Velvet'")
    expect(privacy).toContain("buildCanonicalUrl('/privacidade')")
    expect(terms).toContain("buildCanonicalUrl('/termos')")
    expect(security).toContain("buildCanonicalUrl('/seguranca')")
    for (const source of [privacy, terms, security]) expect(source).not.toContain('JsonLd')
  })

  it('links the single public footer to all legal pages and preserves Sobre', () => {
    for (const href of ['/#sobre', '/seguranca', '/termos', '/privacidade']) expect(footer).toContain(`href="${href}"`)
  })

  it('uses a configuration-backed privacy contact and fails readiness when absent', async () => {
    expect(legal).toContain('process.env.PRIVACY_CONTACT_EMAIL')
    expect(legal).toContain("process.env.NODE_ENV === 'production'")
    expect(legal).toContain("throw new Error('PRIVACY_CONTACT_EMAIL must be configured before production.')")
    expect(envExample).toContain('PRIVACY_CONTACT_EMAIL=')
    const { getLegalProductionReadinessIssues, getPrivacyContactEmail } = await import('@/lib/legal')
    expect(getLegalProductionReadinessIssues({ PRIVACY_CONTACT_EMAIL: undefined })).toHaveLength(1)
    expect(getLegalProductionReadinessIssues({ PRIVACY_CONTACT_EMAIL: 'privacidade@example.test' })).toEqual([])
    try {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://velvet.example.test')
      vi.stubEnv('PRIVACY_CONTACT_EMAIL', '')
      expect(() => getPrivacyContactEmail()).toThrow('PRIVACY_CONTACT_EMAIL must be configured before production.')
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://preview.vercel.app')
      expect(getPrivacyContactEmail()).toBeNull()
    } finally {
      vi.unstubAllEnvs()
    }
    expect(privacy).not.toMatch(/[\w.+-]+@velvet[^\s'"<]+/i)
  })

  it('does not invent controller identity, company registration or address', () => {
    const publicCopy = `${privacy}\n${terms}\n${security}`
    expect(publicCopy).not.toMatch(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/)
    expect(publicCopy).not.toContain('Velvet Ltda')
    expect(publicCopy).not.toContain('plenamente em conformidade')
  })

  it('states the 18+ boundary and accurate direct-contact model', () => {
    for (const source of [privacy, terms, security]) expect(source).toMatch(/18\+|18 anos/)
    expect(terms).toContain('Não participa de conversas')
    expect(privacy).toContain('sessionStorage')
    expect(privacy).toContain('não oferece exclusão integral da conta por autosserviço')
  })
})
