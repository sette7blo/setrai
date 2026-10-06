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

function safeClientPath(pathname) {
  const requestedPath = pathname === '/'
    ? '/index.html'
    : pathname
  const normalizedPath = path.normalize(
    decodeURIComponent(requestedPath)
  )
  const filePath = path.join(CLIENT_DIST, normalizedPath)

  if (!filePath.startsWith(CLIENT_DIST)) {
    return null
  }

  return filePath
}

function sendFile(res, filePath, method) {
  const extension = path.extname(filePath)
  const contentType = MIME_TYPES.get(extension) ??
    'application/octet-stream'

  res.writeHead(200, {
    'Content-Type': contentType
  })

  if (method === 'HEAD') {
    res.end()
    return
  }

  fs.createReadStream(filePath).pipe(res)
}

export function handleStaticClientRoute(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return false
  }

  if (url.pathname.startsWith('/api/')) {
    return false
  }

  if (!fs.existsSync(CLIENT_DIST)) {
    return false
  }

  const filePath = safeClientPath(url.pathname)

  if (filePath && fs.existsSync(filePath)) {
    sendFile(res, filePath, req.method)
    return true
  }

  const fallback = path.join(CLIENT_DIST, 'index.html')

  if (fs.existsSync(fallback)) {
    sendFile(res, fallback, req.method)
    return true
  }

  return false
}
