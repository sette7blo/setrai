function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

async function importRequest(req) {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > 2048) {
      const error = new Error('Import request is too large')
      error.statusCode = 413
      throw error
    }
    chunks.push(chunk)
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (typeof body?.eventId !== 'string' || !/^[a-f0-9]{64}$/.test(body.eventId)) throw new Error()
    if (body.replaceImage !== undefined && typeof body.replaceImage !== 'boolean') throw new Error()
    return { eventId: body.eventId, replaceImage: body.replaceImage === true }
  } catch {
    const error = new Error('A valid catalog event ID is required')
    error.statusCode = 400
    throw error
  }
}

export function createDiscoveryRoutes(service, programService = null) {
  return {
    async handle(req, res, url) {
      const programs = url.pathname.startsWith('/api/nostr/programs')
      if (!programs && !url.pathname.startsWith('/api/nostr/exercises')) return false
      const catalogService = programs ? programService : service
      const base = programs ? '/api/nostr/programs' : '/api/nostr/exercises'
      if (!catalogService) { send(res, 404, { error: 'Discover is disabled' }); return true }
      if (programs && req.method === 'GET' && url.pathname === `${base}/review`) {
        const eventId = url.searchParams.get('eventId') || ''
        if (!/^[a-f0-9]{64}$/.test(eventId)) { send(res, 400, { error: 'A valid catalog event ID is required' }); return true }
        send(res, 200, { review: await catalogService.reviewProgram(eventId) })
        return true
      }
      if (req.method === 'GET' && url.pathname === base) {
        const list = programs ? catalogService.listPrograms : catalogService.listExercises
        send(res, 200, await list({ force: url.searchParams.get('refresh') === 'true' }))
        return true
      }
      if (req.method === 'POST' && (url.pathname === `${base}/import` || url.pathname === `${base}/update`)) {
        if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
          send(res, 415, { error: 'Imports require JSON content' })
          return true
        }
        const importItem = programs ? url.pathname.endsWith('/update') ? catalogService.updateProgram : catalogService.importProgram : url.pathname.endsWith('/update') ? catalogService.updateExercise : catalogService.importExercise
        const { eventId, replaceImage } = await importRequest(req)
        const result = await (!programs && url.pathname.endsWith('/update')
          ? importItem(eventId, { replaceImage }) : importItem(eventId))
        send(res, result.created ? 201 : 200, result)
        return true
      }
      return false
    }
  }
}
