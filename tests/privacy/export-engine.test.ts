import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateSubjectExportBundle,
  createZipArchive,
  exportSubjectDataZip,
} from '@/modules/privacy/export-engine'
import * as adminModule from '@/lib/supabase/admin'

describe('LGPD-02A: Safe Data Export Engine & ZIP Packager', () => {
  const mockSubjectId = '33333333-3333-4333-8333-333333333333'
  const mockProfileId = '44444444-4444-4444-8444-444444444444'

  let mockAdminClient: any

  beforeEach(() => {
    mockAdminClient = {
      from: vi.fn((table: string) => {
        const qb: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(),
          single: vi.fn(),
        }

        if (table === 'account_users') {
          qb.maybeSingle.mockResolvedValue({
            data: {
              id: mockSubjectId,
              role: 'ADVERTISER',
              status: 'ACTIVE',
              email: 'subject@velvet.club',
              phone: '+5511999991111',
            },
            error: null,
          })
          qb.single.mockResolvedValue({
            data: {
              id: mockSubjectId,
              role: 'ADVERTISER',
              status: 'ACTIVE',
              email: 'subject@velvet.club',
              phone: '+5511999991111',
              terms_version: '1.0',
              terms_accepted_at: '2026-09-01T10:00:00Z',
              privacy_version: '1.0',
              privacy_accepted_at: '2026-09-01T10:00:00Z',
              created_at: '2026-09-01T09:00:00Z',
              updated_at: '2026-09-01T10:00:00Z',
            },
            error: null,
          })
        } else if (table === 'professional_profiles') {
          qb.maybeSingle.mockResolvedValue({
            data: {
              id: mockProfileId,
              stage_name: 'Sabrina Velvet',
            },
            error: null,
          })
          qb.single.mockResolvedValue({
            data: {
              stage_name: 'Sabrina Velvet',
              slug: 'sabrina-velvet',
              headline: 'Modelo de Luxo',
              bio: 'Bio profissional detalhada.',
              public_age: 24,
              height_cm: 172,
              weight_kg: 58,
              measurements: '90-60-90',
              eye_color: 'Verdes',
              hair_color: 'Castanho',
              languages: ['Português', 'Inglês'],
              direct_phone: '+5511999991111',
              whatsapp_phone: '+5511999991111',
              telegram_username: '@sabrina',
              show_phone: true,
              show_whatsapp: true,
              show_telegram: false, // Privacy switch disabled
              created_at: '2026-09-01T10:30:00Z',
              updated_at: '2026-09-05T12:00:00Z',
              published_at: '2026-09-02T00:00:00Z',
            },
            error: null,
          })
        } else if (table === 'professional_profile_locations') {
          qb.eq.mockResolvedValue({
            data: [
              {
                is_primary: true,
                location: { name: 'Jardins', city: { name: 'São Paulo' } },
              },
            ],
            error: null,
          })
        } else if (table === 'professional_profile_offerings') {
          qb.eq.mockResolvedValue({
            data: [
              {
                custom_price: 600,
                option: { name: 'Jantar e Eventos', category: 'SOCIAL', default_price: 500 },
              },
            ],
            error: null,
          })
        } else if (table === 'profile_media') {
          qb.eq.mockResolvedValue({
            data: [
              {
                id: 'media-01',
                position: 1,
                mime_type: 'image/jpeg',
                file_size_bytes: 2048576,
                status: 'APPROVED',
                created_at: '2026-09-01T11:00:00Z',
                approved_at: '2026-09-01T11:30:00Z',
              },
            ],
            error: null,
          })
        } else if (table === 'profile_videos') {
          qb.eq.mockResolvedValue({
            data: [],
            error: null,
          })
        } else if (table === 'subscriptions') {
          qb.eq.mockResolvedValue({
            data: [
              {
                plan_code: 'FOUNDER_LAUNCH',
                status: 'ACTIVE',
                current_period_start: '2026-09-01T00:00:00Z',
                current_period_end: '2026-12-01T00:00:00Z',
                created_at: '2026-09-01T00:00:00Z',
              },
            ],
            error: null,
          })
        } else if (table === 'profile_boosts') {
          qb.eq.mockResolvedValue({
            data: [],
            error: null,
          })
        } else if (table === 'professional_reviews') {
          qb.eq.mockResolvedValue({
            data: [],
            error: null,
          })
        } else if (table === 'data_subject_requests') {
          qb.eq.mockImplementation(() => ({
            ...qb,
            then: (resolve: any) =>
              resolve({
                data: [
                  {
                    id: 'dsr-req-1',
                    request_type: 'ACCESS',
                    status: 'COMPLETED',
                    resolution_code: 'FULFILLED',
                    created_at: '2026-09-10T10:00:00Z',
                    completed_at: '2026-09-10T10:15:00Z',
                    events: [{ event_type: 'REQUEST_CREATED', created_at: '2026-09-10T10:00:00Z' }],
                  },
                ],
                error: null,
              }),
          }))
        } else if (table === 'professional_availability_settings') {
          qb.eq.mockImplementation(() => ({
            ...qb,
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                timezone: 'America/Sao_Paulo',
                slot_duration_minutes: 60,
                minimum_notice_minutes: 120,
              },
              error: null,
            }),
          }))
        } else {
          qb.eq.mockImplementation(() => ({
            ...qb,
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            then: (resolve: any) => resolve({ data: [], error: null }),
          }))
        }

        return qb
      }),
    }

    vi.spyOn(adminModule, 'createAdminClient').mockReturnValue(mockAdminClient)
  })

  it('1. fails closed if subject does not exist', async () => {
    mockAdminClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    await expect(generateSubjectExportBundle('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
      /not found or inaccessible/
    )
  })

  it('2. generates structured JSON files and manifest for subject', async () => {
    const bundle = await generateSubjectExportBundle(mockSubjectId)

    expect(bundle.manifest).toBeDefined()
    expect(bundle.manifest.schemaVersion).toBe('1.0.0-lgpd')
    expect(bundle.manifest.subjectAccountId).toBe(mockSubjectId)
    expect(bundle.manifest.totalDatasets).toBeGreaterThan(0)
    expect(bundle.manifest.checksumSha256).toMatch(/^[a-f0-9]{64}$/)

    expect(bundle.files['manifest.json']).toBeDefined()
    expect(bundle.files['account.json']).toBeDefined()
    expect(bundle.files['profile.json']).toBeDefined()
    expect(bundle.files['media.json']).toBeDefined()
    expect(bundle.files['commercial.json']).toBeDefined()
    expect(bundle.files['dsr_history.json']).toBeDefined()
  })

  it('3. strictly sanitizes secrets, passwords, moderation notes, and third-party data', async () => {
    const bundle = await generateSubjectExportBundle(mockSubjectId)
    const filesStr = JSON.stringify(bundle.files)

    // Security check: no passwords, tokens, moderation notes
    expect(filesStr).not.toContain('encrypted_password')
    expect(filesStr).not.toContain('password_hash')
    expect(filesStr).not.toContain('moderation_notes')
    expect(filesStr).not.toContain('moderation_reason')
    expect(filesStr).not.toContain('actor_account_user_id')

    // Contact privacy switch respected: telegram was show_telegram: false -> null
    const profile = bundle.files['profile.json'] as any
    expect(profile.contactChannels.whatsapp).toBe('+5511999991111')
    expect(profile.contactChannels.telegram).toBeNull()
  })

  it('4. builds a valid standard ZIP archive buffer with proper PK signatures', () => {
    const testFiles = {
      'hello.txt': 'Hello Velvet LGPD!',
      'data.json': JSON.stringify({ name: 'Velvet', test: true }),
    }

    const zipBuffer = createZipArchive(testFiles)

    expect(Buffer.isBuffer(zipBuffer)).toBe(true)
    expect(zipBuffer.length).toBeGreaterThan(0)

    // Check Local File Header signature: PK\x03\x04 (0x04034b50)
    expect(zipBuffer.readUInt32LE(0)).toBe(0x04034b50)

    // Check End of Central Directory signature: PK\x05\x06 (0x06054b50)
    const eocdSig = zipBuffer.indexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
    expect(eocdSig).toBeGreaterThan(0)
  })

  it('5. exports full subject data as ZIP binary', async () => {
    const zipBuf = await exportSubjectDataZip(mockSubjectId)

    expect(Buffer.isBuffer(zipBuf)).toBe(true)
    expect(zipBuf.length).toBeGreaterThan(100)
    expect(zipBuf.readUInt32LE(0)).toBe(0x04034b50)
  })
})
