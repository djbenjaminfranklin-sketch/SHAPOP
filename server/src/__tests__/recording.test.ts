import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getRecordingStorageConfig,
  buildS3Upload,
  buildRecordingFileOutput,
  startSellerRecording,
  extractObjectKey,
  publicRecordingUrl,
  recordingUrlFromEgress,
  getLivekitMaxParticipants,
  warnRecordingDisabledOnce,
  _resetRecordingWarningForTests,
} from '../recording'
import { EncodedFileType } from 'livekit-server-sdk'

const R2_ENV = {
  RECORDING_S3_ENDPOINT: 'https://abc123.r2.cloudflarestorage.com/',
  RECORDING_S3_BUCKET: 'shapop-recordings',
  RECORDING_S3_REGION: 'auto',
  RECORDING_S3_ACCESS_KEY: 'test-access',
  RECORDING_S3_SECRET: 'test-secret',
  RECORDING_PUBLIC_BASE_URL: 'https://media.shapop.app/',
}

describe('recording storage config', () => {
  it('reads the R2 config and trims trailing slashes', () => {
    const cfg = getRecordingStorageConfig(R2_ENV)
    expect(cfg).toEqual({
      endpoint: 'https://abc123.r2.cloudflarestorage.com',
      bucket: 'shapop-recordings',
      region: 'auto',
      accessKey: 'test-access',
      secret: 'test-secret',
      publicBaseUrl: 'https://media.shapop.app',
    })
  })

  it('defaults the region to auto', () => {
    const { RECORDING_S3_REGION: _r, ...env } = R2_ENV
    expect(getRecordingStorageConfig(env)?.region).toBe('auto')
  })

  it.each(['RECORDING_S3_ENDPOINT', 'RECORDING_S3_BUCKET', 'RECORDING_S3_ACCESS_KEY', 'RECORDING_S3_SECRET', 'RECORDING_PUBLIC_BASE_URL'])(
    'returns null when %s is missing', (key) => {
      expect(getRecordingStorageConfig({ ...R2_ENV, [key]: '' })).toBeNull()
    },
  )

  it('builds a path-style S3 upload pointing at the R2 endpoint', () => {
    const up = buildS3Upload(getRecordingStorageConfig(R2_ENV)!)
    expect(up.endpoint).toBe('https://abc123.r2.cloudflarestorage.com')
    expect(up.bucket).toBe('shapop-recordings')
    expect(up.region).toBe('auto')
    expect(up.forcePathStyle).toBe(true)
    expect(up.accessKey).toBe('test-access')
  })

  it('builds a single MP4 file output under recordings/<streamId>/', () => {
    const out = buildRecordingFileOutput('s-1', getRecordingStorageConfig(R2_ENV)!)
    expect(out.fileType).toBe(EncodedFileType.MP4)
    expect(out.filepath).toBe('recordings/s-1/{time}.mp4')
    expect(out.output.case).toBe('s3')
  })
})

describe('startSellerRecording', () => {
  beforeEach(() => _resetRecordingWarningForTests())

  it('starts a participant egress on the seller with the R2 output', async () => {
    const startParticipantEgress = vi.fn().mockResolvedValue({ egressId: 'EG_1' })
    const id = await startSellerRecording({ startParticipantEgress } as any, 'stream-s1', 'seller-u1', 's1', R2_ENV)
    expect(id).toBe('EG_1')
    expect(startParticipantEgress).toHaveBeenCalledTimes(1)
    const [room, identity, outputs] = startParticipantEgress.mock.calls[0]
    expect(room).toBe('stream-s1')
    expect(identity).toBe('seller-u1')
    expect(outputs.file.output.value.endpoint).toBe('https://abc123.r2.cloudflarestorage.com')
  })

  it('starts NOTHING when the storage is not configured, and warns only once', async () => {
    const startParticipantEgress = vi.fn()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await startSellerRecording({ startParticipantEgress } as any, 'r', 'seller-u', 's', {})).toBeNull()
    expect(await startSellerRecording({ startParticipantEgress } as any, 'r', 'seller-u', 's', {})).toBeNull()
    expect(startParticipantEgress).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('RECORDING_S3_ENDPOINT')
    warn.mockRestore()
  })

  it('returns null without an egress client', async () => {
    expect(await startSellerRecording(null, 'r', 'seller-u', 's', R2_ENV)).toBeNull()
  })

  it('the warning helper never leaks secret values', () => {
    const log = vi.fn()
    warnRecordingDisabledOnce({ ...R2_ENV, RECORDING_PUBLIC_BASE_URL: '' }, log)
    expect(log.mock.calls[0][0]).not.toContain('test-secret')
    expect(log.mock.calls[0][0]).toContain('RECORDING_PUBLIC_BASE_URL')
  })
})

describe('public recording URL', () => {
  it('uses the object key from filename', () => {
    expect(extractObjectKey({ filename: 'recordings/s1/2026-11-23T101010.mp4' }, 'shapop-recordings'))
      .toBe('recordings/s1/2026-11-23T101010.mp4')
  })

  it('extracts the key from a private path-style R2 location', () => {
    expect(extractObjectKey({ location: 'https://abc123.r2.cloudflarestorage.com/shapop-recordings/recordings/s1/a.mp4' }, 'shapop-recordings'))
      .toBe('recordings/s1/a.mp4')
  })

  it('builds the public URL on RECORDING_PUBLIC_BASE_URL, never the S3 endpoint', () => {
    const url = recordingUrlFromEgress(
      { fileResults: [{ filename: 'recordings/s1/a.mp4', location: 'https://abc123.r2.cloudflarestorage.com/shapop-recordings/recordings/s1/a.mp4' }] },
      R2_ENV,
    )
    expect(url).toBe('https://media.shapop.app/recordings/s1/a.mp4')
    expect(url).not.toContain('amazonaws')
    expect(url).not.toContain('r2.cloudflarestorage.com')
  })

  it('encodes unsafe characters in the key', () => {
    expect(publicRecordingUrl('recordings/s 1/a.mp4', { publicBaseUrl: 'https://media.shapop.app' }))
      .toBe('https://media.shapop.app/recordings/s%201/a.mp4')
  })

  it('returns null when storage is not configured or no file', () => {
    expect(recordingUrlFromEgress({ fileResults: [{ filename: 'a.mp4' }] }, {})).toBeNull()
    expect(recordingUrlFromEgress({ fileResults: [] }, R2_ENV)).toBeNull()
  })
})

describe('LIVEKIT_MAX_PARTICIPANTS', () => {
  it('defaults to 0 (no LiveKit cap)', () => {
    expect(getLivekitMaxParticipants({})).toBe(0)
    expect(getLivekitMaxParticipants({ LIVEKIT_MAX_PARTICIPANTS: 'abc' })).toBe(0)
    expect(getLivekitMaxParticipants({ LIVEKIT_MAX_PARTICIPANTS: '-5' })).toBe(0)
  })
  it('accepts a positive value', () => {
    expect(getLivekitMaxParticipants({ LIVEKIT_MAX_PARTICIPANTS: '20000' })).toBe(20000)
  })
})
