'use client'

import { createContext, useContext, useMemo } from 'react'
import { createTranslator, type MessageKey, type TranslationValues } from '@/lib/i18n/catalog'
import type { Locale } from '@/lib/i18n/config'

type I18nContextValue = {
  locale: Locale
  t: (key: MessageKey, values?: TranslationValues) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, t: createTranslator(locale) }), [locale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used within I18nProvider')
  return context
}
