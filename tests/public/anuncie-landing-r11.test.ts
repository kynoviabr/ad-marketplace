import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { localizePathname } from '@/lib/i18n/routing'
import { buildCanonicalUrl, buildLanguageAlternates } from '@/modules/seo/canonical'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('R11.1 — Professional Acquisition Landing (Anuncie na Velvet)', () => {
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

  it('Section 1: Hero contains required headline, warm partner-like copy, and CTAs without curation claims', () => {
    expect(anuncie).toContain('Seu espaço.\\nSeu perfil.\\nDo seu jeito.')
    expect(anuncie).toContain('Your space.\\nYour profile.\\nYour way.')
    expect(anuncie).toContain('Criar meu perfil')
    expect(anuncie).toContain('Entenda como funciona')
    expect(anuncie).toContain('href={signupHref}')
    expect(anuncie).toContain('href="#como-funciona"')
    expect(anuncie).toContain("localizePathname('/signup', locale)")

    // Excluded claims
    expect(anuncie).not.toContain('Clientes selecionados')
    expect(anuncie).not.toContain('curadoria')
    expect(anuncie).not.toContain('Ativo na velvet.')
    expect(anuncie).toContain('Contato direto disponível')
  })

  it('Section 2: How It Works contains all 7 visual steps in sequence with supportive copy', () => {
    expect(anuncie).toContain('id="como-funciona"')
    expect(anuncie).toContain('Do cadastro ao seu perfil publicado')
    const stepsPT = [
      'Crie sua conta',
      'Confirme sua identidade e maioridade',
      'Conte um pouco sobre você',
      'Escolha suas fotos e vídeos',
      'Informe onde você atende',
      'Revise e envie',
      'Coloque seu perfil no ar',
    ]
    for (const step of stepsPT) {
      expect(anuncie).toContain(step)
    }
    expect(anuncie).toContain('Ver o guia completo')
  })

  it('Section 3: What the Profile Offers explains capabilities in human language without product jargon', () => {
    expect(anuncie).toContain('SEU PERFIL NA VELVET')
    expect(anuncie).toContain('Um espaço para mostrar quem você é')
    expect(anuncie).toContain('Sua apresentação')
    expect(anuncie).toContain('Fotos e vídeos')
    expect(anuncie).toContain('Onde você atende')
    expect(anuncie).toContain('Sobre o seu atendimento')
    expect(anuncie).toContain('Avaliações')
    expect(anuncie).toContain('Contato direto')
    expect(anuncie).toContain('Quem pode ver seu perfil')
    expect(anuncie).toContain('Atualize quando quiser')

    // Removed jargon
    expect(anuncie).not.toContain('preferências estruturadas')
    expect(anuncie).not.toContain('controle de audiência')
    expect(anuncie).not.toContain('plataforma tecnológica')
    expect(anuncie).not.toContain('entrega protegida de mídia')
    expect(anuncie).not.toContain('Avaliações reais')
  })

  it('Section 4: Verification + Privacy explains 18+ requirement and privacy without absolute claims', () => {
    expect(anuncie).toContain('PRIVACIDADE E VERIFICAÇÃO')
    expect(anuncie).toContain('Sua identidade é confirmada. Seu nome artístico continua sendo o que aparece.')
    expect(anuncie).toContain('Verificação de identidade e maioridade')
    expect(anuncie).toContain('Suas informações privadas continuam fora do perfil')

    // Absolute claims removed
    expect(anuncie).not.toContain('Proteção total dos dados civis')
    expect(anuncie).not.toContain('totalmente isolados')
    expect(anuncie).not.toContain('conformidade legal estrita')
    expect(anuncie).not.toContain('Didit')
  })

  it('Section 5: Autonomy clarifies boundaries, direct contact, and financial safety note', () => {
    expect(anuncie).toContain('SUA AUTONOMIA')
    expect(anuncie).toContain('Suas decisões continuam sendo suas')
    expect(anuncie).toContain('A Velvet ajuda seu perfil a ser encontrado')
    expect(anuncie).toContain('Você organiza sua rotina')
    expect(anuncie).toContain('Você escolhe como quer ser contatada')
    expect(anuncie).toContain('O que vocês combinam fica entre vocês')
    expect(anuncie).toContain('dentro ou fora da plataforma')
    expect(anuncie).toContain('Cuide das suas informações pessoais. Nunca compartilhe sua senha, códigos de acesso ou dados bancários com desconhecidos.')
  })

  it('Section 6: Plans presents Founder launch positioning with source-confirmed benefits and no payment jargon', () => {
    expect(anuncie).toContain('FOUNDER')
    expect(anuncie).toContain('Comece com a Velvet sem mensalidade na fase de lançamento')
    expect(anuncie).toContain('Sem mensalidade')
    expect(anuncie).toContain('Até 10 fotos')
    expect(anuncie).toContain('Até 3 vídeos')
    expect(anuncie).toContain('Até 5 regiões de atendimento em São Paulo')
    expect(anuncie).toContain('Durante a fase Founder, você não precisa cadastrar cartão para cobranças automáticas.')

    // Removed technical payment jargon
    expect(anuncie).not.toContain('Nenhum provedor de pagamento está integrado no momento')
  })

  it('Section 7: Control covers visibility, pause, moderation, and Help Center', () => {
    expect(anuncie).toContain('VOCÊ NO CONTROLE')
    expect(anuncie).toContain('Seu perfil acompanha o seu momento')
    expect(anuncie).toContain('Escolha como quer aparecer')
    expect(anuncie).toContain('Pause quando precisar')
    expect(anuncie).toContain('Conteúdo revisado antes de aparecer')
    expect(anuncie).toContain('Se precisar de ajuda')
    expect(anuncie).not.toContain('acompanhamento pela equipe')
    expect(anuncie).not.toContain('VIP ONLY')
  })

  it('Section 8: Final CTA has required headline and routes to canonical signup', () => {
    expect(anuncie).toContain('COMECE SEU PERFIL')
    expect(anuncie).toContain('Que tal começar seu espaço na Velvet?')
    expect(anuncie).toContain('How about starting your space on Velvet?')
    expect(anuncie).toContain('Criar meu perfil')
    expect(anuncie).toContain('Create my profile')
    expect(anuncie).toContain('href={signupHref}')
  })

  it('contains dedicated velvet-anuncie CSS styles in velvet-public.css', () => {
    expect(css).toContain('.velvet-anuncie')
    expect(css).toContain('.velvet-anuncie-hero')
    expect(css).toContain('.velvet-anuncie-hero-body')
    expect(css).toContain('.velvet-anuncie-hero-desc')
    expect(css).toContain('.velvet-anuncie-safety-note')
    expect(css).toContain('.velvet-anuncie-founder-intro')
    expect(css).toContain('.velvet-anuncie-how')
    expect(css).toContain('.velvet-anuncie-offers')
    expect(css).toContain('.velvet-anuncie-privacy')
    expect(css).toContain('.velvet-anuncie-independence')
    expect(css).toContain('.velvet-anuncie-plans')
    expect(css).toContain('.velvet-anuncie-safety')
    expect(css).toContain('.velvet-anuncie-final')
  })
})
