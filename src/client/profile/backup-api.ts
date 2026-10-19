import { ApiError } from '../shared/api/errors.js'

export interface RestoreResult {
  restored: boolean
  safetyBackup: string
  mediaFiles: number | null
}

export const DATABASE_BACKUP_URL = '/api/backup/database'

export async function restoreDatabase(file: File): Promise<RestoreResult> {
  const response = await fetch(DATABASE_BACKUP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': file.type || (/\.setrai(?:-backup)?$/i.test(file.name) ? 'application/vnd.setrai.backup' : 'application/octet-stream'),
      'X-Setrai-Restore-Confirm': 'replace'
    },
    body: file
  })
  if (!response.ok) {
    let message = 'Database restore failed.'
    try {
      const body = await response.json() as { error?: string }
      if (body.error) message = body.error
    } catch { /* keep the safe fallback */ }
    throw new ApiError(message, response.status, DATABASE_BACKUP_URL)
  }
  return await response.json() as RestoreResult
}
