/**
 * PostCSS configuration for AD-Marketplace.
 *
 * Uses @tailwindcss/postcss as the PostCSS plugin, which is the
 * correct approach for Tailwind CSS v4 (CSS-first configuration).
 *
 * Tailwind CSS v4 does NOT use a tailwind.config.js file.
 * Design tokens are defined via @theme {} in globals.css.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
