# Billing, Plans & Founders
STATUS: APPROVED BASELINE — PROVIDER PENDING UNDERWRITING
VERSION: 1.0
LAST UPDATED: 2026-08-16

## Business model
Online classified advertising portal. Advertisers pay the portal for profile publication, visibility, premium listings and boosts.

The platform does NOT sell adult content to visitors, process visitor-to-advertiser service payments, escrow user payments, receive commissions on advertised services, or act as payment facilitator between visitor and advertiser.

## Plans and entitlements
Initial configurable plans: Founder, Essential, Premium, Top, Super Top.
Benefits are resolved through configurable entitlements such as max_photos, max_regions, ranking_priority and analytics_access; avoid hardcoded plan-name logic.

## Founder program
Founder acquisition program approved. Current planned commercial floor after the promotional period: R$99.99/month, configurable.
Trial may start without card collection. Conversion to paid must be explicit.

## Lifecycle
TRIAL -> ACTIVE -> PAYMENT_FAILED -> GRACE_PERIOD -> PAUSED.
Cancellation can remain active until period end and then become PAUSED.
PAUSED is not DELETED; public visibility stops while account/profile/media are retained according to policy.

Upgrade: generally immediate.
Downgrade: generally next billing cycle.
Excess photos/regions after downgrade are held/unpublished, not automatically destroyed.

## Architecture
Use a payment-provider abstraction. Domain logic must not be coupled to one gateway SDK.
Signed provider webhooks are the source of truth for subscription/payment state and must be processed idempotently using provider event IDs.

## Provider benchmark — 2026-08-16
Underwriting description: Brazilian online classified advertising portal for verified adult independent professionals. Advertisers pay monthly for profile publication/promotion. Visitors do not pay the portal for advertised services and the portal does not intermediate those transactions.

Current candidates:
1. Pagar.me / Stone — payment candidate #1; technically strong for API, card, Pix, recurrence and webhooks. Written underwriting approval required.
2. Mercado Pago — candidate #2; strong API/card/Pix/subscription capabilities. Written business-model approval required.
3. Safe2Pay — candidate #3; important lead because a major Brazilian competitor publicly identifies it among payment partners. Direct approval still required.
4. Cielo — investigation candidate; the same competitor publicly identifies it among payment partners. Direct approval required.
5. PicPay — additional lead, particularly for Pix/payment methods, based on competitor disclosure.
6. PagBank/PagSeguro — lower priority because published restrictions create material policy risk for this vertical; do not use without explicit written approval.
International adult/high-risk processors remain fallback options if Brazilian providers decline.

No provider is approved until it reviews the exact model and confirms eligibility in writing. Ask which MCC/classification will apply.

## Other rules
Do not implement Stripe or another provider by assumption.
Payment collection and Brazilian fiscal/NFS-e obligations are separate concerns.
Track trial-to-paid conversion, MRR, active subscriptions, failures, churn, ARPU and revenue by plan.
