import { commonPtBR, commonEn } from './messages/common'
import { publicPtBR, publicEn } from './messages/public'
import { authOnboardingPtBR, authOnboardingEn } from './messages/auth-onboarding'
import { adminPtBR, adminEn } from './messages/admin'
import { seoPtBR, seoEn } from './messages/seo'
import type { Locale } from './config'

export const ptBRMessages = {
  ...commonPtBR,
  ...publicPtBR,
  ...authOnboardingPtBR,
  ...adminPtBR,
  ...seoPtBR,
} as const

export type MessageKey = keyof typeof ptBRMessages
export type Messages = Record<MessageKey, string>

export const enMessages = {
  ...commonEn,
  ...publicEn,
  ...authOnboardingEn,
  ...adminEn,
  ...seoEn,
} satisfies Messages

export const catalogs: Record<Locale, Messages> = {
  'pt-BR': ptBRMessages,
  en: enMessages,
}

export type TranslationValues = Record<string, string | number>

export function resolveMessage(locale: Locale, key: string): string {
  const localized = (catalogs[locale] as Record<string, string | undefined>)[key]
  const fallback = (ptBRMessages as Record<string, string | undefined>)[key]

  if (!localized && process.env.NODE_ENV !== 'production') {
    console.warn(`[i18n] Missing ${locale} translation: ${key}`)
  }

  return localized || fallback || ptBRMessages['common.notAvailable']
}

export function translate(locale: Locale, key: MessageKey, values?: TranslationValues): string {
  const template = resolveMessage(locale, key)

  return Object.entries(values ?? {}).reduce(
    (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
    template
  )
}

export function createTranslator(locale: Locale) {
  return (key: MessageKey, values?: TranslationValues) => translate(locale, key, values)
}
