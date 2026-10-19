import { readRequestBuffer, sendJson } from '../shared/http.js'

const MAX_BACKUP_BYTES = 256 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  'application/vnd.sqlite3',
  'application/x-sqlite3',
  'application/octet-stream'
])

export function createBackupRoutes(service) {
  return {
    async handle(req, res, url) {
      if (url.pathname !== '/api/backup/database') return false

      if (req.method === 'GET') {
        const backup = service.exportDatabase()
        const date = new Date().toISOString().slice(0, 10)
        res.writeHead(200, {
          'Content-Type': 'application/vnd.sqlite3',
          'Content-Disposition': `attachment; filename="setrai-backup-${date}.db"`,
          'Content-Length': backup.length,
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        })
        res.end(backup)
        return true
      }

      if (req.method === 'POST') {
        const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase()
        if (!ALLOWED_TYPES.has(type)) {
          sendJson(res, 415, { error: 'Database restore requires a SQLite backup file' })
          return true
        }
        if (req.headers['x-setrai-restore-confirm'] !== 'replace') {
          sendJson(res, 400, { error: 'Database restore confirmation is required' })
          return true
        }
        const buffer = await readRequestBuffer(req, {
          maxBytes: MAX_BACKUP_BYTES,
          tooLargeMessage: 'Database backup exceeds the 256 MB limit'
        })
        const result = service.restoreDatabase(buffer)
        sendJson(res, 200, { restored: true, ...result })
        return true
      }

      sendJson(res, 405, { error: 'Method not allowed' })
      return true
    }
  }
}