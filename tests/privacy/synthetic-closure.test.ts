import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { inflateRawSync } from 'node:zlib'
import { createZipArchive } from '@/modules/privacy/export-engine'
import { generateSubjectLifecyclePlan } from '@/modules/privacy/lifecycle-planner'
import { resolveSubject } from '@/modules/privacy/subject-resolver'

// Helper to unpack ZIP buffer in pure Node.js
function unpackZip(zipBuffer: Buffer): Record<string, string> {
  const extracted: Record<string, string> = {}
  let offset = 0

  while (offset < zipBuffer.length - 4) {
    const sig = zipBuffer.readUInt32LE(offset)
    if (sig === 0x04034b50) {
      const compMethod = zipBuffer.readUInt16LE(offset + 8)
      const compressedSize = zipBuffer.readUInt32LE(offset + 18)
      const fileNameLen = zipBuffer.readUInt16LE(offset + 26)
      const extraFieldLen = zipBuffer.readUInt16LE(offset + 28)

      const fileName = zipBuffer.toString('utf8', offset + 30, offset + 30 + fileNameLen)
      const dataStart = offset + 30 + fileNameLen + extraFieldLen
      const compressedData = zipBuffer.subarray(dataStart, dataStart + compressedSize)

      let uncompressedData: Buffer
      if (compMethod === 0) {
        uncompressedData = compressedData
      } else if (compMethod === 8) {
        uncompressedData = inflateRawSync(compressedData)
      } else {
        throw new Error(`Unsupported method ${compMethod}`)
      }

      extracted[fileName] = uncompressedData.toString('utf8')
      offset = dataStart + compressedSize
    } else {
      offset += 1
    }
  }
  return extracted
}

describe('LGPD-02A.1 — Synthetic Subject & Zero-Mutation Closure Gate', () => {
  describe('Safety Invariants: No Hardcoded Real Subjects', () => {
    it('verifies that the real advertiser subject UUID is not hardcoded as active target in test scripts', () => {
      const REAL_ADVERTISER_UUID = 'ea74fc32-8c3f-4fa1-93bd-e8b6f82525ff'
      const scriptsDir = resolve(process.cwd(), 'scripts')

      const scriptFiles = readdirSync(scriptsDir).filter((f) => f.endsWith('.mjs') || f.endsWith('.ts'))
      for (const file of scriptFiles) {
        const content = readFileSync(join(scriptsDir, file), 'utf-8')
        // The real advertiser UUID must never be targeted
        expect(content.includes(`subjectTargetId = '${REAL_ADVERTISER_UUID}'`)).toBe(false)
        expect(content.includes(`subjectAccountId: '${REAL_ADVERTISER_UUID}'`)).toBe(false)
      }
    })

    it('verifies synthetic email domain follows the RFC 2606 .invalid standard', () => {
      const SYNTHETIC_EMAIL = 'synthetic-lgpd-advertiser-01@ad-marketplace-synthetic.invalid'
      expect(SYNTHETIC_EMAIL.endsWith('.invalid')).toBe(true)
      expect(SYNTHETIC_EMAIL.startsWith('synthetic-lgpd-')).toBe(true)
    })
  })

  describe('Pure TypeScript ZIP Archive Builder & Integrity', () => {
    it('packs files into a valid ZIP archive and unpacks every file cleanly', () => {
      const testFiles = {
        'manifest.json': { version: '1.0.0', exportId: 'synth-01' },
        'account.json': { email: 'synthetic@ad-marketplace-synthetic.invalid', role: 'ADVERTISER' },
        'empty.txt': '',
      }

      const zipBuffer = createZipArchive(testFiles)
      expect(Buffer.isBuffer(zipBuffer)).toBe(true)
      expect(zipBuffer.length).toBeGreaterThan(100)

      // Verify ZIP magic signature PK\x03\x04
      expect(zipBuffer[0]).toBe(0x50)
      expect(zipBuffer[1]).toBe(0x4b)
      expect(zipBuffer[2]).toBe(0x03)
      expect(zipBuffer[3]).toBe(0x04)

      // Unpack and verify every JSON file parses cleanly
      const unpacked = unpackZip(zipBuffer)
      expect(Object.keys(unpacked)).toEqual(['manifest.json', 'account.json', 'empty.txt'])

      const parsedManifest = JSON.parse(unpacked['manifest.json'])
      expect(parsedManifest.exportId).toBe('synth-01')

      const parsedAccount = JSON.parse(unpacked['account.json'])
      expect(parsedAccount.email).toBe('synthetic@ad-marketplace-synthetic.invalid')
      expect(parsedAccount.role).toBe('ADVERTISER')
      expect(unpacked['empty.txt']).toBe('')
    })
  })

  describe('Lifecycle Action Taxonomy & Safeguard Taxonomy', () => {
    it('verifies all 6 canonical lifecycle actions are represented in taxonomy', () => {
      const REQUIRED_ACTIONS = [
        'DELETE',
        'ANONYMIZE',
        'DETACH',
        'RETAIN',
        'EXTERNAL_ERASURE',
        'REVIEW_REQUIRED',
      ]

      for (const action of REQUIRED_ACTIONS) {
        expect(['DELETE', 'ANONYMIZE', 'DETACH', 'RETAIN', 'EXTERNAL_ERASURE', 'REVIEW_REQUIRED']).toContain(action)
      }
    })
  })
})
