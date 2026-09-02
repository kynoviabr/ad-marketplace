import type { Metadata } from 'next'
import Link from 'next/link'
import { getRequestLocale } from '@/lib/i18n/server'
import { localizePathname } from '@/lib/i18n/routing'

export const metadata: Metadata = { title: 'Sobre | Velvet', description: 'Conheça a proposta, os princípios e os limites da Velvet.' }

export default async function AboutPage() {
  const locale = await getRequestLocale(); const en = locale === 'en'; const href = (p: string) => localizePathname(p, locale)
  return <article className="velvet-institutional-page">
    <header><p className="velvet-overline">{en ? 'ABOUT VELVET' : 'SOBRE A VELVET'}</p><h1>{en ? 'Discovery with clarity, autonomy and respect.' : 'Descoberta com clareza, autonomia e respeito.'}</h1><p>{en ? 'Velvet is an independent platform where adults discover verified professional profiles and contact professionals directly.' : 'A Velvet é uma plataforma independente onde adultos descobrem perfis profissionais verificados e entram em contato diretamente.'}</p></header>
    <section><h2>{en ? 'Our role' : 'Nosso papel'}</h2><p>{en ? 'We organize discovery, profile presentation and safety information. Velvet is not an agency, employer, representative or party to conversations or arrangements made outside the platform.' : 'Organizamos descoberta, apresentação de perfis e informações de segurança. A Velvet não é agência, empregadora, representante nem parte de conversas ou acordos realizados fora da plataforma.'}</p></section>
    <section><h2>{en ? 'What verification means' : 'O que a verificação significa'}</h2><p>{en ? 'Verification confirms identity and legal age within the scope of the completed procedure. It is not an endorsement or a guarantee of services, conduct or meetings.' : 'A verificação confirma identidade e maioridade dentro do escopo do procedimento realizado. Ela não representa endosso nem garantia de serviços, conduta ou encontros.'}</p></section>
    <section><h2>{en ? 'Principles' : 'Princípios'}</h2><p>{en ? 'Adult-only access, professional autonomy, data minimization, transparent choices, direct contact and responsible moderation guide the product.' : 'Acesso exclusivo para adultos, autonomia profissional, minimização de dados, escolhas transparentes, contato direto e moderação responsável orientam o produto.'}</p></section>
    <nav className="velvet-institutional-actions"><Link href={href('/como-funciona')}>{en ? 'How it works' : 'Como funciona'}</Link><Link href={href('/sao-paulo')}>{en ? 'Explore São Paulo' : 'Explorar São Paulo'}</Link></nav>
  </article>
}
