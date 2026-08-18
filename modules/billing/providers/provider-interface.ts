/**
 * PaymentProvider interface — FASE 07
 *
 * Abstract contract for payment gateway adapters.
 * Domain logic NEVER imports a specific SDK — only this interface.
 */

export interface PaymentProviderCustomer {
  providerId: string
  providerCustomerId: string
}

export interface PaymentProviderCheckout {
  checkoutUrl: string
  providerSubscriptionId: string | null
  expiresAt: string
}

export interface PaymentProviderSubscription {
  providerSubscriptionId: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

export interface PaymentProviderWebhookResult {
  isValid: boolean
  eventId: string
  eventType: string
  providerSubscriptionId: string | null
  normalizedData: Record<string, unknown>
}

export interface PaymentProvider {
  /** Unique provider identifier (e.g., 'MOCK', 'PAGARME', 'MERCADOPAGO'). */
  readonly providerId: string

  /** Create an external customer record for billing. */
  createCustomer(
    accountUserId: string,
    email: string
  ): Promise<PaymentProviderCustomer>

  /** Create a hosted checkout session. Amount resolved server-side. */
  createCheckoutSession(params: {
    providerCustomerId: string
    planCode: string
    priceAmountMinor: number
    currency: string
    billingInterval: string
    successUrl: string
    cancelUrl: string
  }): Promise<PaymentProviderCheckout>

  /** Fetch subscription state server-to-server (zero-trust). */
  getSubscription(
    providerSubscriptionId: string
  ): Promise<PaymentProviderSubscription>

  /** Cancel a subscription via provider API. */
  cancelSubscription(
    providerSubscriptionId: string,
    atPeriodEnd: boolean
  ): Promise<void>

  /** Verify webhook signature. */
  verifyWebhookSignature(
    rawBody: Buffer,
    signature: string
  ): Promise<boolean>

  /** Normalize raw webhook payload into domain event. */
  normalizeWebhookEvent(
    rawBody: Buffer
  ): Promise<PaymentProviderWebhookResult>
}
