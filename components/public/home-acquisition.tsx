import React from 'react'
import Link from 'next/link'

export function HomeAcquisition() {
  return (
    <section className="velvet-home-acquisition">
      <div><p className="velvet-overline">PARA PROFISSIONAIS</p><h2>É profissional<br />em São Paulo?</h2></div>
      <div><p>Crie seu espaço, apresente seu trabalho com elegância e gerencie seu perfil com autonomia.</p><Link href="/anuncie">Criar meu perfil <span>→</span></Link></div>
      <span className="velvet-home-acquisition-mark" aria-hidden="true">V</span>
    </section>
  )
}
