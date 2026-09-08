import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { publicPtBR, publicEn } from '@/lib/i18n/messages/public'

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')

describe('Velvet Public Security Page Refinement', () => {
  const pageSource = read('app/(public)/seguranca/page.tsx')
  const publicCss = read('app/velvet-public.css')

  it('1. adheres to canonical legal foundation and metadata contracts', () => {
    expect(pageSource).toContain('<LegalDocument')
    expect(pageSource).not.toContain('<PublicHeader')
    expect(pageSource).not.toContain('<PublicFooter')
    expect(pageSource).toContain("absolute: 'Segurança | Velvet'")
    expect(pageSource).toContain("buildCanonicalUrl('/seguranca')")
    expect(pageSource).toContain('eyebrow="Confiança e proteção"')
    expect(pageSource).toContain('eyebrow="TRUST AND PROTECTION"')
  })

  it('2. contains all 7 approved editorial sections with clear titles in PT-BR', () => {
    const approvedTitles = [
      'Identidade e maioridade verificadas',
      'Fotos e conteúdos passam por revisão',
      'Sua conta e suas informações são protegidas',
      'Moderação quando algo não está certo',
      'O contato acontece diretamente',
      'Privacidade vem antes da exposição',
      'Segurança também depende de boas escolhas',
    ]

    for (const title of approvedTitles) {
      expect(pageSource).toContain(title)
    }
  })

  it('3. contains English equivalents for all 7 sections', () => {
    const approvedEnTitles = [
      'Identity and legal age verified',
      'Photos and content undergo review',
      'Your account and information are protected',
      'Moderation when something is wrong',
      'Contact takes place directly',
      'Privacy comes before exposure',
      'Safety also relies on smart choices',
    ]

    for (const title of approvedEnTitles) {
      expect(pageSource).toContain(title)
    }
  })

  it('4. strictly removes internal technical jargon from public security page', () => {
    const forbiddenJargon = [
      'armazenamento não público',
      'endereços temporários',
      'autenticação gerenciada',
      'operações privilegiadas',
      'analytics brutos',
      'fornecedor especializado',
      'recursos de publicação',
      'estados controlados de revisão',
      'isolados para análise',
    ]

    for (const term of forbiddenJargon) {
      expect(pageSource.toLowerCase()).not.toContain(term.toLowerCase())
    }
  })

  it('5. presents clear non-intermediary positioning and verification limits', () => {
    // Non-intermediary statements
    expect(pageSource).toMatch(/a Velvet ajuda pessoas a se\s+encontrarem,\s*mas não participa dos contatos/i)
    expect(pageSource).toContain('A Velvet não participa da negociação, do pagamento ou do encontro.')

    // Verification limits
    expect(pageSource).toContain('A verificação confirma identidade e maioridade, mas não é garantia de comportamento, serviço ou encontro.')
  })

  it('6. includes closing block with canonical routes and circular "v" monogram', () => {
    expect(pageSource).toContain("localizePathname('/como-funciona', locale)")
    expect(pageSource).toContain("localizePathname('/privacidade', locale)")
    expect(pageSource).toContain("localizePathname('/termos', locale)")
    expect(pageSource).toContain('velvet-trust-v-mark')
    expect(pageSource).toContain('velvet-brand-monogram')
    expect(pageSource).toContain('Entenda como verificamos os perfis →')
    expect(pageSource).toContain('Política de Privacidade →')
    expect(pageSource).toContain('Termos de Uso →')
  })

  it('7. styles section numbers with prominent editorial italic serif in brand aubergine', () => {
    expect(publicCss).toMatch(/\.velvet-legal-sections>section>span\{[^}]*font-family:var\(--public-serif\)/)
    expect(publicCss).toMatch(/\.velvet-legal-sections>section>span\{[^}]*font-size:clamp\(22px,\s*2\.2vw,\s*28px\)/)
    expect(publicCss).toMatch(/\.velvet-legal-sections>section>span\{[^}]*font-style:italic/)
    expect(publicCss).toMatch(/\.velvet-legal-sections>section>span\{[^}]*color:var\(--public-aubergine\)/)
    expect(publicCss).not.toContain('.velvet-legal-sections>section>span{padding-top:7px;color:var(--public-aubergine);font-size:9px;')
  })

  it('8. provides tightened vertical rhythm and scannable list styles', () => {
    expect(publicCss).toContain('.velvet-legal-document{width:min(100%,920px);margin:0 auto;padding:56px 36px 84px}')
    expect(publicCss).toContain('.velvet-legal-sections>section{padding:30px 0;')
    expect(publicCss).toContain('.velvet-security-list{margin:14px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px}')
    expect(publicCss).toContain('.velvet-security-list li::before{content:\'\';position:absolute;left:0;top:11px;width:5px;height:5px;border-radius:50%;background:var(--public-aubergine);opacity:.75}')
    expect(publicCss).toContain('.velvet-legal-closing{margin-top:44px;padding:36px 0 0;border-top:1px solid rgba(59,32,63,.2)}')
  })

  it('9. verifies footer verification disclaimer was updated to the approved clearer wording', () => {
    expect(publicPtBR['footer.verificationScope']).toBe(
      'A verificação confirma a identidade e a maioridade de quem anuncia. Ela não é uma garantia de comportamento, serviço ou encontro.'
    )
    expect(publicEn['footer.verificationScope']).toContain('Verification confirms the identity and legal age of advertisers.')
  })

  it('10. renders SecurityPage statically in PT-BR without runtime errors', async () => {
    vi.doMock('@/lib/i18n/server', () => ({
      getRequestLocale: vi.fn().mockResolvedValue('pt-BR'),
      getTranslations: vi.fn().mockResolvedValue({ locale: 'pt-BR', t: (k: string) => k }),
    }))

    const { default: SecurityPage } = await import('@/app/(public)/seguranca/page')
    const element = await SecurityPage()
    const html = renderToStaticMarkup(element)

    expect(html).toContain('Confiança e proteção')
    expect(html).toContain('Segurança na Velvet')
    expect(html).toContain('Identidade e maioridade verificadas')
    expect(html).toContain('Quer saber mais?')
    expect(html).toContain('Entenda como verificamos os perfis')
    expect(html).toContain('velvet-security-list')
  })

  it('11. renders SecurityPage statically in EN without runtime errors', async () => {
    vi.resetModules()
    vi.doMock('@/lib/i18n/server', () => ({
      getRequestLocale: vi.fn().mockResolvedValue('en'),
      getTranslations: vi.fn().mockResolvedValue({ locale: 'en', t: (k: string) => k }),
    }))

    const { default: SecurityPage } = await import('@/app/(public)/seguranca/page')
    const element = await SecurityPage()
    const html = renderToStaticMarkup(element)

    expect(html).toContain('TRUST AND PROTECTION')
    expect(html).toContain('Safety at Velvet')
    expect(html).toContain('Identity and legal age verified')
    expect(html).toContain('Want to learn more?')
    expect(html).toContain('Understand how we verify profiles')
    expect(html).toContain('velvet-security-list')
  })
})
