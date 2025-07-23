import argon2 from 'argon2-browser/dist/argon2-bundled.min.js'
import { ChaCha20Poly1305, NONCE_LENGTH } from '@stablelib/chacha20poly1305'

export type BackupEntry = {
  id: string
  label: string
  postfix: string
  method_id: string
  created_at: number
  order?: number
  fingerprint?: string | null
}

export type BackupFile = { entries: BackupEntry[] }

export type FingerprintCount = { fingerprint: string, count: number }

const ARGON_MEM_DESKTOP = 19456
const ARGON_MEM_MOBILE = 8192
const ARGON_ITERATIONS = 2
const ARGON_PARALLELISM = 1

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function b64NoPad(data: Uint8Array): string { return btoa(String.fromCharCode(...data)).replace(/=/g, '') }
function b64ToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? s : s + '='.repeat(4 - (s.length % 4))
  const bin = atob(pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function randBytes(len: number): Uint8Array { const out = new Uint8Array(len); crypto.getRandomValues(out); return out }

async function deriveKey(passphrase: string, salt: Uint8Array, mem: number, iterations: number, parallelism: number) {
  const { hash } = await (argon2 as any).hash({ pass: encoder.encode(passphrase), salt, type: (argon2 as any).ArgonType.Argon2id, hashLen: 32, mem, time: iterations, parallelism })
  return hash
}

function normalizeEntries(entries: BackupEntry[]): BackupEntry[] {
  return entries.map(e => ({
    ...e,
    fingerprint: typeof e.fingerprint === 'string' && e.fingerprint.length > 0 ? e.fingerprint : (e.fingerprint === null ? null : ''),
  }))
}

function defaultMem() {
  if (typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '')) return ARGON_MEM_MOBILE
  return ARGON_MEM_DESKTOP
}

export function countFingerprints(entries: BackupEntry[]): FingerprintCount[] {
  const counts: Record<string, number> = {}
  for (const e of entries) {
    const fp = typeof e.fingerprint === 'string' ? e.fingerprint : ''
    counts[fp] = (counts[fp] || 0) + 1
  }
  return Object.entries(counts).map(([fingerprint, count]) => ({ fingerprint, count }))
}

export async function buildBackupFile(entries: BackupEntry[], passphrase?: string) {
  if (passphrase && passphrase.trim()) {
    const salt = randBytes(16)
    const nonce = randBytes(NONCE_LENGTH)
    const key = await deriveKey(passphrase.trim(), salt, defaultMem(), ARGON_ITERATIONS, ARGON_PARALLELISM)
    const cipher = new ChaCha20Poly1305(key)
    const plaintext = encoder.encode(JSON.stringify({ entries }, null, 2))
    const sealed = cipher.seal(nonce, plaintext)
    const payload = {
      version: 2,
      kdf: 'argon2id',
      mem_kib: defaultMem(),
      iterations: ARGON_ITERATIONS,
      parallelism: ARGON_PARALLELISM,
      cipher: 'chacha20poly1305',
      salt_b64: b64NoPad(salt),
      nonce_b64: b64NoPad(nonce),
      ciphertext_b64: b64NoPad(sealed),
    }
    return encoder.encode(JSON.stringify(payload, null, 2))
  }
  return encoder.encode(JSON.stringify({ entries }, null, 2))
}

export async function parseBackupBytes(bytes: Uint8Array, passphrase?: string): Promise<BackupEntry[]> {
  let parsed: any = null
  try { parsed = JSON.parse(decoder.decode(bytes)) } catch {
    throw new Error('invalid backup file')
  }
  if (parsed && typeof parsed === 'object' && parsed.ciphertext_b64) {
    const salt = b64ToBytes(String(parsed.salt_b64 || ''))
    const nonce = b64ToBytes(String(parsed.nonce_b64 || ''))
    const ciphertext = b64ToBytes(String(parsed.ciphertext_b64 || ''))
    const pw = (passphrase || '').trim()
    if (!pw) throw new Error('passphrase required')
    const memCandidates = typeof parsed.mem_kib === 'number' ? [parsed.mem_kib] : [ARGON_MEM_DESKTOP, ARGON_MEM_MOBILE]
    const iterations = typeof parsed.iterations === 'number' ? parsed.iterations : ARGON_ITERATIONS
    const parallelism = typeof parsed.parallelism === 'number' ? parsed.parallelism : ARGON_PARALLELISM
    let lastErr: any = null
    for (const mem of memCandidates) {
      try {
        const key = await deriveKey(pw, salt, mem, iterations, parallelism)
        const cipher = new ChaCha20Poly1305(key)
        const opened = cipher.open(nonce, ciphertext)
        if (!opened) throw new Error('decryption failed')
        const file = JSON.parse(decoder.decode(opened))
        if (Array.isArray(file?.entries)) return normalizeEntries(file.entries)
      } catch (err: any) { lastErr = err }
    }
    throw lastErr || new Error('decryption failed')
  }
  if (Array.isArray(parsed?.entries)) return normalizeEntries(parsed.entries)
  throw new Error('invalid backup content')
}

export function buildCsv(entries: BackupEntry[]) {
  const lines = ['fingerprint,label,postfix,method_id,created_at,id']
  for (const e of entries) {
    const fp = e.fingerprint || ''
    const safe = (s: string) => String(s ?? '').replace(/"/g, '""')
    lines.push([fp, safe(e.label), safe(e.postfix), e.method_id, e.created_at, e.id].join(','))
  }
  return lines.join('\n')
}

export function parseCsvEntries(raw: string): BackupEntry[] {
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0)
  const entries: BackupEntry[] = []
  lines.forEach((line, idx) => {
    if (idx === 0) return
    const parts = line.split(',')
    if (parts.length < 6) return
    const [fingerprint, label, postfix, method_id, created_at, id] = parts
    entries.push({
      id: id || `${idx}`,
      label: label || '',
      postfix: postfix || '',
      method_id: method_id || 'len36_strong',
      created_at: parseInt(created_at || '0', 10) || 0,
      order: 0,
      fingerprint: fingerprint || '',
    })
  })
  return entries
}
