/**
 * Regression Test: Admin Navbar Deduplication
 *
 * Enforces that the canonical AdminNavbar is rendered exclusively by the root
 * admin layout (app/(admin)/layout.tsx) and is NEVER imported or rendered inside
 * individual admin pages (app/(admin)/admin/**).
 */

import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const REPO_ROOT = path.resolve(__dirname, '../..')
const ADMIN_APP_DIR = path.join(REPO_ROOT, 'app/(admin)')
const ADMIN_PAGES_DIR = path.join(ADMIN_APP_DIR, 'admin')
const ADMIN_LAYOUT_FILE = path.join(ADMIN_APP_DIR, 'layout.tsx')

function getAllFiles(dir: string, ext = '.tsx'): string[] {
  let results: string[] = []
  if (!fs.existsSync(dir)) return results
  const list = fs.readdirSync(dir)
  for (const file of list) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, ext))
    } else if (fullPath.endsWith(ext)) {
      results.push(fullPath)
    }
  }
  return results
}

describe('Admin Navbar Architecture & Deduplication', () => {
  it('verifies that app/(admin)/layout.tsx is the canonical shell rendering AdminNavbar', () => {
    expect(fs.existsSync(ADMIN_LAYOUT_FILE)).toBe(true)
    const layoutContent = fs.readFileSync(ADMIN_LAYOUT_FILE, 'utf-8')
    expect(layoutContent).toContain("import { AdminNavbar } from '@/components/admin/admin-navbar'")
    expect(layoutContent).toContain('<AdminNavbar />')
  })

  it('verifies that app/(admin)/admin/boosts/page.tsx does NOT import or render AdminNavbar', () => {
    const boostsFile = path.join(ADMIN_PAGES_DIR, 'boosts/page.tsx')
    expect(fs.existsSync(boostsFile)).toBe(true)
    const content = fs.readFileSync(boostsFile, 'utf-8')
    expect(content).not.toContain('AdminNavbar')
    expect(content).not.toContain('<AdminNavbar')
    expect(content).not.toContain('minHeight: \'100vh\'')
  })

  it('verifies that app/(admin)/admin/analytics/page.tsx does NOT import or render AdminNavbar', () => {
    const analyticsFile = path.join(ADMIN_PAGES_DIR, 'analytics/page.tsx')
    expect(fs.existsSync(analyticsFile)).toBe(true)
    const content = fs.readFileSync(analyticsFile, 'utf-8')
    expect(content).not.toContain('AdminNavbar')
    expect(content).not.toContain('<AdminNavbar')
    expect(content).not.toContain('minHeight: \'100vh\'')
  })

  it('audits all admin pages to guarantee ZERO page-level imports of AdminNavbar', () => {
    const adminFiles = getAllFiles(ADMIN_PAGES_DIR, '.tsx')
    expect(adminFiles.length).toBeGreaterThan(0)

    const violatingFiles: string[] = []
    for (const file of adminFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      if (content.includes('AdminNavbar') || content.includes('admin-navbar')) {
        violatingFiles.push(path.relative(REPO_ROOT, file))
      }
    }

    expect(
      violatingFiles,
      `The following admin pages incorrectly import or reference AdminNavbar:\n${violatingFiles.join('\n')}`
    ).toEqual([])
  })
})
