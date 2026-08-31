import 'server-only'
import { headers } from 'next/headers'
import { LOCALE_HEADER, resolveLocale, type Locale } from './config'
import { createTranslator } from './catalog'

export async function getRequestLocale(): Promise<Locale> {
  return resolveLocale((await headers()).get(LOCALE_HEADER))
}

export async function getTranslations() {
  const locale = await getRequestLocale()
  return { locale, t: createTranslator(locale) }
}
