# Media / Photos
STATUS: APPROVED
VERSION: 1.0
LAST UPDATED: 2026-08-15

## MVP
Photos only. Video is excluded from MVP.

## Mandatory upload gate
Adult media upload is forbidden unless:
- user is authenticated and active
- identity_verified = true
- age_verified = true
- profile belongs to user
- applicable plan quota permits upload

Authorization is enforced server-side.

## Storage
Use external object storage + CDN. Do not store image binaries in PostgreSQL, GitHub, application filesystem or production app server.
Final storage/CDN provider remains pending explicit policy/compliance review for lawful adult content.

Suggested object layout uses internal random identifiers, never legal names/CPF:
profiles/<internal-profile-id>/<random-media-id>/<variant>

## Upload architecture
Prefer direct browser-to-object-storage upload using short-lived authorization generated only after backend eligibility checks.

## Formats / limits
Initial candidates: JPEG, PNG, WebP.
Do not accept SVG as profile photography.
Validate actual content/type rather than trusting extension.
Proposed maximum source upload: 15 MB/image, configurable.

## Processing
Source -> validate -> strip EXIF/location metadata -> resize/optimize -> security screening -> moderation queue.
Generate variants such as large (~1600px), medium (~900px), thumbnail (~400px). Exact encoding/quality to be calibrated.
Prefer deleting the original after a short technical processing/retention window, subject to final retention policy.

## Photo state machine
UPLOADING
-> PROCESSING
-> PENDING_MODERATION
-> APPROVED

Alternative states:
PROCESSING_FAILED
REJECTED
QUARANTINED
DELETED

No pending/rejected/quarantined media receives a permanent public URL.

## Metadata
Candidate fields:
id, profile_id, storage_key, status, position, is_primary,
original_width, original_height, created_at, approved_at, deleted_at.

Exactly one primary photo per profile. Manual ordering uses `position`.

## Plan quotas
Photo count is configurable by plan. Initial commercial proposal:
Founder 10
Essential 10
Premium 20
Top 30
Super Top 40
These are product defaults, not hardcoded application constants.

On downgrade, excess photos should be unpublished/held rather than immediately destroyed, allowing the advertiser to choose which remain active.

## Moderation
Verified identity does not imply that uploaded media is acceptable.
Every photo requires content screening/moderation before public publication.
Automated screening provider and final content policy will be selected in the Moderation phase after provider-policy review.

## Privacy / safety
- Strip EXIF/GPS from public variants.
- Use non-predictable storage keys.
- Signed/controlled access for non-public media.
- Hotlink/rate-limit/abuse controls where appropriate.
- Do not promise that publicly viewable images are impossible to copy.
- Watermark support may be added later; not mandatory for MVP.

## Cost principle
At early scale, storage volume is expected to be modest. Monitor bandwidth/egress, processing and moderation costs, which may become more significant than raw storage.

## Acceptance criteria
Unverified user upload -> rejected server-side.
Verified user -> authorized upload -> processing -> sanitized variants -> PENDING_MODERATION -> not public.
Only APPROVED media -> public delivery/CDN.
Quota reached -> additional upload blocked.
