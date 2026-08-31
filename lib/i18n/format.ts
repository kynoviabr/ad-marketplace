import type { Locale } from './config'

export function formatDate(
  value: string | Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'short' }
): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'pt-BR', options).format(new Date(value))
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'pt-BR').format(value)
}

export function formatCurrency(value: number, locale: Locale, currency = 'BRL'): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'pt-BR', {
    style: 'currency',
    currency,
  }).format(value)
}
