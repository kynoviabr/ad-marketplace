# Moderation, Reports & Admin
STATUS: APPROVED
VERSION: 1.0
LAST UPDATED: 2026-08-15

## Principle
KYC verifies the person; moderation verifies profile/media. Media is never public before approval.

## States
Profile: DRAFT, PENDING_MODERATION, APPROVED, REJECTED, SUSPENDED, ARCHIVED.
Photo: UPLOADING, PROCESSING, PENDING_MODERATION, APPROVED, REJECTED, QUARANTINED, DELETED.
Report: OPEN, UNDER_REVIEW, RESOLVED, DISMISSED, ESCALATED.

## Moderation
Review profile text/metadata and photos against platform policy. Rejections require structured reason plus optional moderator note. Rejection of content is distinct from account suspension or permanent ban.

## Reports
Visitors can report profiles/content using structured categories plus optional description. Reports have severity LOW/MEDIUM/HIGH/CRITICAL. Critical signals may trigger quarantine pending human review. Raw report count alone must never automatically ban a user; rate-limit and protect reporting against abuse.

## Admin roles
ADVERTISER, MODERATOR, ADMIN, SUPER_ADMIN.
Moderators can review/approve/reject/quarantine and process reports. They should see KYC verification status, not raw KYC documents by default.
Admins manage users, suspensions and operational taxonomies/settings.
SUPER_ADMIN is exceptional and limited.

## Admin
Dashboard includes moderation queues, profiles, photos, users, verification status, reports, suspensions, plans/subscriptions, locations, services, analytics, audit logs and settings.

## Audit
Sensitive administrative actions require immutable/auditable records including actor, action, entity, reason, old/new value and timestamp.

## Suspension / appeals
Support temporary, indefinite and permanent suspension with reason and optional expiry. Suspension removes public visibility and blocks uploads. Provide a simple appeal/review-request mechanism.

## Edits
Relevant changes to already-approved content can require re-moderation; low-risk operational changes such as availability need not necessarily unpublish the whole profile.

## Automation
Automated screening can assist triage, but MVP does not rely on an AI system as the sole final authority for bans/publication decisions.

## Notifications
Dashboard notification and email for material moderation outcomes.

## Policy
Explicitly prohibit unlawful content, minors/ambiguous minor content, non-consensual content, coercion/exploitation, trafficking, sexual violence, unauthorized third-party content, doxxing/private data exposure, identity/KYC circumvention and other prohibited material. Final legal/content policy requires professional review before production.
