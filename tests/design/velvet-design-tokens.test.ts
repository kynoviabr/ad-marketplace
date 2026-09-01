import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const css = read('app/globals.css')
const layout = read('app/layout.tsx')

const token = (name: string) => {
  const match = css.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`))
  return match?.[1].trim()
}

const luminance = (hex: string) => {
  const channels = hex.match(/[\da-f]{2}/gi)?.map((value) => Number.parseInt(value, 16) / 255)
  if (!channels || channels.length !== 3) throw new Error(`Invalid color: ${hex}`)
  const [red, green, blue] = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  )
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

const contrast = (foreground: string, background: string) => {
  const foregroundLuminance = luminance(foreground)
  const backgroundLuminance = luminance(background)
  const lightest = Math.max(foregroundLuminance, backgroundLuminance)
  const darkest = Math.min(foregroundLuminance, backgroundLuminance)
  return (lightest + 0.05) / (darkest + 0.05)
}

describe('Velvet Design System v1 — R1 token contract', () => {
  it('loads Newsreader and Inter through next/font semantic variables', () => {
    expect(layout).toContain('Newsreader')
    expect(layout).toContain("variable: '--font-editorial-loaded'")
    expect(layout).toContain("variable: '--font-body-loaded'")
    expect(layout).toContain('newsreader.variable')
    expect(token('font-editorial')).toContain('--font-editorial-loaded')
    expect(token('font-ui')).toContain('--font-body-loaded')
  })

  it('retains Plus Jakarta Sans only through the legacy display alias', () => {
    expect(layout).toContain('Plus_Jakarta_Sans')
    expect(token('font-display-legacy')).toContain('--font-display-loaded')
    expect(token('font-display')).toBe('var(--font-display-legacy)')
    expect(token('font-body')).toBe('var(--font-ui)')
  })

  it('defines every approved semantic typography role and its metadata', () => {
    const roles = {
      'display-xl': ['80px', '.94', '400', '-.045em', 'var(--font-editorial)'],
      'display-l': ['64px', '.98', '400', '-.035em', 'var(--font-editorial)'],
      h1: ['52px', '1.02', '400', '-.025em', 'var(--font-editorial)'],
      h2: ['36px', '1.08', '400', '-.018em', 'var(--font-editorial)'],
      h3: ['24px', '1.15', '500', '-.01em', 'var(--font-editorial)'],
      'body-l': ['18px', '1.55', '400', '0', 'var(--font-ui)'],
      body: ['16px', '1.55', '400', '0', 'var(--font-ui)'],
      'body-s': ['14px', '1.5', '400', '0', 'var(--font-ui)'],
      navigation: ['15px', '1.2', '500', '.01em', 'var(--font-ui)'],
      button: ['15px', '1.1', '600', '.01em', 'var(--font-ui)'],
      label: ['13px', '1.3', '600', '.06em', 'var(--font-ui)'],
      caption: ['12px', '1.4', '500', '.02em', 'var(--font-ui)'],
    } as const

    for (const [role, [size, line, weight, tracking, family]] of Object.entries(roles)) {
      expect(token(`text-${role}`)).toBe(size)
      expect(token(`leading-${role}`)).toBe(line)
      expect(token(`weight-${role}`)).toBe(weight)
      expect(token(`tracking-${role}`)).toBe(tracking)
      expect(token(`family-${role}`)).toBe(family)
    }
  })

  it('uses deterministic mobile typography overrides without viewport units', () => {
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*--text-display-xl:\s*52px;/)
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*--text-display-l:\s*44px;/)
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*--text-h1:\s*38px;/)
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*--text-h2:\s*30px;/)
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*--text-h3:\s*22px;/)
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*--text-body-l:\s*17px;/)
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*--text-navigation:\s*16px;/)
  })

  it('defines the approved spacing scale', () => {
    const values = ['4px', '8px', '12px', '16px', '24px', '32px', '48px', '64px', '80px', '96px']
    values.forEach((value, index) => expect(token(`space-${index + 1}`)).toBe(value))
  })

  it('defines canonical containers and reusable layout primitives', () => {
    expect(token('container-reading')).toBe('720px')
    expect(token('container-content')).toBe('1200px')
    expect(token('container-market')).toBe('1320px')
    expect(token('container-wide')).toBe('1440px')
    for (const className of ['reading', 'content', 'market', 'wide']) {
      expect(css).toContain(`.velvet-container-${className}`)
    }
    expect(css).toContain('.velvet-grid')
  })

  it('keeps page gutters at or above 16px and establishes 12/8/4 grids', () => {
    expect(token('gutter-page')).toContain('48px')
    expect(css).toMatch(/@media \(max-width: 1023px\)[\s\S]*--grid-columns:\s*8;/)
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*--gutter-page:\s*16px;/)
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*--gutter-grid:\s*12px;/)
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*--grid-columns:\s*4;/)
    expect(css).toMatch(/@media \(max-width: 479px\)[\s\S]*--gutter-page:\s*16px;/)
  })

  it('defines the approved semantic palette', () => {
    const palette = {
      'color-bg': '#F5F1E8',
      'color-surface': '#FCFAF5',
      'color-surface-alt': '#E9E3D7',
      'color-text-primary': '#1F1A18',
      'color-text-secondary': '#6A625B',
      'color-border': '#CDC5B8',
      'color-brand': '#754381',
      'color-brand-hover': '#5B2F65',
      'color-brand-deep': '#3B203F',
      'color-accent': '#9AA06A',
      'color-success': '#2F6B4F',
      'color-warning': '#8A4B12',
      'color-danger': '#9B3131',
      'color-focus': '#754381',
    }
    for (const [name, value] of Object.entries(palette)) expect(token(name)?.toUpperCase()).toBe(value)
    expect(token('color-overlay')).toBe('rgba(31, 26, 24, 0.72)')
  })

  it('keeps primary brand and text color pairs WCAG AA compliant', () => {
    expect(contrast(token('color-text-primary')!, token('color-bg')!)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(token('color-text-secondary')!, token('color-bg')!)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(token('color-brand')!, token('color-bg')!)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(token('color-surface')!, token('color-brand')!)).toBeGreaterThanOrEqual(4.5)
  })

  it('provides control, focus, border, radius and overlay primitives', () => {
    expect(token('control-h')).toBe('48px')
    expect(token('control-h-mobile')).toBe('52px')
    expect(token('target-min')).toBe('44px')
    expect(token('radius-control')).toBe('4px')
    expect(token('radius-media')).toBe('0')
    expect(token('border-default')).toBe('1px solid var(--color-border)')
    expect(token('focus-ring')).toBe('2px solid var(--color-focus)')
    expect(token('focus-offset')).toBe('2px')
    expect(token('shadow-overlay')).toContain('0 24px 64px')
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*var\(--focus-ring\)/)
  })

  it('provides restrained motion tokens and preserves reduced-motion behavior', () => {
    expect(token('duration-fast')).toBe('140ms')
    expect(token('duration-base')).toBe('240ms')
    expect(token('ease-product')).toBe('cubic-bezier(.2, .8, .2, 1)')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('transition-duration: 0.01ms !important')
    expect(css).toContain('scroll-behavior: auto !important')
  })

  it('retains safe compatibility aliases without circular references', () => {
    expect(token('color-background')).toBe('var(--color-bg)')
    expect(token('color-surface-muted')).toBe('var(--color-surface-alt)')
    expect(token('color-foreground')).toBe('var(--color-text-primary)')
    expect(token('color-error')).toBe('var(--color-danger)')
    expect(token('velvet-aubergine-deep')).toBe('var(--color-brand-deep)')
    expect(token('velvet-sans')).toBe('var(--font-ui)')
  })

  it('keeps R1 infrastructure-only with locale and route foundations intact', () => {
    expect(layout).toContain('constructRootMetadata')
    expect(layout).toContain('getRequestLocale')
    expect(layout).toContain('<I18nProvider locale={locale}>')
    expect(layout).not.toContain('Didit')
    expect(css).not.toContain('.velvet-token-specimen')
  })
})
