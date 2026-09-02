# R9 — Advanced media / video profiles

V1 stores videos and posters in the private `profile-videos` bucket. Limits are enforced in the browser, server schemas, byte inspection, Storage bucket configuration, and database constraints: three active videos per profile, 30 seconds and 50 MB each, MP4 or WebM. A poster is a JPEG/WebP of at most 2 MB.

Uploads are direct-to-Storage through short-lived signed upload URLs. Confirmation downloads each object once to the application server, verifies actual byte length, container signature and container duration, then moves the row from `UPLOADING` to `PENDING_MODERATION`. This one-time verification costs one read of the uploaded video but avoids paid transcoding and prevents trusting client metadata. Rejected and pending objects remain private. Deletion soft-deletes the record first and removes both storage objects idempotently.

Public profile delivery lists only `APPROVED` records. Initial render signs and lazy-loads posters only; no video URL or bytes are requested. A 15-minute playback URL is created only after an explicit Play click and only after rechecking publication eligibility. Playback uses native controls, no autoplay and `preload="none"`. There is no third-party transcoding, adaptive streaming or derived rendition in V1, so bandwidth equals the bytes viewers explicitly play; the hard per-profile storage ceiling is 150 MB of video plus posters.

Moderation has a separate audit trail and never changes photo, text or review moderation. Server actions validate professional ownership for create, reorder and delete. The service-role key remains server-only and storage paths are generated from authenticated profile and server UUIDs.
