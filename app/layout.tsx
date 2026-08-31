import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Inter } from 'next/font/google'
import './globals.css'
import { constructRootMetadata, generateWebsiteJsonLd } from '@/modules/seo'
import { JsonLd } from '@/components/seo/json-ld'
import { I18nProvider } from '@/components/i18n'
import { getRequestLocale } from '@/lib/i18n/server'

/**
 * Plus Jakarta Sans — display and heading font.
 * Premium, modern humanist sans-serif.
 * Frozen in FASE 12.1C Design Contract.
 */
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display-loaded',
  display: 'swap',
  preload: true,
})

/**
 * Inter — body and UI font.
 * Best-in-class legibility at all sizes.
 * Frozen in FASE 12.1C Design Contract.
 */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body-loaded',
  display: 'swap',
  preload: true,
})

export async function generateMetadata(): Promise<Metadata> {
  return constructRootMetadata()
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getRequestLocale()
  const websiteJsonLd = generateWebsiteJsonLd(locale)

  return (
    <html
      lang={locale}
      className={`${plusJakartaSans.variable} ${inter.variable}`}
    >
      <head>
        <JsonLd data={websiteJsonLd} />
      </head>
      <body><I18nProvider locale={locale}>{children}</I18nProvider></body>
    </html>
  )
}
