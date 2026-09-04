'use server'

/**
 * Server Actions for WhatsApp OTP Authentication — R11.5B1
 *
 * Enforces:
 * - Authoritative intent model: ADVERTISER, CLIENT, or LOGIN
 * - Phone validation and E.164 normalization (+55XXXXXXXXXXX)
 * - Anti-enumeration rate limiting via IP-derived HMAC keys
 * - Invariant: OTP codes are NEVER logged, printed, or saved in plaintext
 * - Invariant: Zero service-role exposure to client code
 * - Invariant: Unconfigured provider fails closed with generic unavailable error
 */

import { headers } from 'next/headers'
import { deriveAuthRateLimitKey, isAuthRateLimited } from '@/modules/auth/rate-limiter'
import {
  normalizeWhatsAppPhone,
  defaultWhatsAppOtpProvider,
  type WhatsAppOtpProvider,
} from '@/modules/auth/whatsapp-otp'
import type { OAuthIntent } from '@/modules/auth/oauth'

/**
 * Derives a rate-limit key from IP address for WhatsApp OTP actions.
 */
async function getOtpRateLimitKey(): Promise<string | null> {
  const secret = process.env.ANALYTICS_RATE_LIMIT_SECRET || process.env.AUTH_INTENT_SECRET
  if (!secret) return null
  const headersList = await headers()
  const forwarded = headersList.get('x-forwarded-for')
  const rawIp = forwarded ? forwarded.split(',')[0].trim() : headersList.get('x-real-ip')
  return deriveAuthRateLimitKey(rawIp, secret)
}

export interface RequestWhatsAppOtpActionResult {
  success: boolean
  error?: string
  formattedPhone?: string
  retryAfterSeconds?: number
}

export async function requestWhatsAppOtpAction(
  rawPhone: string,
  intent: OAuthIntent,
  provider: WhatsAppOtpProvider = defaultWhatsAppOtpProvider
): Promise<RequestWhatsAppOtpActionResult> {
  // Validate intent
  if (intent !== 'ADVERTISER' && intent !== 'CLIENT' && intent !== 'LOGIN') {
    return { success: false, error: 'Intenção de autenticação inválida.' }
  }

  // Validate and normalize Brazilian phone number
  const normalized = normalizeWhatsAppPhone(rawPhone)
  if (!normalized.valid || !normalized.e164) {
    return { success: false, error: normalized.error || 'Número de WhatsApp inválido.' }
  }

  // Check rate limits
  const rateLimitKey = await getOtpRateLimitKey()
  if (rateLimitKey && isAuthRateLimited(rateLimitKey, 'OTP_REQUEST')) {
    return {
      success: false,
      error: 'Muitas tentativas de envio. Aguarde alguns minutos antes de tentar novamente.',
    }
  }

  // Call provider (unconfigured provider returns generic unavailable error, never fakes success)
  const result = await provider.requestOtp(normalized.e164, intent)

  return {
    success: result.success,
    error: result.error,
    formattedPhone: normalized.formatted,
    retryAfterSeconds: result.retryAfterSeconds,
  }
}

export interface VerifyWhatsAppOtpActionResult {
  success: boolean
  error?: string
  requiresIntentSelection?: boolean
}

export async function verifyWhatsAppOtpAction(
  rawPhone: string,
  code: string,
  intent: OAuthIntent,
  provider: WhatsAppOtpProvider = defaultWhatsAppOtpProvider
): Promise<VerifyWhatsAppOtpActionResult> {
  // Validate intent
  if (intent !== 'ADVERTISER' && intent !== 'CLIENT' && intent !== 'LOGIN') {
    return { success: false, error: 'Intenção de autenticação inválida.' }
  }

  // Validate code format (strict 6 numeric digits)
  const sanitizedCode = (code || '').trim()
  if (!/^\d{6}$/.test(sanitizedCode)) {
    return { success: false, error: 'Código inválido. Digite os 6 dígitos numéricos.' }
  }

  // Validate and normalize phone
  const normalized = normalizeWhatsAppPhone(rawPhone)
  if (!normalized.valid || !normalized.e164) {
    return { success: false, error: normalized.error || 'Número de WhatsApp inválido.' }
  }

  // Check rate limits
  const rateLimitKey = await getOtpRateLimitKey()
  if (rateLimitKey && isAuthRateLimited(rateLimitKey, 'OTP_VERIFY')) {
    return {
      success: false,
      error: 'Muitas tentativas de validação. Aguarde alguns minutos antes de tentar novamente.',
    }
  }

  // Call provider (unconfigured provider fails closed; never fakes success)
  const result = await provider.verifyOtp(normalized.e164, sanitizedCode, intent)

  return {
    success: result.success,
    error: result.error,
    requiresIntentSelection: result.requiresIntentSelection,
  }
}
