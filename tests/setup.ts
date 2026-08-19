import { loadEnvConfig } from '@next/env'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

loadEnvConfig(process.cwd())

const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...rest] = trimmed.split('=')
      const val = rest.join('=').trim()
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = val
      }
    }
  }
}
