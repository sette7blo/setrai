// src/server/programs/routes.js

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json'
  })

  res.end(JSON.stringify(body))
}

async function readJsonBody(req) {
  const chunks = []
  let size = 0

  for await (const chunk of req) {
    size += chunk.length
    if (size > 262144) {
      const error = new Error('Program request is too large')
      error.statusCode = 413
      throw error
    }
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

function parseProgramId(pathname) {
  const match = pathname.match(
    /^\/api\/programs\/(\d+)$/
  )

  return match ? Number(match[1]) : null
}

function parseDuplicateId(pathname) {
  const match = pathname.match(
    /^\/api\/programs\/(\d+)\/duplicate$/
  )

  return match ? Number(match[1]) : null
}

export function createProgramRoutes(programService) {
  async function handle(req, res, url) {
    if (
      req.method === 'GET' &&
      url.pathname === '/api/programs'
    ) {
      sendJson(res, 200, {
        programs: programService.listPrograms()
      })

      return true
    }

    if (
      req.method === 'POST' &&
      url.pathname === '/api/programs'
    ) {
      const body = await readJsonBody(req)
      const program = programService.createProgram(body)

      sendJson(res, 201, {
        program
      })

      return true
    }

    const duplicateId = parseDuplicateId(url.pathname)

    if (
      req.method === 'POST' &&
      duplicateId !== null
    ) {
      const program =
        programService.duplicateProgram(duplicateId)

      if (!program) {
        sendJson(res, 404, {
          error: 'Program not found'
        })

        return true
      }

      sendJson(res, 201, {
        program
      })

      return true
    }

    const programId = parseProgramId(url.pathname)

    if (programId === null) {
      return false
    }

    if (req.method === 'GET') {
      const program = programService.getProgram(programId)

      if (!program) {
        sendJson(res, 404, {
          error: 'Program not found'
        })

        return true
      }

      sendJson(res, 200, {
        program
      })

      return true
    }

    if (req.method === 'PATCH') {
      const body = await readJsonBody(req)
      const program = programService.updateProgram(
        programId,
        body
      )

      if (!program) {
        sendJson(res, 404, {
          error: 'Program not found'
        })

        return true
      }

      sendJson(res, 200, {
        program
      })

      return true
    }

    if (req.method === 'DELETE') {
      const removed = programService.deleteProgram(
        programId
      )

      if (!removed) {
        sendJson(res, 404, {
          error: 'Program not found'
        })

        return true
      }

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
