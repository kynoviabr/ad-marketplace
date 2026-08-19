import React from 'react'

interface JsonLdProps {
  data: Record<string, unknown>
}

/**
 * Serializes structured data to a JSON string that is safe to embed inside
 * an HTML <script> tag without creating an XSS vector.
 *
 * JSON.stringify alone is NOT sufficient: if any string value contains
 * `</script>`, the browser HTML parser will close the script element early,
 * allowing injected markup to execute. The five replacements below turn
 * those characters into their Unicode escape equivalents, which:
 *   - are invisible to JSON parsers (the JSON spec accepts \uXXXX anywhere)
 *   - cannot be misinterpreted by the HTML parser
 *   - leave the resulting value semantically identical to the original
 *
 * Characters escaped:
 *   < → \u003c   prevents `</script>` and `<!--` injection
 *   > → \u003e   closes the attack surface symmetrically
 *   & → \u0026   prevents HTML entity parsing inside the script block
 *   U+2028 → \u2028   LINE SEPARATOR — invalid in JS string literals
 *   U+2029 → \u2029   PARAGRAPH SEPARATOR — invalid in JS string literals
 */
function safeJsonLdString(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/**
 * Safely renders a Schema.org JSON-LD script tag.
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdString(data) }}
    />
  )
}
