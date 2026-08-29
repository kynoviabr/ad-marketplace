import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const page = readFileSync(join(root, 'app/(dashboard)/dashboard/billing/page.tsx'), 'utf8')
const checkout = readFileSync(join(root, 'components/billing/checkout-button.tsx'), 'utf8')
const entitlements = readFileSync(join(root, 'modules/billing/entitlements.ts'), 'utf8')
const provider = readFileSync(join(root, 'modules/billing/providers/registry.ts'), 'utf8')
const css = readFileSync(join(root, 'app/globals.css'), 'utf8')

describe('Velvet dashboard billing visual harmonization R3', () => {
  it('resolves the account from the authenticated server session', () => {
    expect(page).toContain('requireAccount()')
    expect(page).toContain('getActiveOverride(account.id)')
    expect(page).toContain('hasPublicationEntitlement(account.id)')
    expect(page).not.toContain('account_id')
  })

  it('keeps canonical publication entitlement as the only access authority', () => {
    expect(entitlements).toContain('export async function hasPublicationEntitlement')
    expect(entitlements).toContain('getActiveOverride(accountUserId)')
    expect(page).toContain('publicationEntitlement')
    expect(page).not.toMatch(/const (isPaid|hasPlan|canPublish)/)
  })

  it('handles every supported subscription status without raw labels', () => {
    for (const status of ['ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'INCOMPLETE', 'EXPIRED']) {
      expect(page).toContain(`${status}:`)
    }
    expect(page).toContain('Acesso ativo')
    expect(page).toContain('Pagamento pendente')
    expect(page).toContain('Período de tolerância')
    expect(page).toContain('Ativação incompleta')
    expect(page).toContain('Acesso encerrado')
  })

  it('presents founder/free launch and administrative override honestly', () => {
    expect(page).toContain('Acesso de lançamento')
    expect(page).toContain('não há cobrança para este acesso')
    expect(page).toContain('Acesso administrativo')
    expect(page).not.toContain('override.reason')
  })

  it('does not expose internal billing or provider identifiers', () => {
    expect(page).not.toContain('provider_customer_id')
    expect(page).not.toContain('provider_subscription_id')
    expect(page).not.toContain('subscription.id')
    expect(page).not.toContain('plan.code')
    expect(page).not.toContain('price.price_code')
  })

  it('keeps mock infrastructure internal and does not present fake checkout', () => {
    expect(provider).toContain("process.env.PAYMENT_PROVIDER || 'MOCK'")
    expect(page).not.toContain('<CheckoutButton')
    expect(page).not.toContain('Pagamento confirmado')
    expect(page).toContain('ainda não integrou um provedor real de pagamentos')
    expect(page).toContain('Contratação ainda não disponível')
    expect(checkout).toContain('initiateCheckoutAction')
  })

  it('explains the canonical publication relationship without duplicating readiness', () => {
    expect(page).toContain('elegibilidade canônica')
    expect(page).toContain('perfil, verificação, regiões, fotos e moderação')
    expect(page).toContain('href="/onboarding/revisar"')
  })

  it('reuses the established dashboard shell and preserves primary navigation', () => {
    expect(page).toContain('className="velvet-dashboard velvet-billing"')
    expect(page).toContain('<ProfessionalDashboardHeader activeHref="/dashboard/billing" />')
  })

  it('uses semantic billing structures and responsive touch targets', () => {
    expect(page).toContain('<section className={`billing-access')
    expect(page).toContain('<dl>')
    expect(page).toContain('role="alert"')
    expect(css).toContain('.billing-checkout-button')
    expect(css).toContain('min-height: 50px')
    expect(css).toContain('@media (max-width: 600px)')
  })
})
