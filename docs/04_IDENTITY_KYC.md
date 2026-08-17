# Identity & Age Verification
STATUS: APPROVED — PROVIDER PROVISIONAL
VERSION: 1.0
LAST UPDATED: 2026-08-15

## Mandatory invariant
No adult media upload until identity_verified=true AND age_verified=true.

## Preferred provider
Didit, pending final production review of Terms/AUP, DPA, biometric processing, retention/deletion, residency/subprocessors, Brazilian-document support and final pricing.

Desired checks: document verification, face match, passive liveness, verified DOB/age, CPF validation when justified, and duplicate/fraud controls where appropriate.

Prefer that raw documents, KYC selfies and biometric artifacts remain with the KYC provider rather than being duplicated into our infrastructure.

Suggested internal record: user_id, provider, provider_reference, status, identity_verified, age_verified, cpf_verified, verified_country, started_at, verified_at, expires_at.

Never expose legal name, CPF, document data, full DOB, residential address, KYC selfie or provider reference publicly.
