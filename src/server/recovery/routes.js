// src/server/recovery/routes.js

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json'
  })
  res.end(JSON.stringify(body))
}

export function createRecoveryRoutes(recoveryService) {
  async function handle(req, res, url) {
    if (
      req.method === 'GET' &&
      url.pathname === '/api/recovery'
    ) {
      sendJson(res, 200, {
        recovery: recoveryService.getRecovery()
      })
      return true
    }

    return false
  }

  return { handle }
}
