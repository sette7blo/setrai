import { sendJson } from '../shared/http.js'

// The Omarchy integration exposes one read endpoint for plugin hosts that do
// not share a filesystem with Setrai; it requires an API key. The observer
// watches responses from other features and requests a snapshot refresh when
// a request that can change the snapshot succeeds.
const SNAPSHOT_MUTATIONS = [
  // Session start, finish, and discard.
  { methods: ['POST'], pattern: /^\/api\/sessions$/ },
  { methods: ['POST'], pattern: /^\/api\/sessions\/\d+\/finish$/ },
  { methods: ['DELETE'], pattern: /^\/api\/sessions\/\d+$/ },
  // Edits to already-logged sets. Logging a new set and live-state saves are
  // left out: unfinished sessions do not contribute to the snapshot.
  { methods: ['PATCH', 'DELETE'], pattern: /^\/api\/sessions\/\d+\/sets\/\d+$/ },
  { methods: ['POST'], pattern: /^\/api\/quick-workout\/start$/ },
  { methods: ['POST', 'PUT', 'PATCH', 'DELETE'], pattern: /^\/api\/body-weight(\/\d+)?$/ },
  { methods: ['PUT', 'PATCH', 'DELETE'], pattern: /^\/api\/programs\/\d+$/ },
  { methods: ['POST'], pattern: /^\/api\/backup\/database$/ }
]

export function changesSnapshot(method, pathname) {
  return SNAPSHOT_MUTATIONS.some((rule) =>
    rule.methods.includes(method) && rule.pattern.test(pathname)
  )
}

export function createOmarchyRoutes(omarchyService) {
  function observe(req, res, url) {
    if (!changesSnapshot(req.method, url.pathname)) return

    res.once('finish', () => {
      if (res.statusCode < 400) omarchyService.requestWrite()
    })
  }

  function handle(req, res, url, apiKey) {
    if (url.pathname !== '/api/omarchy/snapshot') return false
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Method not allowed' })
      return true
    }
    if (!apiKey) {
      sendJson(res, 401, { error: 'An API key is required' })
      return true
    }
    res.setHeader('Cache-Control', 'no-store')
    sendJson(res, 200, { snapshot: omarchyService.getSnapshot() })
    return true
  }

  return {
    observe,
    handle
  }
}
