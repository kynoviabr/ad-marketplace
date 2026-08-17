import nextConfig from 'eslint-config-next'

/**
 * ESLint flat config for AD-Marketplace.
 *
 * Uses eslint-config-next which already exports a flat config array
 * (Next.js 16+ format — no FlatCompat wrapper needed).
 */
const eslintConfig = [...nextConfig]

export default eslintConfig
