import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { InitiateCheckoutSchema } from '@/modules/billing/schemas'
import { buildTrustedCheckoutReturnUrls } from '@/modules/billing/return-urls'

const planId = '123e4567-e89b-42d3-a456-426614174000'
const priceId = '987fcdeb-51a2-43f7-9876-543210987654'

describe('R12 P1-4 checkout return URL boundary', () => {
  it('builds fixed success and cancel URLs from the trusted production origin', () => {
    expect(buildTrustedCheckoutReturnUrls('https://velvetgirls.club', 'production')).toEqual({
      successUrl: 'https://velvetgirls.club/dashboard/billing?success=true',
      cancelUrl: 'https://velvetgirls.club/dashboard/billing?canceled=true',
    })
  })

  it('preserves a configured HTTPS Preview origin', () => {
    const urls = buildTrustedCheckoutReturnUrls('https://velvet-preview.example.vercel.app/', 'production')
    expect(urls.successUrl).toMatch(/^https:\/\/velvet-preview\.example\.vercel\.app\/dashboard\/billing/)
    expect(urls.cancelUrl).toMatch(/^https:\/\/velvet-preview\.example\.vercel\.app\/dashboard\/billing/)
  })

  it('allows HTTP only for explicit local non-production development', () => {
    expect(buildTrustedCheckoutReturnUrls('http://localhost:3000', 'development').successUrl)
      .toBe('http://localhost:3000/dashboard/billing?success=true')
    expect(() => buildTrustedCheckoutReturnUrls('http://localhost:3000', 'production')).toThrow('INVALID_APP_ORIGIN')
    expect(() => buildTrustedCheckoutReturnUrls('http://evil.example', 'development')).toThrow('INVALID_APP_ORIGIN')
  })

  it.each([
    'https://evil.example/path',
    '//evil.example/path',
    'javascript:alert(1)',
    'data:text/html,phishing',
    'https:%2f%2fevil.example',
    'HTTPS://user@evil.example',
    ' https://velvetgirls.club',
    'https://velvetgirls.club#@evil.example',
    'https://velvetgirls.club?next=https://evil.example',
    'https://velvetgirls.club/\\evil.example',
  ])('rejects malformed, ambiguous or non-origin configuration: %s', (value) => {
    expect(() => buildTrustedCheckoutReturnUrls(value, 'production')).toThrow('INVALID_APP_ORIGIN')
  })

  it.each([
    ['successUrl', 'https://evil.example/return'],
    ['cancelUrl', 'https://phishing.example/return'],
    ['successUrl', '//evil.example/path'],
    ['successUrl', 'javascript:alert(1)'],
    ['cancelUrl', 'data:text/html,phishing'],
    ['cancelUrl', 'https:%2f%2fevil.example'],
  ])('rejects caller-controlled %s before checkout creation', (field, value) => {
    expect(InitiateCheckoutSchema.safeParse({ planId, priceId, [field]: value }).success).toBe(false)
  })

  it('accepts only the authoritative plan and price identifiers', () => {
    expect(InitiateCheckoutSchema.parse({ planId, priceId })).toEqual({ planId, priceId })
  })

  it('constructs trusted URLs before obtaining or calling the provider', () => {
    const actions = fs.readFileSync(path.join(process.cwd(), 'modules/billing/actions.ts'), 'utf8')
    const checkout = actions.slice(actions.indexOf('initiateCheckoutAction'), actions.indexOf('cancelSubscriptionAction'))
    const trusted = checkout.indexOf('getTrustedCheckoutReturnUrls()')
    const provider = checkout.indexOf('getPaymentProvider()')
    expect(trusted).toBeGreaterThanOrEqual(0)
    expect(provider).toBeGreaterThan(trusted)
    expect(checkout).toContain('successUrl,')
    expect(checkout).toContain('cancelUrl,')
    expect(checkout).not.toContain('validated.data.successUrl')
    expect(checkout).not.toContain('validated.data.cancelUrl')
    expect(checkout).not.toContain('NEXT_PUBLIC_SITE_URL')
  })

  it('removes return URL props and payload fields from the browser component', () => {
    const component = fs.readFileSync(path.join(process.cwd(), 'components/billing/checkout-button.tsx'), 'utf8')
    expect(component).not.toContain('successUrl')
    expect(component).not.toContain('cancelUrl')
    expect(component).toContain('initiateCheckoutAction({')
    expect(component).toContain('planId,')
    expect(component).toContain('priceId,')
  })

  it('preserves server-side authorization and authoritative price resolution', () => {
    const actions = fs.readFileSync(path.join(process.cwd(), 'modules/billing/actions.ts'), 'utf8')
    const checkout = actions.slice(actions.indexOf('initiateCheckoutAction'), actions.indexOf('cancelSubscriptionAction'))
    expect(checkout).toContain('const account = await requireAccount()')
    expect(checkout).toContain('getPriceById(validated.data.priceId)')
    expect(checkout).toContain('priceAmountMinor: price.amount_minor')
    expect(checkout).toContain('currency: price.currency')
  })
})
