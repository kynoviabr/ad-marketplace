import 'server-only'
import { headers, cookies } from 'next/headers'
import { LOCALE_COOKIE, LOCALE_HEADER, resolveLocale, isLocale, type Locale } from './config'
import { createTranslator } from './catalog'

export async function getRequestLocale(): Promise<Locale> {
  const headerLocale = (await headers()).get(LOCALE_HEADER)
  if (headerLocale && isLocale(headerLocale)) {
    return headerLocale
  }
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value
  return resolveLocale(cookieLocale)
}

export async function getTranslations() {
  const locale = await getRequestLocale()
  return { locale, t: createTranslator(locale) }
}
