# Authentication & Account
STATUS: APPROVED
VERSION: 1.0
LAST UPDATED: 2026-08-15

Signup collects email, password, 18+ declaration, Terms acceptance and Privacy acceptance.
Do not request legal name, CPF, address or documents during signup.

Flow: signup -> email confirmation -> login -> identity/age verification -> profile onboarding.

Store acceptance timestamps and Terms/Privacy versions. Use server-side authorization, RLS where applicable, rate limiting, generic password-reset responses, and never expose service-role credentials.
