import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { authOnboardingPtBR, authOnboardingEn } from '@/lib/i18n/messages/auth-onboarding'
import { OfferingStatusSchema } from '@/modules/offerings/schema'
import { parseOfferingFormData } from '@/modules/offerings/schema'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Physical iPhone UX Corrections — Tri-State Copy & App Mode Header', () => {
  describe('1. Tri-State Presentation Labels (Section 1 & 2)', () => {
    it('provides required PT-BR labels: Sim, Não, Não informado', () => {
      expect(authOnboardingPtBR['offering.status.offered']).toBe('Sim')
      expect(authOnboardingPtBR['offering.status.notOffered']).toBe('Não')
      expect(authOnboardingPtBR['offering.status.unspecified']).toBe('Não informado')
    })

    it('provides required PT-BR explanatory help copy', () => {
      expect(authOnboardingPtBR['offering.editor.help']).toBe(
        'Responda Sim, Não ou deixe como Não informado. Apenas as opções marcadas como Sim serão exibidas no seu perfil público.'
      )
    })

    it('provides required EN labels: Yes, No, Not specified', () => {
      expect(authOnboardingEn['offering.status.offered']).toBe('Yes')
      expect(authOnboardingEn['offering.status.notOffered']).toBe('No')
      expect(authOnboardingEn['offering.status.unspecified']).toBe('Not specified')
    })

    it('provides natural EN explanatory help copy', () => {
      expect(authOnboardingEn['offering.editor.help']).toBe(
        'Answer Yes, No, or leave as Not specified. Only options marked as Yes will be displayed on your public profile.'
      )
    })
  })

  describe('2. Internal Enum & Database Semantics Preservation (Section 1 & 4)', () => {
    it('preserves canonical OfferingStatus enum values in schema validation', () => {
      expect(OfferingStatusSchema.options).toEqual(['OFFERED', 'NOT_OFFERED', 'UNSPECIFIED'])
    })

    it('parses form data mapping to internal canonical enums', () => {
      const formData = new FormData()
      formData.set('offering_audience_men', 'OFFERED')
      formData.set('offering_audience_women', 'NOT_OFFERED')
      const parsed = parseOfferingFormData(formData)

      expect(parsed.audience_men).toBe('OFFERED')
      expect(parsed.audience_women).toBe('NOT_OFFERED')
      expect(parsed.audience_couples).toBe('UNSPECIFIED')
    })

    it('guarantees public queries expose OFFERED only and never NOT_OFFERED or UNSPECIFIED', () => {
      const offeringDal = read('modules/offerings/dal.ts')
      const searchDal = read('modules/search/dal.ts')
      const profilePage = read('app/(public)/perfil/[slug]/page.tsx')

      expect(offeringDal).toContain(".eq('status', 'OFFERED')")
      expect(searchDal).toContain(".eq('status', 'OFFERED')")
      expect(profilePage).not.toMatch(/NOT_OFFERED|UNSPECIFIED/)
    })
  })

  describe('3. Standalone App Mode Header Deduplication (Section 5 & 6)', () => {
    it('preserves onboarding header in Web Mode markup within OnboardingShell', () => {
      const shellFile = read('components/onboarding/onboarding-shell.tsx')
      expect(shellFile).toContain('className="onboarding-header"')
      expect(shellFile).toContain('className="onboarding-progress"')
      expect(shellFile).toContain('velvet<span>.</span>')
      expect(shellFile).toContain('onboarding-exit')
    })

    it('suppresses .onboarding-header in CSS for standalone display mode to prevent duplicate header', () => {
      const globalsCss = read('app/globals.css')
      const appModeSection = globalsCss.slice(globalsCss.indexOf('PX4.7 — Velvet App Mode Experience Styles'))

      expect(appModeSection).toContain('.onboarding-header')
      expect(appModeSection).toMatch(/\.onboarding-header\s*\{[\s\S]*?display:\s*none\s*!important/)
    })

    it('adds standalone content offset padding to .onboarding-shell to prevent bottom nav overlap', () => {
      const globalsCss = read('app/globals.css')
      expect(globalsCss).toContain('.onboarding-shell')
      expect(globalsCss).toMatch(/\.onboarding-shell[\s\S]*?padding-bottom:\s*calc\(68px\s*\+\s*max\(16px,\s*env\(safe-area-inset-bottom\)\)\)\s*!important/)
    })

    it('configures VelvetAppTopBar with contextual section titles for onboarding steps', () => {
      const topBarFile = read('components/pwa/velvet-app-top-bar.tsx')
      expect(topBarFile).toContain("pathname.startsWith('/onboarding/seu-perfil')")
      expect(topBarFile).toContain("pathname.startsWith('/onboarding/onde-atende')")
      expect(topBarFile).toContain("pathname.startsWith('/onboarding/verificacao')")
      expect(topBarFile).toContain("pathname.startsWith('/onboarding/fotos')")
    })
  })
})
