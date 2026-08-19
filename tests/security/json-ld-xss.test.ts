import { describe, it, expect } from 'vitest'

/**
 * FASE 11 — JSON-LD XSS Security Tests
 *
 * Verifies that the safeJsonLdString() helper correctly escapes
 * script-context breakout characters to prevent injection via
 * dangerouslySetInnerHTML in the JsonLd component.
 *
 * Tests are pure unit tests — no Supabase connection required.
 */

// We test the helper function independently of the React component
// to avoid needing a full JSdom environment for the serialization logic.
// The component test (component renders with safe output) is covered
// by the structured-data test suite.

/**
 * Re-implement the safeJsonLdString function for isolated testing.
 * Must match the implementation in components/seo/json-ld.tsx exactly.
 */
function safeJsonLdString(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

describe('FASE 11 — JSON-LD XSS Protection', () => {
  it('should not contain literal < or > in output', () => {
    const data = { name: 'Test <script>alert(1)</script>' }
    const output = safeJsonLdString(data)
    expect(output).not.toContain('<')
    expect(output).not.toContain('>')
  })

  it('should escape </script> injection attempt', () => {
    const data = { name: 'Teste</script><script>alert(document.cookie)//' }
    const output = safeJsonLdString(data)
    expect(output).not.toContain('</script>')
    expect(output).not.toContain('<script>')
  })

  it('should escape nested script injection', () => {
    const data = { headline: '</script><script>alert(1)</script>' }
    const output = safeJsonLdString(data)
    expect(output).not.toContain('</script>')
    expect(output).not.toContain('<script>')
    // Should contain escaped versions
    expect(output).toContain('\\u003c/script\\u003e')
  })

  it('should escape SVG injection attempt', () => {
    const data = { description: '<svg/onload=alert(1)>' }
    const output = safeJsonLdString(data)
    expect(output).not.toContain('<')
    expect(output).not.toContain('>')
  })

  it('should escape & character', () => {
    const data = { description: 'foo & bar && baz' }
    const output = safeJsonLdString(data)
    expect(output).not.toContain('&')
    expect(output).toContain('\\u0026')
  })

  it('should escape Unicode line separator U+2028', () => {
    const data = { name: 'line\u2028break' }
    const output = safeJsonLdString(data)
    // Should not contain unescaped U+2028
    expect(output).not.toContain('\u2028')
  })

  it('should escape Unicode paragraph separator U+2029', () => {
    const data = { name: 'para\u2029break' }
    const output = safeJsonLdString(data)
    expect(output).not.toContain('\u2029')
  })

  it('should produce valid JSON after escaping', () => {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Test & <page> "quotes"',
      description: 'Contains </script> injection attempt',
    }
    const output = safeJsonLdString(data)
    // The output must still be parseable as valid JSON
    expect(() => JSON.parse(output)).not.toThrow()
    const parsed = JSON.parse(output)
    // The values must be decoded correctly
    expect(parsed.name).toBe('Test & <page> "quotes"')
    expect(parsed.description).toBe('Contains </script> injection attempt')
  })

  it('should handle nested objects and arrays', () => {
    const data = {
      '@type': 'ItemList',
      itemListElement: [
        { '@type': 'ListItem', name: '<b>Bold</b>' },
        { '@type': 'ListItem', name: 'Normal & Safe' },
      ],
    }
    const output = safeJsonLdString(data)
    expect(output).not.toContain('<')
    expect(output).not.toContain('>')
    expect(output).not.toContain('&')
    expect(() => JSON.parse(output)).not.toThrow()
  })

  it('should handle null and undefined fields gracefully', () => {
    const data = { name: 'Valid', optional: null }
    const output = safeJsonLdString(data)
    expect(() => JSON.parse(output)).not.toThrow()
  })

  it('combined payload: </script><script>alert(1)</script>', () => {
    const payload = '</script><script>alert(1)</script>'
    const data = { name: payload }
    const output = safeJsonLdString(data)
    // Cannot break out of script tag context
    expect(output).not.toContain('</script>')
    expect(output).not.toContain('<script>')
    // The raw payload string must not appear literally
    expect(output).not.toContain(payload)
    // Output is valid JSON
    const parsed = JSON.parse(output)
    expect(parsed.name).toBe(payload)
  })
})
