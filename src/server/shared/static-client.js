import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
)
const CLIENT_DIST = path.join(ROOT, 'dist', 'client')

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.webmanifest', 'application/manifest+json'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp']
])

function safeClientPath(clientDist, pathname) {
  const requestedPath = pathname === '/'
    ? '/index.html'
    : pathname
  let decodedPath
  try {
    decodedPath = decodeURIComponent(requestedPath)
  } catch {
    return null
  }
  const filePath = path.join(clientDist, path.normalize(decodedPath))

  if (!filePath.startsWith(clientDist + path.sep)) {
    return null
  }

  return filePath
}

// Directories (e.g. /assets) must not be streamed: reading one fails with
// EISDIR, which would crash the process.
function isFile(filePath) {
  try {
    return fs.statSync(filePath).isFile()
  } catch {
    return false
  }
}

function cacheControlFor(filePath) {
  const extension = path.extname(filePath)

  if (extension === '.html' || extension === '.css' || extension === '.js') {
    return 'no-store, max-age=0'
  }

  return 'no-cache'
}

function sendFile(res, filePath, method) {
  const extension = path.extname(filePath)
  const contentType = MIME_TYPES.get(extension) ??
    'application/octet-stream'

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': cacheControlFor(filePath)
  })

  if (method === 'HEAD') {
    res.end()
    return
  }

  const stream = fs.createReadStream(filePath)
  stream.on('error', () => res.destroy())
  stream.pipe(res)
}

export function handleStaticClientRoute(req, res, url, clientDist = CLIENT_DIST) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return false
  }

  if (url.pathname.startsWith('/api/')) {
    return false
  }

  if (!fs.existsSync(clientDist)) {
    return false
  }

  const filePath = safeClientPath(clientDist, url.pathname)

  if (filePath && isFile(filePath)) {
    sendFile(res, filePath, req.method)
    return true
  }

  const fallback = path.join(clientDist, 'index.html')

  if (fs.existsSync(fallback)) {
    sendFile(res, fallback, req.method)
    return true
  }

  return false
}
