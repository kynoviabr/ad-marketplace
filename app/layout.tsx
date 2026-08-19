import type { Metadata } from 'next'
import './globals.css'
import { constructRootMetadata, generateWebsiteJsonLd } from '@/modules/seo'
import { JsonLd } from '@/components/seo/json-ld'

export async function generateMetadata(): Promise<Metadata> {
  return constructRootMetadata()
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const websiteJsonLd = generateWebsiteJsonLd()

  return (
    <html lang="pt-BR">
      <head>
        <JsonLd data={websiteJsonLd} />
      </head>
      <body>{children}</body>
    </html>
  )
}
