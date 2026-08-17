# Boosts, Sponsored Visibility & Ranking
STATUS: APPROVED
VERSION: 2.0
LAST UPDATED: 2026-08-16

## Separation
Subscription = ongoing publication/plan benefits.
Promotion = temporary paid exposure.
Search organic ranking and sponsored inventory remain separate engines/layers.

## MVP promotion products
- BOOST_24H
- BOOST_7D
- FEATURED_REGION_7D
- FEATURED_CITY_7D

Prices, duration, scope, inventory and eligibility are configurable. No product guarantees permanent #1 placement.

## Sponsored inventory
Sponsored/featured placement must be clearly identifiable.
Inventory is limited by scope and rotated fairly when multiple campaigns are eligible.
Initial result-page target may cap sponsored cards (e.g. 4 of 24), subject to beta testing.

## Campaign model
promotion_products: code, price, duration_hours, scope_type, active and configurable rules.
promotion_campaigns: profile_id, product_id, scope_type, scope_id, starts_at, ends_at, status, payment_id.

Lifecycle:
PENDING_PAYMENT -> SCHEDULED/ACTIVE -> COMPLETED.
Other states: PAUSED, CANCELED, REFUNDED.

MVP campaigns start after confirmed payment; scheduling UI is deferred.

## Eligibility
Before checkout/activation require active eligible subscription/trial, approved public profile, valid verification and no suspension.
Payment webhook activates paid campaign.

If profile is suspended, active promotion is immediately removed/paused. Restoration/refund behavior follows moderation and commercial terms.

## Limits
Support max active promotions per profile and max sponsored slots per geographic scope. Do not allow unlimited inventory to destroy visitor experience.

## Plan interaction
Higher plans may receive configurable promotion discounts or credits, but plan benefits do not replace temporary promotion products.
Founder promotional credit/periodic boost is a configurable commercial experiment, not a hardcoded entitlement.

## Credits/referrals
Architecture may later support promotional credits redeemable only for visibility products. Referral rewards should preferably use platform visibility/credits rather than cash during early growth.

## Analytics
Every campaign measures impressions, profile views and contact clicks. Dashboard may compare campaign performance with a prior baseline when sufficient data exists. Never promise guaranteed clients or unsupported performance uplift.

Core monetization metrics:
- Promotion Attach Rate
- Promotion ARPPU
- promotion revenue
- sponsored inventory occupancy
- campaign conversion funnel

## Deferred
Dynamic pricing, campaign scheduling, bundles, daypart/weekend products and sophisticated auction systems are post-MVP.
