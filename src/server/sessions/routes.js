import { readJsonBody, sendJson } from '../shared/http.js'

function parseSessionId(pathname) {
  const match = pathname.match(
    /^\/api\/sessions\/(\d+)$/
  )

  return match ? Number(match[1]) : null
}

function parseFinishSessionId(pathname) {
  const match = pathname.match(
    /^\/api\/sessions\/(\d+)\/finish$/
  )

  return match ? Number(match[1]) : null
}

function parseSetPath(pathname) {
  const match = pathname.match(
    /^\/api\/sessions\/(\d+)\/sets(?:\/(\d+))?$/
  )

  if (!match) {
    return null
  }

  return {
    sessionId: Number(match[1]),
    setId: match[2] ? Number(match[2]) : null
  }
}

export function createSessionRoutes(sessionService) {
  async function handle(req, res, url) {
    if (
      req.method === 'GET' &&
      url.pathname === '/api/sessions'
    ) {
      sendJson(res, 200, {
        sessions: sessionService.listSessions()
      })
      return true
    }

    if (
      req.method === 'POST' &&
      url.pathname === '/api/sessions'
    ) {
      const body = await readJsonBody(req)
      sendJson(res, 201, {
        session: sessionService.startSession(body)
      })
      return true
    }

    const finishId = parseFinishSessionId(url.pathname)

    if (req.method === 'POST' && finishId !== null) {
      const body = await readJsonBody(req)
      sendJson(res, 200, {
        session: sessionService.finishSession(
          finishId,
          body
        )
      })
      return true
    }

    const setPath = parseSetPath(url.pathname)

    if (setPath) {
      return await handleSetRoute(
        req,
        res,
        setPath
      )
    }

    const sessionId = parseSessionId(url.pathname)

    if (sessionId === null) {
      return false
    }

    if (req.method === 'GET') {
      const session = sessionService.getSession(sessionId)

      if (!session) {
        sendJson(res, 404, {
          error: 'Session not found'
        })
        return true
      }

      sendJson(res, 200, { session })
      return true
    }

    if (req.method === 'PATCH') {
      sendJson(res, 200, { session: sessionService.updateLiveState(sessionId, await readJsonBody(req)) })
      return true
    }
    if (req.method === 'DELETE') {
      sessionService.discardSession(sessionId)
      res.writeHead(204)
      res.end()
      return true
    }

    return false
  }

  async function handleSetRoute(req, res, setPath) {
    if (req.method === 'POST' && setPath.setId === null) {
      const body = await readJsonBody(req)
      sendJson(res, 201, {
        set: sessionService.logSet(
          setPath.sessionId,
          body
        )
      })
      return true
    }

    if (setPath.setId === null) {
      return false
    }

    if (req.method === 'PATCH') {
      const body = await readJsonBody(req)
      sendJson(res, 200, {
        set: sessionService.updateSet(
          setPath.sessionId,
          setPath.setId,
          body
        )
      })
      return true
    }

    if (req.method === 'DELETE') {
      sessionService.deleteSet(
        setPath.sessionId,
        setPath.setId
      )
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
