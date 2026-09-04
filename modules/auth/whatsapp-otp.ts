/**
 * WhatsApp OTP Foundation & Passwordless Auth Interface — R11.5B1
 *
 * Provider-neutral contract for WhatsApp OTP authentication.
 * Strict safety invariants:
 * 1. Provider is unconfigured (WHATSAPP_OTP_PROVIDER_CONFIGURED = false).
 * 2. OTP codes must never be logged, printed, or persisted in plaintext.
 * 3. Client code has zero access to service role.
 * 4. Roles are NEVER assigned from phone number alone.
 * 5. Existing account roles are immutable.
 * 6. Ambiguous new accounts on /login fail closed (require explicit CLIENT vs ADVERTISER choice).
 */

import type { OAuthIntent } from '@/modules/auth/oauth'

/**
 * Feature flag / configuration marker.
 * Explicitly false in R11.5B1 foundation phase.
 */
export const WHATSAPP_OTP_PROVIDER_CONFIGURED = false as const

/**
 * Public feature flag: controls whether "Continuar com WhatsApp" UI is rendered.
 * Defaults to false (hidden) when env var is missing or not 'true'.
 */
export function isWhatsAppOtpEnabled(): boolean {
  return process.env.NEXT_PUBLIC_WHATSAPP_OTP_ENABLED === 'true'
}

export type WhatsAppOtpIntent = OAuthIntent

export interface WhatsAppOtpRequestResult {
  success: boolean
  error?: string
  retryAfterSeconds?: number
}

export interface WhatsAppOtpVerifyResult {
  success: boolean
  error?: string
  sessionToken?: string
  role?: 'CLIENT' | 'ADVERTISER'
  requiresIntentSelection?: boolean
}

export interface WhatsAppOtpProvider {
  readonly isConfigured: boolean
  requestOtp(e164Phone: string, intent: WhatsAppOtpIntent): Promise<WhatsAppOtpRequestResult>
  verifyOtp(e164Phone: string, code: string, intent: WhatsAppOtpIntent): Promise<WhatsAppOtpVerifyResult>
}

/**
 * Result of phone normalization.
 */
export interface PhoneNormalizationResult {
  valid: boolean
  e164?: string
  formatted?: string
  rawDigits?: string
  error?: string
}

/**
 * Normalizes Brazilian phone input to canonical E.164 (+55XXXXXXXXXXX).
 * Validates:
 * - 2-digit Brazilian DDD (11-99)
 * - 9-digit Brazilian mobile format (must start with 9)
 * - Strips non-digits, handles leading zero, and strips redundant +55/55 prefix.
 */
export function normalizeWhatsAppPhone(rawInput: string | null | undefined): PhoneNormalizationResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return { valid: false, error: 'Telefone não informado.' }
  }

  // Remove non-digit characters
  let digits = rawInput.replace(/\D/g, '')

  // Handle leading 0 (e.g. 011987654321 -> 11987654321)
  if (digits.startsWith('0') && digits.length >= 12) {
    digits = digits.slice(1)
  }

  // If starts with country code 55 and has 12 or 13 digits (e.g. 5511987654321)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2)
  }

  // Brazilian mobile number with DDD must be exactly 11 digits: 2 DDD + 9 mobile digits
  if (digits.length !== 11) {
    return {
      valid: false,
      error: 'O número deve conter DDD (2 dígitos) e celular de 9 dígitos.',
    }
  }

  const ddd = parseInt(digits.slice(0, 2), 10)
  if (ddd < 11 || ddd > 99) {
    return {
      valid: false,
      error: 'DDD inválido. Informe um DDD brasileiro válido (11 a 99).',
    }
  }

  // In Brazil, all mobile numbers start with 9
  const firstMobileDigit = digits.charAt(2)
  if (firstMobileDigit !== '9') {
    return {
      valid: false,
      error: 'O número de celular deve iniciar com 9 após o DDD.',
    }
  }

  const dddStr = digits.slice(0, 2)
  const part1 = digits.slice(2, 7)
  const part2 = digits.slice(7, 11)

  const e164 = `+55${digits}`
  const formatted = `(${dddStr}) ${part1}-${part2}`

  return {
    valid: true,
    e164,
    formatted,
    rawDigits: digits,
  }
}

/**
 * Format Brazilian phone input for live display as the user types.
 * e.g.:
 * "11" -> "(11"
 * "119" -> "(11) 9"
 * "1198765" -> "(11) 98765"
 * "11987654321" -> "(11) 98765-4321"
 */
export function formatBrazilianPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

/**
 * Unconfigured implementation for R11.5B1 foundation.
 * Explicitly disabled: returns generic provider unavailable error.
 * INVARIANT: Never fakes successful OTP delivery or verification.
 * INVARIANT: Never logs plaintext phone or OTP code.
 */
export class UnconfiguredWhatsAppOtpProvider implements WhatsAppOtpProvider {
  readonly isConfigured = WHATSAPP_OTP_PROVIDER_CONFIGURED

  async requestOtp(_e164Phone: string, _intent: WhatsAppOtpIntent): Promise<WhatsAppOtpRequestResult> {
    return {
      success: false,
      error: 'O serviço de WhatsApp não está disponível no momento. Utilize o login por Google ou e-mail.',
      retryAfterSeconds: 0,
    }
  }

  async verifyOtp(_e164Phone: string, _code: string, _intent: WhatsAppOtpIntent): Promise<WhatsAppOtpVerifyResult> {
    return {
      success: false,
      error: 'O serviço de autenticação por WhatsApp não está disponível.',
    }
  }
}

export const defaultWhatsAppOtpProvider: WhatsAppOtpProvider = new UnconfiguredWhatsAppOtpProvider()

let activeWhatsAppOtpProvider: WhatsAppOtpProvider = defaultWhatsAppOtpProvider

/**
 * Resolves the server-side WhatsApp OTP provider instance.
 * Provider selection happens strictly server-side.
 */
export function getWhatsAppOtpProvider(): WhatsAppOtpProvider {
  return activeWhatsAppOtpProvider
}

/**
 * Server-side test helper to inject a mock provider in automated tests.
 * NEVER exposed or accessible to client components or client-callable actions.
 */
export function setWhatsAppOtpProviderForTesting(provider: WhatsAppOtpProvider): void {
  activeWhatsAppOtpProvider = provider
}

/**
 * Server-side test helper to reset provider to default unconfigured provider.
 */
export function resetWhatsAppOtpProviderForTesting(): void {
  activeWhatsAppOtpProvider = defaultWhatsAppOtpProvider
}

export type RoleResolutionResult =
  | { success: true; role: 'ADVERTISER' | 'CLIENT'; requiresIntentSelection: false }
  | { success: false; role: null; requiresIntentSelection: true; error: string }

/**
 * Resolves account role for an authenticated WhatsApp phone number.
 * Enforces role immutability and fail-closed safety:
 * - If account exists, returns existing immutable role.
 * - If new user and intent === 'LOGIN', fails closed (requires explicit intent choice: CLIENT vs ADVERTISER).
 * - If new user and intent === 'ADVERTISER', role is ADVERTISER.
 * - If new user and intent === 'CLIENT', role is CLIENT.
 * - NEVER assigns role from phone number alone.
 */
export function resolveWhatsAppUserRole(
  existingUserRole: 'ADVERTISER' | 'CLIENT' | null | undefined,
  intent: WhatsAppOtpIntent
): RoleResolutionResult {
  // If account already exists, existing role is strictly immutable
  if (existingUserRole) {
    return { success: true, role: existingUserRole, requiresIntentSelection: false }
  }

  // New account attempting LOGIN intent: must fail closed!
  if (intent === 'LOGIN') {
    return {
      success: false,
      role: null,
      requiresIntentSelection: true,
      error: 'Conta não encontrada. Para criar uma nova conta, selecione como deseja usar a velvet.',
    }
  }

  // Explicit intent from signup flows
  if (intent === 'ADVERTISER' || intent === 'CLIENT') {
    return { success: true, role: intent, requiresIntentSelection: false }
  }

  // Any other state fails closed
  return {
    success: false,
    role: null,
    requiresIntentSelection: true,
    error: 'Intenção de acesso inválida.',
  }
}

/**
 * Safety verification: returns masked version of phone number for safe display/logging.
 * e.g. +5511987654321 -> +55 11 9****-**21
 */
export function maskPhoneNumber(e164: string): string {
  if (!e164 || e164.length < 8) return '***'
  const prefix = e164.slice(0, 6) // e.g. +55119
  const suffix = e164.slice(-2)   // e.g. 21
  return `${prefix}****-**${suffix}`
}
