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

export async function readJsonBody(req, { maxBytes = DEFAULT_MAX_JSON_BYTES, tooLargeMessage = 'Request body is too large' } = {}) {
  const buffer = await readRequestBuffer(req, { maxBytes, tooLargeMessage })
  if (!buffer.length) return {}
  try {
    return JSON.parse(buffer.toString('utf8'))
  } catch {
    throw httpError('Invalid JSON body', 400)
  }
}
