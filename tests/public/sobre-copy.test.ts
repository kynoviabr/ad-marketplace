import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('Public /sobre (About) Page Copy & Positioning Integrity', () => {
  const sobreSource = readFileSync(resolve(process.cwd(), 'app/(public)/sobre/page.tsx'), 'utf8')

  describe('1. Canonical "Nosso papel" Non-Intermediary Boundary', () => {
    it('contains the mandatory PT-BR copy with "dentro ou fora da plataforma"', () => {
      expect(sobreSource).toContain(
        'Organizamos descoberta, apresentação de perfis e informações de segurança. A Velvet não é agência, empregadora, representante nem parte de conversas ou acordos realizados dentro ou fora da plataforma.'
      )
      // Negative assertion: no longer uses the old partial clause
      expect(sobreSource).not.toContain(
        'acordos realizados fora da plataforma.'
      )
    })

    it('contains the mandatory EN copy with "inside or outside the platform"', () => {
      expect(sobreSource).toContain(
        'We organize discovery, profile presentation and safety information. Velvet is not an agency, employer, representative or party to conversations or arrangements made inside or outside the platform.'
      )
      // Negative assertion: no longer uses the old partial clause
      expect(sobreSource).not.toContain(
        'arrangements made outside the platform.'
      )
    })
  })

  describe('2. Dual-Audience Communication Balance', () => {
    it('speaks naturally to both visitors who discover and professionals who advertise (PT-BR)', () => {
      expect(sobreSource).toContain('Para quem procura:')
      expect(sobreSource).toContain('Para quem anuncia:')
      expect(sobreSource).toContain('O contato acontece diretamente entre as pessoas.')
    })

    it('speaks naturally to both visitors and professionals in English (EN)', () => {
      expect(sobreSource).toContain('For visitors:')
      expect(sobreSource).toContain('For professionals:')
      expect(sobreSource).toContain('Contact always happens directly between individuals.')
    })
  })

  describe('3. Elimination of Internal Technical and Product Jargon', () => {
    it('does not contain technical architecture or internal compliance buzzwords', () => {
      const bannedTerms = [
        'plataforma tecnológica',
        'controle de audiência',
        'VIP_ONLY',
        'curadoria',
        'canais habilitados',
        'fluxo de moderação',
        'dados estruturados',
        'proteção total',
        '100% seguro',
        'nunca pode vazar',
        'o sistema permite',
        'a plataforma possui',
        'o produto oferece recursos',
      ]

      for (const term of bannedTerms) {
        expect(sobreSource).not.toContain(term)
      }
    })
  })

  describe('4. Truthful Verification & Direct Contact Scoping', () => {
    it('states clearly what verification does and does not promise', () => {
      expect(sobreSource).toContain('Profissionais precisam confirmar identidade e maioridade')
      expect(sobreSource).toContain('não é uma garantia de comportamento, serviço ou encontro')
      expect(sobreSource).toContain('nunca são exibidos no perfil público')
    })

    it('clearly establishes non-intermediary financial and booking model', () => {
      expect(sobreSource).toContain('não cobra comissões sobre atendimentos')
      expect(sobreSource).toContain('não processa pagamentos de serviços')
      expect(sobreSource).toContain('não monitora e não intermedia conversas privadas')
    })
  })

  describe('5. Eyebrow Typography & Navigation Links', () => {
    it('preserves the canonical eyebrow system', () => {
      expect(sobreSource).toContain('className="velvet-overline"')
      expect(sobreSource).toContain("en ? 'ABOUT VELVET' : 'SOBRE A VELVET'")
    })

    it('contains valid institutional navigation routes', () => {
      expect(sobreSource).toContain("href('/como-funciona')")
      expect(sobreSource).toContain("href('/seguranca')")
      expect(sobreSource).toContain("href('/anuncie')")
      expect(sobreSource).toContain("href('/sao-paulo')")
    })
  })
})
