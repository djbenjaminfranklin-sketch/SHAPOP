// =============================================
// Live recording storage (S3-compatible: Cloudflare R2, Hetzner, MinIO, AWS...)
// =============================================
// Everything is driven by environment variables so the same code works with
// LiveKit Cloud today and a self-hosted LiveKit tomorrow, without app changes.
//
//   RECORDING_S3_ENDPOINT      https://<accountid>.r2.cloudflarestorage.com
//   RECORDING_S3_BUCKET        shapop-recordings
//   RECORDING_S3_REGION        auto (R2)
//   RECORDING_S3_ACCESS_KEY    R2 API token access key id
//   RECORDING_S3_SECRET        R2 API token secret
//   RECORDING_PUBLIC_BASE_URL  https://media.shapop.app (public read domain of the bucket)
//
// If any of them is missing, NO recording is started (one clear log line),
// instead of an egress that is billed by LiveKit and then fails to upload.

import { EncodedFileOutput, EncodedFileType, S3Upload } from 'livekit-server-sdk'
import type { EgressClient } from 'livekit-server-sdk'

export interface RecordingStorageConfig {
  endpoint: string
  bucket: string
  region: string
  accessKey: string
  secret: string
  publicBaseUrl: string
}

type Env = Record<string, string | undefined>

const REQUIRED_VARS = [
  'RECORDING_S3_ENDPOINT',
  'RECORDING_S3_BUCKET',
  'RECORDING_S3_ACCESS_KEY',
  'RECORDING_S3_SECRET',
  'RECORDING_PUBLIC_BASE_URL',
] as const

const clean = (v: string | undefined) => (v || '').trim()
const stripTrailingSlash = (v: string) => v.replace(/\/+$/, '')

/** Returns the storage config, or null when recording is not configured. */
export function getRecordingStorageConfig(env: Env = process.env): RecordingStorageConfig | null {
  if (REQUIRED_VARS.some(k => !clean(env[k]))) return null
  return {
    endpoint: stripTrailingSlash(clean(env.RECORDING_S3_ENDPOINT)),
    bucket: clean(env.RECORDING_S3_BUCKET),
    region: clean(env.RECORDING_S3_REGION) || 'auto',
    accessKey: clean(env.RECORDING_S3_ACCESS_KEY),
    secret: clean(env.RECORDING_S3_SECRET),
    publicBaseUrl: stripTrailingSlash(clean(env.RECORDING_PUBLIC_BASE_URL)),
  }
}

export function missingRecordingVars(env: Env = process.env): string[] {
  return REQUIRED_VARS.filter(k => !clean(env[k]))
}

let warnedMissing = false
/** Logs once per process why recordings are disabled. */
export function warnRecordingDisabledOnce(env: Env = process.env, log: (msg: string) => void = console.warn): void {
  if (warnedMissing) return
  warnedMissing = true
  log(`[recording] Live recording DISABLED — missing env: ${missingRecordingVars(env).join(', ')}. No egress will be started (nothing billed).`)
}
export function _resetRecordingWarningForTests(): void { warnedMissing = false }

/** S3 upload target for LiveKit Egress (path-style, required by R2 and most S3-compatible stores). */
export function buildS3Upload(cfg: RecordingStorageConfig): S3Upload {
  return new S3Upload({
    endpoint: cfg.endpoint,
    bucket: cfg.bucket,
    region: cfg.region,
    accessKey: cfg.accessKey,
    secret: cfg.secret,
    forcePathStyle: true,
  })
}

/** Object key of a stream recording inside the bucket. {time} is expanded by LiveKit. */
export function recordingObjectKey(streamId: string): string {
  return `recordings/${streamId}/{time}.mp4`
}

/** One MP4 file (H.264 + AAC, audio and video together) uploaded to the bucket. */
export function buildRecordingFileOutput(streamId: string, cfg: RecordingStorageConfig): EncodedFileOutput {
  return new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath: recordingObjectKey(streamId),
    output: { case: 's3', value: buildS3Upload(cfg) },
  })
}

/**
 * Starts the recording of the seller only (participant egress: camera + mic muxed
 * into one MP4). Waits for the seller if they have not joined yet, stops by itself
 * when the seller leaves. Returns the egress id, or null when recording is disabled.
 */
export async function startSellerRecording(
  egressClient: Pick<EgressClient, 'startParticipantEgress'> | null,
  roomName: string,
  sellerIdentity: string,
  streamId: string,
  env: Env = process.env,
): Promise<string | null> {
  if (!egressClient) return null
  const cfg = getRecordingStorageConfig(env)
  if (!cfg) {
    warnRecordingDisabledOnce(env)
    return null
  }
  const egress = await egressClient.startParticipantEgress(
    roomName,
    sellerIdentity,
    { file: buildRecordingFileOutput(streamId, cfg) },
  )
  return egress.egressId
}

interface FileInfoLike { filename?: string; location?: string }

/** Extracts the object key from a LiveKit FileInfo (filename, or the private S3 location URL). */
export function extractObjectKey(fileInfo: FileInfoLike | null | undefined, bucket: string): string | null {
  if (!fileInfo) return null
  const filename = clean(fileInfo.filename)
  if (filename && !/^https?:\/\//i.test(filename)) return filename.replace(/^\/+/, '')
  const location = clean(fileInfo.location) || filename
  if (!location) return null
  let path: string
  try {
    path = decodeURIComponent(new URL(location).pathname)
  } catch {
    path = location
  }
  path = path.replace(/^\/+/, '')
  // Path-style URL: /<bucket>/<key>
  if (bucket && path.startsWith(`${bucket}/`)) path = path.slice(bucket.length + 1)
  return path || null
}

/** Public URL stored in streams.recording_url (never the private S3/R2 endpoint). */
export function publicRecordingUrl(key: string, cfg: Pick<RecordingStorageConfig, 'publicBaseUrl'>): string {
  const encoded = key.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')
  return `${cfg.publicBaseUrl}/${encoded}`
}

/** From a finished egress, returns the public URL of its file, or null. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function recordingUrlFromEgress(egress: any, env: Env = process.env): string | null {
  const cfg = getRecordingStorageConfig(env)
  if (!cfg || !egress) return null
  const fileInfo = egress.fileResults?.[0] || egress.result?.value || egress.file
  const key = extractObjectKey(fileInfo, cfg.bucket)
  return key ? publicRecordingUrl(key, cfg) : null
}

/**
 * LiveKit room size limit. 0 = no limit enforced by LiveKit (default).
 * Set LIVEKIT_MAX_PARTICIPANTS to cap it (e.g. to protect the bill during tests).
 */
export function getLivekitMaxParticipants(env: Env = process.env): number {
  const n = Number(clean(env.LIVEKIT_MAX_PARTICIPANTS))
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}
