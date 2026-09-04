import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { localizePathname } from '@/lib/i18n/routing'
import { buildCanonicalUrl, buildLanguageAlternates } from '@/modules/seo/canonical'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('R11.1 — Professional Acquisition Landing (Anuncie na velvet.)', () => {
  const anuncie = read('app/(public)/anuncie/page.tsx')
  const css = read('app/velvet-public.css')

  it('is implemented under app/(public)/anuncie/page.tsx inheriting PublicLayout shell', () => {
    expect(anuncie).toBeTruthy()
    // Does not re-render PublicHeader or PublicFooter directly because layout provides them
    expect(anuncie).not.toContain('<PublicHeader')
    expect(anuncie).not.toContain('<PublicFooter')
  })

  it('preserves canonical URL and hreflang alternate conventions', () => {
    expect(anuncie).toContain("buildCanonicalUrl('/anuncie', undefined, locale)")
    expect(anuncie).toContain("buildLanguageAlternates('/anuncie')")

    expect(buildCanonicalUrl('/anuncie', undefined, 'pt-BR')).toMatch(/\/anuncie$/)
    expect(buildCanonicalUrl('/anuncie', undefined, 'en')).toMatch(/\/en\/anuncie$/)

    const alternates = buildLanguageAlternates('/anuncie')
    expect(alternates['pt-BR']).toMatch(/\/anuncie$/)
    expect(alternates['en']).toMatch(/\/en\/anuncie$/)
    expect(alternates['x-default']).toMatch(/\/anuncie$/)
  })

  it('Section 1: Hero contains required headline, brief explanation, and CTAs', () => {
    expect(anuncie).toContain('Seu espaço. Seu perfil. Suas conexões.')
    expect(anuncie).toContain('Your space. Your profile. Your connections.')
    expect(anuncie).toContain('Criar meu perfil')
    expect(anuncie).toContain('Como funciona')
    expect(anuncie).toContain("href={signupHref}")
    expect(anuncie).toContain('href="#como-funciona"')
    expect(anuncie).toContain("localizePathname('/signup', locale)")
  })

  it('Section 2: How It Works contains all 7 visual steps in sequence', () => {
    expect(anuncie).toContain('id="como-funciona"')
    const stepsPT = [
      'Criar conta',
      'Verificar identidade e maioridade',
      'Montar perfil',
      'Adicionar fotos e vídeos',
      'Informar serviços e regiões',
      'Enviar para análise',
      'Publicar',
    ]
    for (const step of stepsPT) {
      expect(anuncie).toContain(step)
    }
  })

  it('Section 3: What the Profile Offers explains capabilities without promising income or leads', () => {
    expect(anuncie).toContain('Perfil profissional')
    expect(anuncie).toContain('Fotos e vídeos')
    expect(anuncie).toContain('Regiões de atendimento')
    expect(anuncie).toContain('Preferências estruturadas')
    expect(anuncie).toContain('Avaliações reais')
    expect(anuncie).toContain('Contato direto')
    expect(anuncie).toContain('Controle de audiência')
    expect(anuncie).toContain('Gestão completa do perfil')
    // Negative assertion: does not promise leads or income
    expect(anuncie).toContain('Não prometemos volume de contatos, reservas ou renda')
    expect(anuncie).toContain('We do not promise lead volumes, bookings, or income')
  })

  it('Section 4: Verification + Privacy explains 18+ requirement and civil data protection', () => {
    expect(anuncie).toContain('18+')
    expect(anuncie).toContain('Verificação obrigatória 18+')
    expect(anuncie).toContain('Proteção total dos dados civis')
    expect(anuncie).toContain('CPF')
    expect(anuncie).toContain('nome artístico')
    // Does not expose provider internal details (e.g. Didit) to public visitors
    expect(anuncie).not.toContain('Didit')
    expect(anuncie).not.toContain('didit.me')
  })

  it('Section 5: Independence clarifies platform boundaries', () => {
    expect(anuncie).toContain('Plataforma de descoberta')
    expect(anuncie).toContain('Autonomia profissional')
    expect(anuncie).toContain('Comunicação direta')
    expect(anuncie).toContain('Sem intermediação de serviços')
    expect(anuncie).toContain('Não somos agência nem empregadora')
  })

  it('Section 6: Plans presents FREE / Founder launch positioning without fake pricing or provider', () => {
    expect(anuncie).toContain('FOUNDER')
    expect(anuncie).toContain('Gratuito')
    expect(anuncie).toContain('Free')
    expect(anuncie).toContain('10')
    expect(anuncie).toContain('3')
    expect(anuncie).toContain('5')
    expect(anuncie).toContain('Nenhum provedor de pagamento está integrado no momento')
    // Never invent prices or payment checkouts
    expect(anuncie).not.toContain('R$ 99')
    expect(anuncie).not.toContain('R$ 199')
  })

  it('Section 7: Safety & Control covers visibility, pause, moderation, and reporting', () => {
    expect(anuncie).toContain('Controle de visibilidade')
    expect(anuncie).toContain('Pausa a qualquer momento')
    expect(anuncie).toContain('Moderação responsável')
    expect(anuncie).toContain('Denúncias e suporte')
    expect(anuncie).toContain('VIP ONLY')
  })

  it('Section 8: Final CTA has required headline and routes to canonical signup', () => {
    expect(anuncie).toContain('Pronta para criar seu espaço na velvet.?')
    expect(anuncie).toContain('Ready to create your space on velvet.?')
    expect(anuncie).toContain('Criar meu perfil')
    expect(anuncie).toContain('Create my profile')
    expect(anuncie).toContain('href={signupHref}')
  })

  it('contains dedicated velvet-anuncie CSS styles in velvet-public.css', () => {
    expect(css).toContain('.velvet-anuncie')
    expect(css).toContain('.velvet-anuncie-hero')
    expect(css).toContain('.velvet-anuncie-how')
    expect(css).toContain('.velvet-anuncie-offers')
    expect(css).toContain('.velvet-anuncie-privacy')
    expect(css).toContain('.velvet-anuncie-independence')
    expect(css).toContain('.velvet-anuncie-plans')
    expect(css).toContain('.velvet-anuncie-safety')
    expect(css).toContain('.velvet-anuncie-final')
  })
})
