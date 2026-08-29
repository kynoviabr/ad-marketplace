import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { MobileNavigation } from './mobile-navigation'

export async function PublicHeader() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isAuthenticated = !!user

  return (
    <header className="velvet-public-header">
      <Link href="/" className="velvet-public-wordmark" aria-label="Velvet, início">velvet<span>.</span></Link>
      <nav aria-label="Navegação principal">
        <span>São Paulo <i aria-hidden="true">⌄</i></span>
        <Link href="/sao-paulo">Explorar</Link>
        <Link href="/anuncie">Anuncie</Link>
        <Link href={isAuthenticated ? '/dashboard' : '/login'}>{isAuthenticated ? 'Minha conta' : 'Entrar'}</Link>
      </nav>
      <div className="velvet-public-mobile-nav">
        <MobileNavigation brandName="velvet." isAuthenticated={isAuthenticated} />
      </div>
    </header>
  )
}
