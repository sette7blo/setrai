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

// Vite names build output in /assets/ "<name>-<8 character hash>.<ext>", so
// the content at such a URL never changes and can be cached for good.
// index.html still revalidates on every load, which is how a new release (with
// new hashed names) is picked up. Source maps are only revalidated.
const HASHED_ASSET = /^[\w.-]+-[A-Za-z0-9_-]{8}\.[a-z0-9]+$/

function cacheControlFor(filePath, clientDist) {
  const extension = path.extname(filePath)
  const relative = path.relative(clientDist, filePath).split(path.sep)

  if (relative.length === 2 && relative[0] === 'assets' && extension !== '.map' && HASHED_ASSET.test(relative[1])) {
    return 'public, max-age=31536000, immutable'
  }

  if (extension === '.html' || extension === '.css' || extension === '.js') {
    return 'no-store, max-age=0'
  }

  return 'no-cache'
}

function sendFile(res, filePath, method, clientDist) {
  const extension = path.extname(filePath)
  const contentType = MIME_TYPES.get(extension) ??
    'application/octet-stream'

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': cacheControlFor(filePath, clientDist)
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
    sendFile(res, filePath, req.method, clientDist)
    return true
  }

  const fallback = path.join(clientDist, 'index.html')

  if (fs.existsSync(fallback)) {
    sendFile(res, fallback, req.method, clientDist)
    return true
  }

  return false
}
