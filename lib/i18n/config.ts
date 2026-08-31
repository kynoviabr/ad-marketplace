export const SUPPORTED_LOCALES = ['pt-BR', 'en'] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'pt-BR'
export const LOCALE_COOKIE = 'velvet_locale'
export const LOCALE_HEADER = 'x-velvet-locale'

export function isLocale(value: string | null | undefined): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale)
}

export function resolveLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE
}
