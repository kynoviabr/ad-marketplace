import 'server-only'
import { createHash } from 'node:crypto'
import { deflateRawSync } from 'node:zlib'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveSubject } from './subject-resolver'
import { SubjectExportBundle, SubjectExportManifest } from './lifecycle-types'

// -----------------------------------------------------------------------------
// PURE TYPESCRIPT ZIP ARCHIVE BUILDER (Zero External Dependencies)
// -----------------------------------------------------------------------------

function makeCrc32Table(): Uint32Array {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
}

const CRC_TABLE = makeCrc32Table()

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buffer[i]) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * Packs multiple files into a standard, valid ZIP binary buffer.
 */
export function createZipArchive(files: Record<string, string | Buffer | object>): Buffer {
  const localHeaders: Buffer[] = []
  const centralDirectoryHeaders: Buffer[] = []
  let offset = 0

  const fileEntries = Object.entries(files).map(([name, content]) => {
    let buf: Buffer
    if (Buffer.isBuffer(content)) {
      buf = content
    } else if (typeof content === 'string') {
      buf = Buffer.from(content, 'utf8')
    } else {
      buf = Buffer.from(JSON.stringify(content, null, 2), 'utf8')
    }
    const compressed = deflateRawSync(buf)
    const crc = crc32(buf)
    return {
      name,
      nameBuf: Buffer.from(name, 'utf8'),
      buf,
      compressed,
      crc,
      uncompressedSize: buf.length,
      compressedSize: compressed.length,
    }
  })

  // Fixed DOS timestamp: 2026-09-11 12:00:00
  const dosTime = 0x6000
  const dosDate = 0x5d2b

  for (const entry of fileEntries) {
    const localOffset = offset
    const localHeader = Buffer.alloc(30 + entry.nameBuf.length)
    localHeader.writeUInt32LE(0x04034b50, 0) // Local file header signature
    localHeader.writeUInt16LE(20, 4) // Version needed (2.0)
    localHeader.writeUInt16LE(0, 6) // General purpose bit flag
    localHeader.writeUInt16LE(8, 8) // Compression method (8 = Deflate)
    localHeader.writeUInt16LE(dosTime, 10)
    localHeader.writeUInt16LE(dosDate, 12)
    localHeader.writeUInt32LE(entry.crc, 14)
    localHeader.writeUInt32LE(entry.compressedSize, 18)
    localHeader.writeUInt32LE(entry.uncompressedSize, 22)
    localHeader.writeUInt16LE(entry.nameBuf.length, 26)
    localHeader.writeUInt16LE(0, 28) // Extra field length
    entry.nameBuf.copy(localHeader, 30)

    localHeaders.push(localHeader, entry.compressed)
    offset += localHeader.length + entry.compressed.length

    const cdHeader = Buffer.alloc(46 + entry.nameBuf.length)
    cdHeader.writeUInt32LE(0x02014b50, 0) // Central directory signature
    cdHeader.writeUInt16LE(20, 4) // Version made by
    cdHeader.writeUInt16LE(20, 6) // Version needed
    cdHeader.writeUInt16LE(0, 8) // Flags
    cdHeader.writeUInt16LE(8, 10) // Deflate
    cdHeader.writeUInt16LE(dosTime, 12)
    cdHeader.writeUInt16LE(dosDate, 14)
    cdHeader.writeUInt32LE(entry.crc, 16)
    cdHeader.writeUInt32LE(entry.compressedSize, 20)
    cdHeader.writeUInt32LE(entry.uncompressedSize, 24)
    cdHeader.writeUInt16LE(entry.nameBuf.length, 28)
    cdHeader.writeUInt16LE(0, 30) // Extra length
    cdHeader.writeUInt16LE(0, 32) // Comment length
    cdHeader.writeUInt16LE(0, 34) // Disk start
    cdHeader.writeUInt16LE(0, 36) // Internal file attributes
    cdHeader.writeUInt32LE(0, 38) // External file attributes
    cdHeader.writeUInt32LE(localOffset, 42) // Relative offset of local header
    entry.nameBuf.copy(cdHeader, 46)

    centralDirectoryHeaders.push(cdHeader)
  }

  const centralDirectoryOffset = offset
  const centralDirectorySize = centralDirectoryHeaders.reduce((acc, h) => acc + h.length, 0)

  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0) // End of central directory signature
  eocd.writeUInt16LE(0, 4) // Disk number
  eocd.writeUInt16LE(0, 6) // Central directory disk
  eocd.writeUInt16LE(fileEntries.length, 8) // Entries on this disk
  eocd.writeUInt16LE(fileEntries.length, 10) // Total entries
  eocd.writeUInt32LE(centralDirectorySize, 12)
  eocd.writeUInt32LE(centralDirectoryOffset, 16)
  eocd.writeUInt16LE(0, 20) // Comment length

  return Buffer.concat([...localHeaders, ...centralDirectoryHeaders, eocd])
}

// -----------------------------------------------------------------------------
// CANONICAL DATA EXPORT ENGINE
// -----------------------------------------------------------------------------

/**
 * Fulfills LGPD Art. 18, II (Access) & Art. 18, V (Portability).
 * Collects and sanitizes all personal data belonging to the subject into structured JSON files.
 * Fail-closed: returns error if subject is invalid or unauthorized.
 */
export async function generateSubjectExportBundle(
  subjectAccountId: string
): Promise<SubjectExportBundle> {
  const subject = await resolveSubject(subjectAccountId)
  if (!subject) {
    throw new Error(`Subject account ${subjectAccountId} not found or inaccessible.`)
  }

  const admin = createAdminClient()
  const files: Record<string, unknown> = {}
  const includedDatasets: string[] = []
  let excludedFieldsCount = 0

  // 1. ACCOUNT DATA & LEGAL ACCEPTANCE (account.json)
  const { data: accountRow } = await admin
    .from('account_users')
    .select('id, role, status, terms_version, terms_accepted_at, privacy_version, privacy_accepted_at, created_at, updated_at')
    .eq('id', subject.accountId)
    .single()


  let clientMembershipData = null
  if (subject.role === 'CLIENT') {
    const { data: mem } = await admin
      .from('client_memberships')
      .select('membership_type, valid_until, created_at, updated_at')
      .eq('account_id', subject.accountId)
      .maybeSingle()
    clientMembershipData = mem
  }

  files['account.json'] = {
    email: subject.email,
    phone: subject.phone,
    role: accountRow?.role ?? subject.role,
    status: accountRow?.status ?? subject.status,

    legalAcceptances: {
      termsVersion: accountRow?.terms_version ?? null,
      termsAcceptedAt: accountRow?.terms_accepted_at ?? null,
      privacyVersion: accountRow?.privacy_version ?? null,
      privacyAcceptedAt: accountRow?.privacy_accepted_at ?? null,
    },
    clientMembership: clientMembershipData,
    createdAt: accountRow?.created_at ?? null,
    updatedAt: accountRow?.updated_at ?? null,
  }
  includedDatasets.push('ACCOUNT_DATA', 'LEGAL_ACCEPTANCE_HISTORY')
  // Excluded: encrypted_password, password_hash, raw_app_meta_data, internal_tokens (4 fields)
  excludedFieldsCount += 4

  // 2. PROFILE DATA (profile.json) — If advertiser
  if (subject.profileId) {
    const profileId = subject.profileId
    const { data: profileRow } = await admin
      .from('professional_profiles')
      .select(`
        stage_name, slug, headline, bio, public_age,
        height_cm, weight_kg, measurements, eye_color, hair_color,
        languages,
        direct_phone, whatsapp_phone, telegram_username,
        show_phone, show_whatsapp, show_telegram,
        created_at, updated_at, published_at
      `)
      .eq('id', profileId)
      .single()

    const { data: locations } = await admin
      .from('professional_profile_locations')
      .select(`
        is_primary,
        location:marketplace_locations (
          name, slug,
          city:cities (name, slug)
        )
      `)
      .eq('profile_id', profileId)

    const { data: offerings } = await admin
      .from('professional_profile_offerings')
      .select(`
        option_code, status,
        option:professional_offering_options (code, group_code)
      `)
      .eq('profile_id', profileId)

    if (profileRow) {
      files['profile.json'] = {
        stageName: profileRow.stage_name,
        slug: profileRow.slug,
        headline: profileRow.headline,
        bio: profileRow.bio,
        publicAge: profileRow.public_age,
        physicalAttributes: {
          heightCm: profileRow.height_cm,
          weightKg: profileRow.weight_kg,
          measurements: profileRow.measurements,
          eyeColor: profileRow.eye_color,
          hairColor: profileRow.hair_color,
        },
        languages: profileRow.languages,
        contactChannels: {
          whatsapp: profileRow.show_whatsapp ? profileRow.whatsapp_phone : null,
          directPhone: profileRow.show_phone ? profileRow.direct_phone : null,
          telegram: profileRow.show_telegram ? profileRow.telegram_username : null,
        },
        serviceLocations: locations?.map((l) => ({
          isPrimary: l.is_primary,
          neighborhood: (l.location as { name?: string })?.name,
          city: (l.location as { city?: { name?: string } })?.city?.name,
        })) ?? [],
        offerings: offerings?.map((o) => ({
          code: o.option_code,
          group: (o.option as { group_code?: string })?.group_code ?? null,
          status: o.status,
        })) ?? [],
        createdAt: profileRow.created_at,
        publishedAt: profileRow.published_at,
      }
      includedDatasets.push('PROFILE_DATA')
      // Excluded: content_moderation_status, moderation_notes, internal_score (3 fields)
      excludedFieldsCount += 3
    }

    // 3. MEDIA METADATA (media.json)
    const { data: photos } = await admin
      .from('profile_media')
      .select('id, position, mime_type, file_size_bytes, status, created_at, approved_at')
      .eq('profile_id', profileId)

    const { data: videos } = await admin
      .from('profile_videos')
      .select('id, duration_seconds, status, created_at')
      .eq('profile_id', profileId)

    files['media.json'] = {
      photos: photos?.map((p) => ({
        id: p.id,
        position: p.position,
        mimeType: p.mime_type,
        fileSizeBytes: p.file_size_bytes,
        status: p.status,
        createdAt: p.created_at,
        approvedAt: p.approved_at,
      })) ?? [],
      videos: videos?.map((v) => ({
        id: v.id,
        durationSeconds: v.duration_seconds,
        status: v.status,
        createdAt: v.created_at,
      })) ?? [],
    }
    includedDatasets.push('MEDIA_METADATA')
    // Excluded: storage_path, poster_storage_path, moderation_notes (3 fields)
    excludedFieldsCount += 3

    // 4. AVAILABILITY & SCHEDULE (availability.json)
    const { data: availSettings } = await admin
      .from('professional_availability_settings')
      .select('timezone, slot_duration_minutes, minimum_notice_minutes')
      .eq('profile_id', profileId)
      .maybeSingle()

    const { data: weekly } = await admin
      .from('professional_weekly_availability')
      .select('day_of_week, start_time, end_time')
      .eq('profile_id', profileId)

    const { data: exceptions } = await admin
      .from('professional_availability_exceptions')
      .select('exception_date, exception_type, start_time, end_time')
      .eq('profile_id', profileId)

    if (availSettings || weekly?.length || exceptions?.length) {
      files['availability.json'] = {
        settings: availSettings ?? null,
        weeklySchedule: weekly ?? [],
        exceptions: exceptions ?? [],
      }
      includedDatasets.push('AGENDA_AND_AVAILABILITY')
    }
  }

  // 5. COMMERCIAL & SUBSCRIPTION HISTORY (commercial.json)
  const { data: subscriptions } = await admin
    .from('subscriptions')
    .select('status, current_period_start, current_period_end, created_at, plan:subscription_plans(code)')
    .eq('account_user_id', subject.accountId)

  const { data: boosts } = subject.profileId
    ? await admin
        .from('profile_boosts')
        .select('starts_at, ends_at, status, created_at')
        .eq('profile_id', subject.profileId)
    : { data: [] }

  if (subscriptions?.length || boosts?.length) {
    files['commercial.json'] = {
      subscriptions: subscriptions?.map((s) => ({
        planCode: (s.plan as { code?: string })?.code ?? null,
        status: s.status,
        periodStart: s.current_period_start,
        periodEnd: s.current_period_end,
        createdAt: s.created_at,
      })) ?? [],
      boostCampaigns: boosts?.map((b) => ({
        startsAt: b.starts_at,
        endsAt: b.ends_at,
        status: b.status,
        createdAt: b.created_at,
      })) ?? [],
    }
    includedDatasets.push('COMMERCIAL_AND_SUBSCRIPTION_HISTORY')
    // Excluded: provider_event_id, card_hash, webhook_signatures (3 fields)
    excludedFieldsCount += 3
  }

  // 6. REVIEWS AUTHORED BY SUBJECT (reviews_authored.json)
  const { data: authoredReviews } = await admin
    .from('professional_reviews')
    .select(`
      rating, comment, created_at,
      profile:professional_profiles (stage_name)
    `)
    .eq('reviewer_account_user_id', subject.accountId)

  if (authoredReviews && authoredReviews.length > 0) {
    files['reviews_authored.json'] = authoredReviews.map((r) => ({
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
      professionalStageName: (r.profile as { stage_name?: string })?.stage_name ?? null,
    }))
    includedDatasets.push('USER_REVIEWS_AUTHORED')
    // Excluded: moderation_reason, moderated_by, admin_ip (3 fields)
    excludedFieldsCount += 3
  }

  // 7. DATA SUBJECT REQUESTS HISTORY (dsr_history.json)
  const { data: dsrHistory } = await admin
    .from('data_subject_requests')
    .select(`
      id, request_type, status, resolution_code, created_at, completed_at,
      events:data_subject_request_events (event_type, created_at)
    `)
    .eq('requester_account_user_id', subject.accountId)

  if (dsrHistory && dsrHistory.length > 0) {
    files['dsr_history.json'] = dsrHistory.map((d) => ({
      requestType: d.request_type,
      status: d.status,
      resolutionCode: d.resolution_code,
      createdAt: d.created_at,
      completedAt: d.completed_at,
      eventLog: d.events?.map((e: { event_type?: string; created_at?: string }) => ({
        eventType: e.event_type,
        timestamp: e.created_at,
      })) ?? [],
    }))
    includedDatasets.push('DATA_SUBJECT_REQUESTS_HISTORY')
    // Excluded: resolution_notes (internal notes), actor_account_user_id (admin ID) (2 fields)
    excludedFieldsCount += 2
  }

  // Build manifest
  const exportPayloadString = JSON.stringify(files)
  const checksumSha256 = createHash('sha256').update(exportPayloadString).digest('hex')

  const manifest: SubjectExportManifest = {
    exportId: crypto.randomUUID(),
    subjectAccountId: subject.accountId,
    subjectRole: subject.role,
    generatedAt: new Date().toISOString(),
    schemaVersion: '1.0.0-lgpd',
    totalDatasets: includedDatasets.length,
    includedDatasets,
    excludedFieldsCount,
    files: Object.keys(files),
    checksumSha256,
    securityNotice:
      'All password hashes, authentication tokens, internal moderator remarks, and third-party reporter data are strictly excluded from this export bundle under LGPD Art. 18.',
  }

  files['manifest.json'] = manifest

  return {
    manifest,
    files,
  }
}

/**
 * Packs the subject export bundle into a downloadable .zip binary buffer.
 */
export async function exportSubjectDataZip(subjectAccountId: string): Promise<Buffer> {
  const bundle = await generateSubjectExportBundle(subjectAccountId)
  return createZipArchive(bundle.files as Record<string, string | Buffer | object>)
}

