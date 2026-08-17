# Database
STATUS: HIGH-LEVEL MODEL
VERSION: 0.2
LAST UPDATED: 2026-08-15

Candidate tables: users, profiles, profile_photos, cities, regions, profile_service_regions, eye_colors, hair_colors, hair_lengths, body_types, languages, profile_languages, services, profile_services, plans, subscriptions, payments, boosts, verification_requests, reports, moderation_actions, profile_views, contact_clicks, audit_logs.

Do not create all tables in first migration. Add them by phase. PostgreSQL remains portable.
