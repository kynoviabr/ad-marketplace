import Link from 'next/link'
export default function RestrictedPage() { return <main className="velvet-restricted-page"><div><span aria-hidden="true">velvet.</span><h1>Acesso restrito</h1><p>Este conteúdo é destinado exclusivamente a pessoas com 18 anos ou mais.</p><Link href="/">Voltar</Link></div></main> }
