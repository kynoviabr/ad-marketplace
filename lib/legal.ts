import 'server-only'

export function getPrivacyContactEmail(): string | null {
  const value = process.env.PRIVACY_CONTACT_EMAIL?.trim()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const isPreviewOrLocal = /localhost|127\.0\.0\.1|\.vercel\.app|staging\./i.test(appUrl)
  if (!value && process.env.NODE_ENV === 'production' && !isPreviewOrLocal) {
    throw new Error('PRIVACY_CONTACT_EMAIL must be configured before production.')
  }
  return value || null
}

export function getLegalProductionReadinessIssues(
  env?: { PRIVACY_CONTACT_EMAIL?: string }
): string[] {
  const privacyContactEmail = env?.PRIVACY_CONTACT_EMAIL ?? process.env.PRIVACY_CONTACT_EMAIL
  return privacyContactEmail?.trim()
    ? []
    : ['PRIVACY_CONTACT_EMAIL must be configured before production.']
}
