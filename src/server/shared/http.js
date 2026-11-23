const DEFAULT_MAX_JSON_BYTES = 256 * 1024

function httpError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode })
}

export function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

export async function readRequestBuffer(req, { maxBytes, tooLargeMessage = 'Request body is too large' }) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > maxBytes) throw httpError(tooLargeMessage, 413)
    chunks.push(buffer)
  }
  return Buffer.concat(chunks)
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const SAME_ORIGIN_FETCH_SITES = new Set(['same-origin', 'none'])

// Browsers label every request with Sec-Fetch-Site; another website (or
// another app on the same host) cannot forge it. Non-browser clients such as
// the desktop plugin do not send it and are unaffected.
export function assertSameOriginWrite(req) {
  if (SAFE_METHODS.has(req.method)) return
  const site = req.headers?.['sec-fetch-site']
  if (typeof site === 'string' && !SAME_ORIGIN_FETCH_SITES.has(site.toLowerCase())) {
    throw httpError('Cross-site requests are not allowed', 403)
  }
}

function isJsonContentType(value) {
  const type = String(value || '').split(';')[0].trim().toLowerCase()
  return type === 'application/json' || /^application\/[a-z0-9.+-]+\+json$/.test(type)
}

export async function readJsonBody(req, { maxBytes = DEFAULT_MAX_JSON_BYTES, tooLargeMessage = 'Request body is too large' } = {}) {
  const buffer = await readRequestBuffer(req, { maxBytes, tooLargeMessage })
  if (!buffer.length) return {}
  // A JSON content type cannot be sent cross-site without a CORS preflight,
  // which Setrai never grants, so a form or text/plain post is refused here.
  if (!isJsonContentType(req.headers?.['content-type'])) {
    throw httpError('Request body must be JSON (Content-Type: application/json)', 415)
  }
  try {
    return JSON.parse(buffer.toString('utf8'))
  } catch {
    throw httpError('Invalid JSON body', 400)
  }
}
