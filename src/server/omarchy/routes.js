// The Omarchy integration exposes no HTTP endpoint. This module only watches
// responses from other features and requests a snapshot refresh when a
// request that can change the snapshot succeeds.
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

  return {
    observe
  }
}
