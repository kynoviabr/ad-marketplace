import Link from 'next/link'
import { logoutAction } from '@/modules/auth/actions'

const nav = [
  ['Visão geral', '/dashboard'], ['Meu perfil', '/onboarding/seu-perfil'], ['Fotos', '/dashboard/photos'],
  ['Regiões', '/onboarding/onde-atende'], ['Verificação', '/onboarding/verificacao'], ['Analytics', '/dashboard/analytics'],
] as const

export function ProfessionalDashboardHeader({ activeHref }: { activeHref: string }) {
  return <header className="velvet-dashboard-header">
    <Link href="/dashboard" className="velvet-wordmark" aria-label="Velvet — visão geral">velvet<span>.</span></Link>
    <nav aria-label="Navegação profissional">{nav.map(([label, href]) => <Link key={href} href={href} aria-current={href === activeHref ? 'page' : undefined}>{label}</Link>)}</nav>
    <form action={logoutAction}><button type="submit">Sair</button></form>
  </header>
}
