// src/server/profile/routes.js

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

export function createProfileRoutes(profileService) {
  async function handle(req, res, url) {
    if (url.pathname !== '/api/profile') {
      return false
    }

    if (req.method === 'GET') {
      sendJson(res, 200, {
        profile: profileService.getProfile()
      })
      return true
    }

    if (req.method === 'PATCH') {
      const body = await readJsonBody(req)
      sendJson(res, 200, {
        profile: profileService.updateProfile(body)
      })
      return true
    }

    return false
  }

  return {
    handle
  }
}
