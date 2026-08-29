import Link from 'next/link'

export async function PublicFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="velvet-public-footer">
      <Link href="/" className="velvet-public-wordmark">velvet<span>.</span></Link>
      <p>Uma plataforma independente para descobrir profissionais verificados.</p>
      <nav aria-label="Rodapé"><Link href="/sao-paulo">Explorar</Link><Link href="/anuncie">Anuncie</Link><Link href="/login">Entrar</Link><span>Termos</span><span>Privacidade</span></nav>
      <small>© {currentYear} Velvet · Somente para maiores de 18 anos</small>
    </footer>
  )
}
