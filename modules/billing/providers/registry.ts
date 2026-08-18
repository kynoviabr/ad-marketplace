/**
 * Payment Provider Registry — FASE 07
 *
 * Resolves the active payment provider at runtime.
 * Provider selection is based on PAYMENT_PROVIDER environment variable.
 * Default: MOCK (no real gateway).
 */

import type { PaymentProvider } from './provider-interface'
import { MockPaymentProvider } from './mock-provider'

/**
 * Returns the active PaymentProvider adapter.
 *
 * Currently only MOCK is available.
 * Real provider adapters will be added in dedicated files
 * inside modules/billing/providers/ after underwriting approval.
 */
export function getPaymentProvider(): PaymentProvider {
  const providerName = process.env.PAYMENT_PROVIDER || 'MOCK'

  switch (providerName) {
    case 'MOCK':
      return new MockPaymentProvider()
    // Future provider adapters:
    // case 'PAGARME': return new PagarmeProvider()
    // case 'MERCADOPAGO': return new MercadoPagoProvider()
    default:
      throw new Error(
        `[billing] Unknown payment provider: ${providerName}. ` +
        'Set PAYMENT_PROVIDER env var to a supported value.'
      )
  }
}
