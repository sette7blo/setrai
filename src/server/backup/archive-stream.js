import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createGzip } from 'node:zlib'

// Writes the version 1 archive (gzipped JSON with base64 database and media)
// piece by piece with async I/O, so a large export never holds the whole
// archive in memory or blocks the event loop while it is built. The bytes are
// the same JSON the restore code has always read.

const CHUNK_BYTES = 3 * 64 * 1024

// Base64 in pieces: every piece but the last covers a multiple of 3 bytes, so
// the pieces join into one valid base64 string.
async function* base64File(file) {
  let carry = Buffer.alloc(0)
  for await (const chunk of fs.createReadStream(file, { highWaterMark: CHUNK_BYTES })) {
    const data = carry.length ? Buffer.concat([carry, chunk]) : chunk
    const usable = data.length - (data.length % 3)
    if (usable) yield data.subarray(0, usable).toString('base64')
    carry = data.subarray(usable)
  }
  if (carry.length) yield carry.toString('base64')
}

// Regular files only (symlinks are skipped), as relative '/'-separated paths.
async function listMediaFiles(mediaDir) {
  const files = []
  async function visit(directory) {
    let entries
    try {
      entries = await fs.promises.readdir(directory, { withFileTypes: true })
    } catch (error) {
      if (error.code === 'ENOENT' && directory === mediaDir) return
      throw error
    }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name)
      if (entry.isDirectory()) await visit(absolute)
      else if (entry.isFile()) files.push(path.relative(mediaDir, absolute).split(path.sep).join('/'))
    }
  }
  await visit(mediaDir)
  return files.sort((a, b) => a.localeCompare(b))
}

async function* archiveChunks({ format, databaseFile, mediaDir, createdAt }) {
  yield `{"format":${JSON.stringify(format)},"version":1,"createdAt":${JSON.stringify(createdAt)},"database":"`
  yield* base64File(databaseFile)
  yield '","media":['
  const media = await listMediaFiles(mediaDir)
  for (const [index, relative] of media.entries()) {
    yield `${index ? ',' : ''}{"path":${JSON.stringify(relative)},"data":"`
    yield* base64File(path.join(mediaDir, ...relative.split('/')))
    yield '"}'
  }
  yield ']}'
}

export async function writeArchive(output, options) {
  await pipeline(Readable.from(archiveChunks(options)), createGzip({ level: 6 }), output)
}
