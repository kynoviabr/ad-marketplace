import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { authOnboardingPtBR, authOnboardingEn } from '@/lib/i18n/messages/auth-onboarding'
import { appModePtBR, appModeEn } from '@/lib/i18n/messages/app-mode'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('PX4.8 — Velvet App UX Consolidation', () => {
  describe('Part A — Reversible Onboarding & Unblocked KYC (Section 2 & 4)', () => {
    it('provides completed step navigation as interactive links in OnboardingShell', () => {
      const shellFile = read('components/onboarding/onboarding-shell.tsx')
      expect(shellFile).toContain('isCompleted ? (')
      expect(shellFile).toContain('<Link')
      expect(shellFile).toContain('href={stepRoute}')
      expect(shellFile).toContain('className="onboarding-step-link"')
      expect(shellFile).toContain('aria-current={isCurrent ? \'step\' : undefined}')
    })

    it('contains clear KYC age-verification lead notice in i18n dictionaries', () => {
      expect(authOnboardingPtBR['verification.leadNotice']).toBe(
        'Antes de publicar seu perfil, precisamos confirmar que você tem 18 anos.'
      )
      expect(authOnboardingEn['verification.leadNotice']).toBe(
        'Before publishing your profile, we need to confirm you are 18 or older.'
      )
    })

    it('contains review profile copy and continue actions in i18n dictionaries', () => {
      expect(authOnboardingPtBR['verification.reviewProfile']).toBe('Voltar e revisar meu perfil')
      expect(authOnboardingEn['verification.reviewProfile']).toBe('Back and review my profile')

      expect(authOnboardingPtBR['verification.continueToVerification']).toBe(
        'Continuar para verificação'
      )
      expect(authOnboardingEn['verification.continueToVerification']).toBe(
        'Continue to verification'
      )
    })

    it('renders lead notice, review affordance, and back navigation in VerificationStatusCard', () => {
      const cardFile = read('components/verification/verification-status-card.tsx')
      expect(cardFile).toContain('verification-lead-notice')
      expect(cardFile).toContain('t(\'verification.leadNotice\')')
      expect(cardFile).toContain('verification-secondary-action')
      expect(cardFile).toContain('href="/onboarding/revisar"')
      expect(cardFile).toContain('href="/onboarding/onde-atende"')
      expect(cardFile).toContain('t(\'common.back\')')
    })

    it('provides forward CTA to verification and back link in review page', () => {
      const reviewPage = read('app/(dashboard)/onboarding/revisar/page.tsx')
      expect(reviewPage).toContain('href="/onboarding/verificacao"')
      expect(reviewPage).toContain('t(\'verification.continueToVerification\')')
      expect(reviewPage).toContain('t(\'common.back\')')
    })
  })

  describe('Part B — Language Switcher Redesign & Quiet Top Bar (Section 3)', () => {
    it('removes persistent LanguageSelector from VelvetAppTopBar header', () => {
      const topBarFile = read('components/pwa/velvet-app-top-bar.tsx')
      expect(topBarFile).not.toContain('<LanguageSelector')
      expect(topBarFile).not.toContain('LanguageSelector compact')
    })

    it('renders a quiet menu button in VelvetAppTopBar opening the More sheet', () => {
      const topBarFile = read('components/pwa/velvet-app-top-bar.tsx')
      expect(topBarFile).toContain('velvet-app-top-bar-menu-btn')
      expect(topBarFile).toContain('onClick={() => setIsMoreOpen(true)}')
    })

    it('groups options into structured sections in VelvetAppMoreSheet', () => {
      const sheetFile = read('components/pwa/velvet-app-more-sheet.tsx')
      expect(sheetFile).toContain('velvet-app-sheet-group')
      expect(sheetFile).toContain("t('app.more.groupProfile')")
      expect(sheetFile).toContain("t('app.more.groupSupport')")
      expect(sheetFile).toContain("t('app.more.groupLegal')")
      expect(sheetFile).toContain("t('app.more.groupAccount')")
    })

    it('contains integrated segmented language switcher pills in VelvetAppMoreSheet', () => {
      const sheetFile = read('components/pwa/velvet-app-more-sheet.tsx')
      expect(sheetFile).toContain('velvet-app-sheet-lang-pills')
      expect(sheetFile).toContain("changeLocale('pt-BR')")
      expect(sheetFile).toContain("changeLocale('en')")
      expect(sheetFile).toContain('LOCALE_COOKIE')
      expect(sheetFile).toContain('localizePathname')
    })

    it('includes account logout action in VelvetAppMoreSheet', () => {
      const sheetFile = read('components/pwa/velvet-app-more-sheet.tsx')
      expect(sheetFile).toContain('logoutAction')
      expect(sheetFile).toContain("t('app.more.logout')")
    })

    it('defines app mode sheet group labels in i18n dictionaries', () => {
      expect(appModePtBR['app.more.groupProfile']).toBe('Perfil e Conta')
      expect(appModeEn['app.more.groupProfile']).toBe('Profile & Account')
      expect(appModePtBR['app.more.groupSupport']).toBe('Suporte')
      expect(appModeEn['app.more.groupSupport']).toBe('Support')
      expect(appModePtBR['app.more.groupLegal']).toBe('Legal')
      expect(appModeEn['app.more.groupLegal']).toBe('Legal')
      expect(appModePtBR['app.more.groupAccount']).toBe('Conta')
      expect(appModeEn['app.more.groupAccount']).toBe('Account')
    })
  })

  describe('Part C — Summary-First Profile UX & Reduced Density (Section 1 & 4)', () => {
    it('defines profile summary translations in i18n', () => {
      expect(authOnboardingPtBR['profileSummary.title']).toBe('Seu perfil')
      expect(authOnboardingPtBR['profileSummary.audience']).toBe('Quem você atende')
      expect(authOnboardingPtBR['profileSummary.services']).toBe('Experiências e serviços')
      expect(authOnboardingPtBR['profileSummary.locations']).toBe('Local de atendimento')
      expect(authOnboardingPtBR['profileSummary.availability']).toBe('Disponibilidade')
      expect(authOnboardingPtBR['profileSummary.presentation']).toBe('Apresentação e biografia')
      expect(authOnboardingPtBR['profileSummary.characteristics']).toBe('Características físicas')
      expect(authOnboardingPtBR['profileSummary.visibility']).toBe('Visibilidade do anúncio')

      expect(authOnboardingEn['profileSummary.title']).toBe('Your profile')
      expect(authOnboardingEn['profileSummary.audience']).toBe('Who you serve')
      expect(authOnboardingEn['profileSummary.services']).toBe('Experiences and services')
    })

    it('supports standalone summary view mode and isolated section editing in PublicPresentationForm', () => {
      const formFile = read('components/onboarding/public-presentation-form.tsx')
      expect(formFile).toContain('viewMode')
      expect(formFile).toContain('editingSection')
      expect(formFile).toContain('profile-summary-view')
      expect(formFile).toContain('focused-section-form')
      expect(formFile).toContain('focused-back-btn')
    })

    it('renders 7 summary cards and Edit buttons when in summary mode', () => {
      const formFile = read('components/onboarding/public-presentation-form.tsx')
      expect(formFile).toContain("t('profileSummary.audience')")
      expect(formFile).toContain("t('profileSummary.services')")
      expect(formFile).toContain("t('profileSummary.locations')")
      expect(formFile).toContain("t('profileSummary.availability')")
      expect(formFile).toContain("t('profileSummary.presentation')")
      expect(formFile).toContain("t('profileSummary.characteristics')")
      expect(formFile).toContain("t('profileSummary.visibility')")
      expect(formFile).toContain("t('profileSummary.edit')")
    })

    it('preserves all other section fields via hidden inputs during isolated section editing', () => {
      const formFile = read('components/onboarding/public-presentation-form.tsx')
      expect(formFile).toContain('name={`offering_${option.code}`}')
      expect(formFile).toContain('name="headline"')
      expect(formFile).toContain('name="bio"')
      expect(formFile).toContain('name="audience_setting"')
    })

    it('preserves security invariant: zero forbidden tokens in presentation form', () => {
      const formFile = read('components/onboarding/public-presentation-form.tsx')
      const forbiddenTokens = [
        'legal_name',
        'document',
        'location_id',
        'profile_media',
        'identity_verification',
      ]
      for (const token of forbiddenTokens) {
        expect(formFile).not.toContain(token)
      }
    })

    it('includes CSS rules for summary cards, quiet menu button, and more sheet groups', () => {
      const globalsCss = read('app/globals.css')
      expect(globalsCss).toContain('.velvet-app-top-bar-menu-btn')
      expect(globalsCss).toContain('.velvet-app-sheet-group')
      expect(globalsCss).toContain('.velvet-app-sheet-lang-pills')
      expect(globalsCss).toContain('.profile-summary-view')
      expect(globalsCss).toContain('.profile-summary-card')
      expect(globalsCss).toContain('.focused-section-form')
      expect(globalsCss).toContain('.focused-back-btn')
    })
  })
})
