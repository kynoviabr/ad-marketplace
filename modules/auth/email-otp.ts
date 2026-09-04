import { z } from 'zod'

export interface RequestEmailOtpResult {
  success: boolean
  error?: string
  email?: string
  retryAfterSeconds?: number
  requiresIntentSelection?: boolean
}

export interface VerifyEmailOtpResult {
  success: boolean
  error?: string
  destination?: string
  requiresIntentSelection?: boolean
}

/**
 * Public feature flag: controls whether "Receber código por e-mail" UI is rendered.
 * Defaults to false (hidden) when env var is missing or not 'true'.
 * Required because hosted Supabase requires Custom SMTP to edit email templates for 6-digit tokens.
 */
export function isEmailOtpEnabled(): boolean {
  return process.env.NEXT_PUBLIC_EMAIL_OTP_ENABLED === 'true'
}

const emailSchema = z.string().trim().email()

/**
 * Normalizes and validates an email address.
 * Converts to lowercase and trims whitespace.
 */
export function normalizeEmail(rawEmail: unknown): {
  valid: boolean
  email?: string
  error?: string
} {
  if (!rawEmail || typeof rawEmail !== 'string') {
    return { valid: false, error: 'Informe um endereço de e-mail válido.' }
  }

  const trimmed = rawEmail.trim().toLowerCase()
  const parsed = emailSchema.safeParse(trimmed)
  if (!parsed.success) {
    return { valid: false, error: 'Informe um endereço de e-mail válido.' }
  }

  return { valid: true, email: parsed.data }
}

/**
 * Validates a 6-digit numeric OTP code.
 */
export function validateEmailOtpCode(rawCode: unknown): {
  valid: boolean
  code?: string
  error?: string
} {
  if (!rawCode || typeof rawCode !== 'string') {
    return { valid: false, error: 'Código de verificação inválido.' }
  }

  const sanitized = rawCode.trim()
  if (!/^\d{6}$/.test(sanitized)) {
    return { valid: false, error: 'Código inválido. Digite os 6 dígitos numéricos.' }
  }

  return { valid: true, code: sanitized }
}

/**
 * Masks an email for safe display / logging (e.g. j***e@example.com).
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return ''
  const [local, domain] = email.split('@')
  if (local.length <= 2) {
    return `${local[0] || '*'}***@${domain}`
  }
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`
}
