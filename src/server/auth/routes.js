import { readJsonBody, sendJson } from '../shared/http.js'

const KEY_ROUTE = /^\/api\/api-keys\/(\d+)$/

function httpError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode })
}

function bearerToken(req) {
  const header = req.headers.authorization
  if (typeof header !== 'string') return null
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header)
  if (!match) throw httpError('Authorization header must use the Bearer scheme', 401)
  return match[1]
}

export function createAuthRoutes(authService) {
  // Requests without a key keep working (the browser UI has no login). A
  // request that presents a key must present a valid one.
  function authenticate(req) {
    const token = bearerToken(req)
    if (token === null) return null
    const apiKey = authService.verifyKey(token)
    if (!apiKey) throw httpError('Invalid or revoked API key', 401)
    return apiKey
  }

  async function handle(req, res, url, apiKey) {
    if (url.pathname === '/api/api-keys/current') {
      if (req.method !== 'GET') return false
      if (!apiKey) throw httpError('An API key is required', 401)
      sendJson(res, 200, { apiKey })
      return true
    }

    if (url.pathname === '/api/api-keys') {
      if (req.method === 'GET') {
        sendJson(res, 200, { apiKeys: authService.listKeys() })
        return true
      }
      if (req.method === 'POST') {
        const body = await readJsonBody(req)
        res.setHeader('Cache-Control', 'no-store')
        sendJson(res, 201, authService.createKey(body))
        return true
      }
      sendJson(res, 405, { error: 'Method not allowed' })
      return true
    }

    const match = KEY_ROUTE.exec(url.pathname)
    if (!match) return false
    if (req.method !== 'DELETE') {
      sendJson(res, 405, { error: 'Method not allowed' })
      return true
    }
    authService.revokeKey(Number(match[1]))
    res.writeHead(204)
    res.end()
    return true
  }

  return { authenticate, handle }
}
