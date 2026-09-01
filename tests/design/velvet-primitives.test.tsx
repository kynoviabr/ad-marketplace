import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { VelvetButton } from '@/components/ui/velvet-button'
import { VelvetField } from '@/components/ui/velvet-field'
import { VelvetBadge } from '@/components/ui/velvet-badge'
import { VelvetSectionHeader } from '@/components/ui/velvet-section-header'
import { VelvetEmptyState } from '@/components/ui/velvet-empty-state'

const css = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8')
const render = (component: ReactNode) => renderToStaticMarkup(component)

describe('Velvet Design System v1 — R2 shared primitives', () => {
  it('provides the four approved button variants', () => {
    for (const variant of ['primary', 'secondary', 'text', 'danger'] as const) {
      const html = render(createElement(VelvetButton, { variant }, 'Action'))
      expect(html).toContain(`velvet-button--${variant}`)
      expect(html).toContain('Action')
    }
  })

  it('keeps button dimensions and localized content stable while loading', () => {
    const html = render(createElement(VelvetButton, { loading: true }, 'Publicar'))
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('disabled=""')
    expect(html).toContain('velvet-button__spinner')
    expect(html).toContain('Publicar')
    expect(html).not.toContain('Aguarde')
  })

  it('renders a persistent field label with accessible hint and error relationships', () => {
    const html = render(createElement(VelvetField, {
      id: 'stage-name',
      label: 'Nome artístico',
      hint: 'Como aparecerá publicamente.',
      error: 'Informe um nome válido.',
      required: true,
    }))
    expect(html).toContain('for="stage-name"')
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('aria-describedby="stage-name-hint stage-name-error"')
    expect(html).toContain('role="alert"')
  })

  it('renders semantic badge variants without encoding product claims', () => {
    const html = render(createElement(VelvetBadge, { variant: 'verified', icon: 'V' }, '18+ verificada'))
    expect(html).toContain('velvet-badge--verified')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('18+ verificada')
    expect(html).not.toContain('segura')
  })

  it('renders section hierarchy at the caller-selected heading level', () => {
    const html = render(createElement(VelvetSectionHeader, {
      title: 'Perfis para descobrir',
      eyebrow: 'São Paulo',
      description: 'Uma seleção pública.',
      headingLevel: 3,
      action: createElement('a', { href: '/sao-paulo', className: 'velvet-link' }, 'Ver todos'),
    }))
    expect(html).toContain('<h3 class="velvet-section-header__title">')
    expect(html).toContain('velvet-section-header__eyebrow')
    expect(html).toContain('velvet-section-header__action')
  })

  it('renders honest empty-state content and an optional recovery action', () => {
    const html = render(createElement(VelvetEmptyState, {
      title: 'Nenhum perfil encontrado',
      description: 'Ajuste os filtros para tentar novamente.',
      action: createElement('button', { className: 'velvet-button velvet-button--secondary' }, 'Limpar filtros'),
    }))
    expect(html).toContain('velvet-empty-state__title')
    expect(html).toContain('velvet-empty-state__description')
    expect(html).toContain('Limpar filtros')
  })

  it('implements approved size, typography and flat-surface contracts', () => {
    expect(css).toMatch(/\.velvet-button\s*\{[^}]*min-height:\s*var\(--control-h\)/)
    expect(css).toMatch(/\.velvet-button\s*\{[^}]*font-size:\s*var\(--text-button\)/)
    expect(css).toMatch(/\.velvet-input,[\s\S]*min-height:\s*var\(--field-h\)/)
    expect(css).toMatch(/\.velvet-input,[\s\S]*font-size:\s*var\(--text-body\)/)
    expect(css).toMatch(/\.velvet-badge\s*\{[^}]*min-height:\s*36px/)
    expect(css).toMatch(/\.velvet-empty-state\s*\{[^}]*border-block:\s*var\(--border-default\)/)
    expect(css).not.toMatch(/\.velvet-(?:button|field|badge|section-header|empty-state)[^{]*\{[^}]*box-shadow:/)
  })

  it('keeps primary, secondary and danger actions tied to semantic colors', () => {
    expect(css).toMatch(/\.velvet-button--primary\s*\{[^}]*background:\s*var\(--color-brand\)/)
    expect(css).toMatch(/\.velvet-button--secondary\s*\{[^}]*color:\s*var\(--color-brand\)/)
    expect(css).toMatch(/\.velvet-button--danger\s*\{[^}]*background:\s*var\(--color-danger\)/)
    expect(css).not.toMatch(/\.velvet-button--primary\s*\{[^}]*var\(--color-accent\)/)
  })

  it('uses readable field text, focus-visible and explicit invalid states', () => {
    expect(css).toMatch(/\.velvet-input:focus-visible,[\s\S]*outline:\s*var\(--focus-ring\)/)
    expect(css).toMatch(/\.velvet-input\[aria-invalid='true'\],[\s\S]*border-color:\s*var\(--color-danger\)/)
    expect(css).toContain('--field-h: 52px;')
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*\.velvet-button\s*\{\s*min-height:\s*var\(--control-h-mobile\)/)
  })

  it('preserves legacy primitives for incremental migration', () => {
    expect(css).toContain('.btn--primary')
    expect(css).toContain('.input--error')
    expect(css).toContain('.label-required')
    expect(css).toContain('legacy .btn/.input/.label remain compatibility-only')
  })
})
