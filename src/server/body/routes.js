// src/server/body/routes.js

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json'
  })
  res.end(JSON.stringify(body))
}

async function readJsonBody(req) {
  const chunks = []

  for await (const chunk of req) {
    chunks.push(chunk)
  }

  if (chunks.length === 0) {
    return {}
  }

  try {
    return JSON.parse(
      Buffer.concat(chunks).toString('utf8')
    )
  } catch {
    const error = new Error('Invalid JSON body')
    error.statusCode = 400
    throw error
  }
}

function parseEntryId(pathname) {
  const match = pathname.match(
    /^\/api\/body-weight\/(\d+)$/
  )

  return match ? Number(match[1]) : null
}

export function createBodyRoutes(bodyService) {
  async function handle(req, res, url) {
    if (
      req.method === 'GET' &&
      url.pathname === '/api/body-weight'
    ) {
      sendJson(res, 200, {
        entries: bodyService.listBodyWeight({
          from: url.searchParams.get('from'),
          to: url.searchParams.get('to')
        })
      })
      return true
    }

    if (
      req.method === 'POST' &&
      url.pathname === '/api/body-weight'
    ) {
      const body = await readJsonBody(req)
      sendJson(res, 201, {
        entry: bodyService.saveBodyWeight(body)
      })
      return true
    }

    if (
      req.method === 'GET' &&
      url.pathname === '/api/body-weight/latest'
    ) {
      const entry = bodyService.getLatestBodyWeight()

      if (!entry) {
        sendJson(res, 404, {
          error: 'Body-weight entry not found'
        })
        return true
      }

      sendJson(res, 200, { entry })
      return true
    }

    const entryId = parseEntryId(url.pathname)

    if (entryId === null) {
      return false
    }

    if (req.method === 'GET') {
      const entry = bodyService.getBodyWeight(entryId)

      if (!entry) {
        sendJson(res, 404, {
          error: 'Body-weight entry not found'
        })
        return true
      }

      sendJson(res, 200, { entry })
      return true
    }

    if (req.method === 'PATCH') {
      const body = await readJsonBody(req)
      sendJson(res, 200, {
        entry: bodyService.updateBodyWeight(
          entryId,
          body
        )
      })
      return true
    }

    if (req.method === 'DELETE') {
      bodyService.deleteBodyWeight(entryId)
      res.writeHead(204)
      res.end()
      return true
    }

    return false
  }

  return {
    handle
  }
}
