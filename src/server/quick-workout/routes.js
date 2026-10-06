// src/server/quick-workout/routes.js

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

export function createQuickWorkoutRoutes(quickWorkoutService) {
  async function handle(req, res, url) {
    if (
      req.method === 'POST' &&
      url.pathname === '/api/quick-workout'
    ) {
      const body = await readJsonBody(req)
      sendJson(res, 200, {
        workout: quickWorkoutService.generate(body)
      })
      return true
    }

    if (
      req.method === 'POST' &&
      url.pathname === '/api/quick-workout/start'
    ) {
      const body = await readJsonBody(req)
      sendJson(res, 201, quickWorkoutService.start(body))
      return true
    }

    return false
  }

  return { handle }
}
