import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '../..')
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')

describe('Velvet onboarding Step 04 — Verificação', () => {
  it('protects the canonical route and renders only the safe DTO', () => {
    const page = read('app/(dashboard)/onboarding/verificacao/page.tsx')
    expect(page).toContain('requireAccount()')
    expect(page).toContain('getVerificationSafe(account.id)')
    expect(page).toContain('canProceedToProfessionalProfile(verification)')
    expect(page).not.toContain('provider_session_id')
  })

  it('creates provider sessions server-side with the canonical callback', () => {
    const action = read('modules/verification/actions.ts')
    expect(action).toContain('getVerificationProvider()')
    expect(action).toContain('/onboarding/verificacao`')
    expect(action).not.toContain('callbackUrl: string')
    expect(action).toContain('const account = await requireAccount()')
  })

  it('represents start, active, verified, rejected and expired states', () => {
    const card = read('components/verification/verification-status-card.tsx')
    for (const status of ['NOT_STARTED', 'PENDING', 'IN_PROGRESS', 'IN_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED']) {
      expect(card).toContain(status)
    }
    expect(card).toContain("t('verification.identityConfirmed')")
    expect(card).toContain("t('verification.ageConfirmed')")
    expect(card).toContain("t('verification.retry')")
  })

  it('continues only through the canonical adult gate and advances to Photos', () => {
    const action = read('modules/verification/actions.ts')
    expect(action).toContain('canProceedToProfessionalProfile(verification)')
    expect(action).toContain('onboarding_step: 5')
    expect(action).toContain(".lt('onboarding_step', 5)")
    expect(action).toContain("redirect('/onboarding/fotos')")
  })

  it('keeps Photos behind the verified-advertiser boundary', () => {
    const page = read('app/(dashboard)/onboarding/fotos/page.tsx')
    const mediaActions = read('modules/media/actions.ts')
    expect(page).toContain('requireVerifiedAdvertiser()')
    expect(mediaActions).toContain('requireVerifiedAdvertiser()')
  })

  it('retains signed, idempotent, authoritative webhook processing', () => {
    const route = read('app/api/webhooks/didit/route.ts')
    const signature = read('modules/verification/providers/didit/webhook.ts')
    expect(signature).toContain("headers['x-signature-v2']")
    expect(signature).toContain('timingSafeEqual')
    expect(signature).toContain('maxDriftSeconds = 300')
    expect(route).toContain("from('verification_webhook_events')")
    expect(route).toContain('fetchAuthoritativeDecision')
    expect(route).toContain("decision.normalizedStatus === 'VERIFIED'")
    expect(route).toContain('decision.identityVerified')
    expect(route).toContain('decision.ageVerified')
  })

  it('resolves durable onboarding from verification domain state', () => {
    const resolver = read('app/(dashboard)/onboarding/page.tsx')
    expect(resolver).toContain('getVerificationSafe(account.id)')
    expect(resolver).toContain("if (!canProceedToProfessionalProfile(verification)) redirect('/onboarding/verificacao')")
    expect(resolver).toContain("? '/onboarding/revisar' : '/onboarding/fotos'")
  })
})
