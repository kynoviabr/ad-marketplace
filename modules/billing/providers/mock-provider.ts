/**
 * MockPaymentProvider — FASE 07
 *
 * Deterministic test adapter implementing PaymentProvider.
 * Used for development and integration testing.
 * No real money, no real gateway, no real SDK.
 */

import type {
  PaymentProvider,
  PaymentProviderCustomer,
  PaymentProviderCheckout,
  PaymentProviderSubscription,
  PaymentProviderWebhookResult,
} from './provider-interface'

const MOCK_WEBHOOK_SECRET = 'mock-webhook-secret-for-testing'

export class MockPaymentProvider implements PaymentProvider {
  readonly providerId = 'MOCK'

  async createCustomer(
    accountUserId: string,
    email: string
  ): Promise<PaymentProviderCustomer> {
    return {
      providerId: this.providerId,
      providerCustomerId: `mock_cus_${accountUserId.slice(0, 8)}`,
    }
  }

  async createCheckoutSession(params: {
    providerCustomerId: string
    planCode: string
    priceAmountMinor: number
    currency: string
    billingInterval: string
    successUrl: string
    cancelUrl: string
  }): Promise<PaymentProviderCheckout> {
    const customerToken = Buffer.from(params.providerCustomerId, 'utf8').toString('base64url')
    const subId = `mock_sub_${customerToken}_${Date.now()}`
    return {
      checkoutUrl: `https://mock-gateway.test/checkout/${subId}`,
      providerSubscriptionId: subId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
    }
  }

  async getSubscription(
    providerSubscriptionId: string
  ): Promise<PaymentProviderSubscription> {
    const customerToken = providerSubscriptionId.slice('mock_sub_'.length, providerSubscriptionId.lastIndexOf('_'))
    if (!providerSubscriptionId.startsWith('mock_sub_') || !customerToken) {
      throw new Error('Unknown mock subscription')
    }
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    return {
      providerSubscriptionId,
      providerCustomerId: Buffer.from(customerToken, 'base64url').toString('utf8'),
      stateUpdatedAt: now.toISOString(),
      status: 'active',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
    }
  }

  async cancelSubscription(
    _providerSubscriptionId: string,
    _atPeriodEnd: boolean
  ): Promise<void> {
    // Mock: no-op
  }

  async verifyWebhookSignature(
    _rawBody: Buffer,
    signature: string
  ): Promise<boolean> {
    return signature === MOCK_WEBHOOK_SECRET
  }

  async normalizeWebhookEvent(
    rawBody: Buffer
  ): Promise<PaymentProviderWebhookResult> {
    const payload = JSON.parse(rawBody.toString())
    return {
      isValid: true,
      eventId: payload.event_id || `mock_evt_${Date.now()}`,
      eventType: payload.event_type || 'subscription.updated',
      providerSubscriptionId: payload.provider_subscription_id || null,
      normalizedData: payload,
    }
  }
}

/** Exported for test webhook signature verification. */
export const MOCK_WEBHOOK_SIGNING_SECRET = MOCK_WEBHOOK_SECRET
