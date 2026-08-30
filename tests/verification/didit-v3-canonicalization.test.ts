import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  canonicalizeDiditV3,
  verifyDiditWebhookSignature,
} from '@/modules/verification/providers/didit/webhook'

describe('Didit v3 official Node canonicalization contract', () => {
  const secret = 'diagnostic_fixture_secret_only'
  const nowMs = 1_774_970_000_000

  // Structurally mirrors Didit's approved_full_features Try Webhook without real KYC data.
  const rawFixture = `{
    "webhook_type":"status.updated",
    "status":"Approved",
    "timestamp":1774970000,
    "session_id":"session_fixture",
    "event_id":"event_fixture",
    "vendor_data":"fixture_user",
    "sandbox_scenario":null,
    "decision":{
      "status":"Approved",
      "session_id":"session_fixture",
      "risk_view":{
        "countries":{"risk_scores":{}},
        "crimes":{"risk_scores":{}},
        "custom_list":{}
      },
      "liveness_checks":[{"warnings":[],"score":92.0,"status":"Approved"}],
      "face_matches":[{"score":87.42,"status":"Approved","warnings":[]}],
      "aml_screenings":[{
        "hits":[],
        "score":100.0,
        "sources":["sanctions","pep"],
        "status":"Approved"
      }],
      "media":{"portrait_url":"https://media.didit.me/a/b?x=1&y=2"},
      "metadata":{"display_name":"José 日本","optional":null},
      "reviews":[]
    }
  }`

  function officialShortenFloats(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(officialShortenFloats)
    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [
          key,
          officialShortenFloats(item),
        ])
      )
    }
    if (typeof value === 'number' && Number.isFinite(value) && value % 1 === 0) {
      return Math.trunc(value)
    }
    return value
  }

  function officialSortKeys(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(officialSortKeys)
    if (value !== null && typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((result, key) => {
          result[key] = officialSortKeys((value as Record<string, unknown>)[key])
          return result
        }, {})
    }
    return value
  }

  function hmac(input: string): string {
    return createHmac('sha256', secret).update(input, 'utf8').digest('hex')
  }

  it('matches shortenFloats -> sortKeys -> compact Unicode JSON.stringify', () => {
    const parsed = JSON.parse(rawFixture)
    const officialCanonical = JSON.stringify(
      officialSortKeys(officialShortenFloats(parsed))
    )
    const actualCanonical = canonicalizeDiditV3(parsed)

    expect(actualCanonical).toBe(officialCanonical)
    expect(actualCanonical).toContain('"score":92')
    expect(actualCanonical).toContain('"score":100')
    expect(actualCanonical).toContain('"score":87.42')
    expect(actualCanonical).toContain('"risk_scores":{}')
    expect(actualCanonical).toContain('"optional":null')
    expect(actualCanonical).toContain('José 日本')
    expect(actualCanonical).toContain('https://media.didit.me/a/b?x=1&y=2')
    expect(actualCanonical).not.toContain('\\u00e9')
    expect(actualCanonical).not.toContain('https:\\/\\/')
    expect(actualCanonical).not.toContain(': ')
  })

  it('computes distinct V2, raw-body and Simple diagnostic vectors without logging them', () => {
    const parsed = JSON.parse(rawFixture)
    const canonical = canonicalizeDiditV3(parsed)
    const simpleCanonical = [
      parsed.timestamp,
      parsed.session_id,
      parsed.status,
      parsed.webhook_type,
    ].join(':')

    const v2Signature = hmac(canonical)
    const rawSignature = hmac(rawFixture)
    const simpleSignature = hmac(simpleCanonical)

    expect(v2Signature).toMatch(/^[a-f0-9]{64}$/)
    expect(rawSignature).toMatch(/^[a-f0-9]{64}$/)
    expect(simpleSignature).toMatch(/^[a-f0-9]{64}$/)
    expect(new Set([v2Signature, rawSignature, simpleSignature])).toHaveLength(3)
  })

  it('accepts only the correct V2 vector for the full nested fixture', () => {
    const parsed = JSON.parse(rawFixture)
    const signature = hmac(canonicalizeDiditV3(parsed))
    const result = verifyDiditWebhookSignature(
      Buffer.from(rawFixture, 'utf8'),
      {
        'x-signature-v2': signature,
        'x-timestamp': String(nowMs / 1000),
        'x-didit-test-webhook': 'true',
      },
      { secret, now: () => nowMs }
    )

    expect(result).toMatchObject({
      eventId: 'event_fixture',
      sessionId: 'session_fixture',
      rawStatus: 'Approved',
      eventType: 'status.updated',
    })
  })
})
