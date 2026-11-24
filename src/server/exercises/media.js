// Uploaded exercise images live under SETRAI_DATA_DIR/media/exercises/

import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'

export const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
  ['image/svg+xml', '.svg']
])

export function exerciseMediaRoot(dataDir) {
  return path.resolve(dataDir, 'media', 'exercises')
}

export function ensureExerciseMediaRoot(dataDir) {
  const root = exerciseMediaRoot(dataDir)
  fs.mkdirSync(root, { recursive: true })
  return root
}

function sniffType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
  ) {
    return 'image/png'
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }
  if (buffer.length >= 6) {
    const head = buffer.toString('ascii', 0, 6)
    if (head === 'GIF87a' || head === 'GIF89a') return 'image/gif'
  }
  const text = buffer.subarray(0, Math.min(buffer.length, 256)).toString('utf8').trimStart()
  if (text.startsWith('<svg') || text.startsWith('<?xml')) return 'image/svg+xml'
  return null
}

export function storeExerciseImage(dataDir, buffer, declaredType = '') {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    const error = new Error('Image file is required')
    error.statusCode = 400
    throw error
  }
  if (buffer.length > MAX_BYTES) {
    const error = new Error('Image must be 10 MB or smaller')
    error.statusCode = 413
    throw error
  }

  const sniffed = sniffType(buffer)
  const type = sniffed || (ALLOWED.has(declaredType) ? declaredType : null)
  if (!type || !ALLOWED.has(type)) {
    const error = new Error('Image must be JPEG, PNG, WebP, GIF, or SVG')
    error.statusCode = 400
    throw error
  }

  const root = ensureExerciseMediaRoot(dataDir)
  const name = `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}${ALLOWED.get(type)}`
  const filePath = path.join(root, name)
  fs.writeFileSync(filePath, buffer, { flag: 'wx' })
  return {
    imageUrl: `/media/exercises/${name}`,
    fileName: name,
    contentType: type,
    bytes: buffer.length
  }
}

// Names storeExerciseImage gives uploads: "<base36 time>-<12 hex>.<ext>".
const UPLOAD_NAME = /^[a-z0-9]+-[0-9a-f]{12}\.(jpg|png|webp|gif|svg)$/
export const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000

// Deletes uploads nothing refers to. Only regular files directly inside the
// exercise media folder with an upload name are considered (no symlinks, no
// subfolders), and only once they are older than the grace period, so an
// image uploaded in an editor that is still open survives until it is saved.
export function sweepOrphanedExerciseImages(dataDir, referencedUrls, { graceMs = ORPHAN_GRACE_MS, now = Date.now() } = {}) {
  const root = exerciseMediaRoot(dataDir)
  const referenced = new Set([...referencedUrls].map((url) => String(url).split(/[?#]/)[0]))
  let entries
  try {
    entries = fs.readdirSync(root, { withFileTypes: true })
  } catch {
    return []
  }
  const removed = []
  for (const entry of entries) {
    if (!entry.isFile() || !UPLOAD_NAME.test(entry.name)) continue
    if (referenced.has(`/media/exercises/${entry.name}`)) continue
    const filePath = path.join(root, entry.name)
    try {
      const stat = fs.lstatSync(filePath)
      if (!stat.isFile() || now - stat.mtimeMs < graceMs) continue
      fs.unlinkSync(filePath)
      removed.push(entry.name)
    } catch {
      // Gone already or not removable: leave it for the next sweep.
    }
  }
  return removed
}

export function resolveExerciseMediaFile(dataDir, fileName) {
  if (!fileName || typeof fileName !== 'string') return null
  if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) return null
  const root = exerciseMediaRoot(dataDir)
  const filePath = path.resolve(root, fileName)
  if (filePath !== root && !filePath.startsWith(root + path.sep)) return null
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null
  return filePath
}

function contentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase()
  for (const [type, suffix] of ALLOWED) {
    if (suffix === extension) return type
  }
  return 'application/octet-stream'
}

export function sendExerciseMediaFile(res, filePath, method = 'GET') {
  // Uploaded files may be SVG, which can carry scripts. An <img> never runs
  // them, but opening the file's URL directly would, on Setrai's origin. The
  // sandbox policy blocks scripts and forms there; nosniff stops a browser
  // from reading any upload as something other than its declared type.
  res.writeHead(200, {
    'Content-Type': contentTypeFor(filePath),
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
    'X-Content-Type-Options': 'nosniff'
  })
  if (method === 'HEAD') {
    res.end()
    return
  }
  // A file removed after it was resolved must not take the server down.
  const stream = fs.createReadStream(filePath)
  stream.on('error', () => res.destroy())
  stream.pipe(res)
}

export async function readRequestBody(req, maxBytes = MAX_BYTES + 64_000) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) {
      const error = new Error('Request body is too large')
      error.statusCode = 413
      throw error
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

/** Minimal multipart parser for a single file field named `image`. */
export function parseImageMultipart(buffer, contentType) {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '')
  if (!boundaryMatch) {
    const error = new Error('Multipart boundary is required')
    error.statusCode = 400
    throw error
  }
  const boundary = boundaryMatch[1] || boundaryMatch[2]
  const marker = Buffer.from(`--${boundary}`)
  let start = buffer.indexOf(marker)
  if (start < 0) {
    const error = new Error('Invalid multipart body')
    error.statusCode = 400
    throw error
  }

  while (start >= 0) {
    const afterBoundary = start + marker.length
    if (buffer.subarray(afterBoundary, afterBoundary + 2).toString() === '--') break
    const headerStart = buffer[afterBoundary] === 0x0d && buffer[afterBoundary + 1] === 0x0a
      ? afterBoundary + 2
      : afterBoundary
    const headerEnd = buffer.indexOf('\r\n\r\n', headerStart)
    if (headerEnd < 0) break
    const headers = buffer.subarray(headerStart, headerEnd).toString('utf8')
    const next = buffer.indexOf(marker, headerEnd + 4)
    if (next < 0) break
    let bodyEnd = next - 2
    if (bodyEnd < headerEnd + 4) bodyEnd = next
    const body = buffer.subarray(headerEnd + 4, bodyEnd)
    const nameMatch = /name="([^"]+)"/i.exec(headers)
    const filenameMatch = /filename="([^"]*)"/i.exec(headers)
    const typeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(headers)
    if (nameMatch?.[1] === 'image' && filenameMatch) {
      return {
        fileName: filenameMatch[1] || 'upload',
        contentType: (typeMatch?.[1] || '').trim().toLowerCase(),
        buffer: body
      }
    }
    start = next
  }

  const error = new Error('Image field is required')
  error.statusCode = 400
  throw error
}
