// Builds the glanceable-state snapshot and writes it atomically for
// file-watching consumers such as the Omarchy bar plugin.
import fs from 'node:fs'
import path from 'node:path'

import taxonomy from '../../shared/exercise-taxonomy.json' with { type: 'json' }

export const SNAPSHOT_SCHEMA_VERSION = 1

const SESSION_LIMIT = 500
const MINUTE_MS = 60 * 1000
const MUSCLE_GROUPS = taxonomy.primaryMuscles.map((option) => option.value)

function parseTimestamp(value) {
  if (!value) return null

  // SQLite datetime('now') yields "YYYY-MM-DD HH:MM:SS" in UTC.
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`
  const parsed = new Date(iso)

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function dayKey(date) {
  return date.toISOString().slice(0, 10)
}

// Monday-based UTC week, matching the Statistics weekly volume buckets.
function weekKey(date) {
  const start = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ))
  const day = start.getUTCDay() || 7
  start.setUTCDate(start.getUTCDate() - day + 1)
  return dayKey(start)
}

function sessionVolumeKg(session) {
  let total = 0

  for (const set of session.sets ?? []) {
    const weight = Number(set.weight)
    const reps = Number(set.reps)

    if (set.done && weight > 0 && reps > 0) {
      total += weight * reps
    }
  }

  return total
}

function round(value, digits) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function section(build) {
  try {
    return build()
  } catch {
    return null
  }
}

function buildTraining(completed, now) {
  const today = dayKey(now)
  const week = weekKey(now)
  const result = {
    today: { volumeKg: 0, sessionsCompleted: 0 },
    week: { volumeKg: 0, sessions: 0 },
    last: null
  }

  for (const session of completed) {
    const finishedAt = parseTimestamp(session.finishedAt)
    if (!finishedAt) continue

    const volume = sessionVolumeKg(session)

    if (dayKey(finishedAt) === today) {
      result.today.volumeKg += volume
      result.today.sessionsCompleted += 1
    }

    if (weekKey(finishedAt) === week) {
      result.week.volumeKg += volume
      result.week.sessions += 1
    }

    if (!result.last || finishedAt > result.last.finishedAt) {
      result.last = { session, finishedAt }
    }
  }

  result.today.volumeKg = round(result.today.volumeKg, 1)
  result.week.volumeKg = round(result.week.volumeKg, 1)
  return result
}

function buildLastWorkout(last) {
  if (!last) return null

  const startedAt = parseTimestamp(last.session.startedAt)

  return {
    finishedAt: last.finishedAt.toISOString(),
    name: last.session.programName || null,
    durationMin: startedAt
      ? Math.max(0, Math.round((last.finishedAt - startedAt) / MINUTE_MS))
      : null
  }
}

// Mean recovery (0-1) across every primary muscle group, where a group that
// was not trained recently counts as fully ready. Mirrors the "% ready" figure
// on the Recovery page.
function buildReadiness(getGroupReadiness, now) {
  const byGroup = getGroupReadiness(now)
  const total = MUSCLE_GROUPS.reduce(
    (sum, group) => sum + (byGroup.get(group) ?? 1),
    0
  )

  return round(total / MUSCLE_GROUPS.length, 2)
}

// Setrai has no explicit "active program" setting, so the most recently
// started saved program stands in for it. Generated quick workouts are skipped.
function buildActiveProgram(sessions, programService) {
  for (const session of sessions) {
    if (!session.programId) continue

    const program = programService.getProgram(session.programId)

    if (program && !program.isTemporary) {
      return { id: program.id, name: program.name, weekIndex: null }
    }
  }

  return null
}

function buildResumeWorkout(sessions) {
  const open = sessions.find((session) => !session.finishedAt)

  return open
    ? { sessionId: open.id, url: `/sessions/${open.id}` }
    : null
}

function buildBody(bodyService) {
  const latest = bodyService.getLatestBodyWeight()

  return latest
    ? { weightKg: latest.weightKg, measuredAt: latest.date }
    : null
}

export function buildSnapshot(services, now = new Date()) {
  const {
    sessionService,
    programService,
    bodyService,
    getGroupReadiness
  } = services

  const recent = section(() => sessionService.listSessions()) ?? []
  const training = section(() => buildTraining(
    sessionService.listCompletedSessions({ limit: SESSION_LIMIT }),
    now
  ))
  const readiness = section(() => buildReadiness(getGroupReadiness, now))

  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    generatedAt: now.toISOString(),
    activeProgram: section(() => buildActiveProgram(recent, programService)),
    resumeWorkout: section(() => buildResumeWorkout(recent)),
    today: training ? training.today : null,
    week: training ? { ...training.week, readiness } : null,
    lastWorkout: training ? buildLastWorkout(training.last) : null,
    body: section(() => buildBody(bodyService))
  }
}

// Temp file + rename in the same directory, so a watcher never reads a
// half-written snapshot.
export function writeSnapshotFile(filePath, snapshot) {
  const directory = path.dirname(filePath)
  const tempPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.tmp`
  )

  fs.mkdirSync(directory, { recursive: true })

  try {
    fs.writeFileSync(tempPath, `${JSON.stringify(snapshot, null, 2)}\n`)
    fs.renameSync(tempPath, filePath)
  } catch (error) {
    fs.rmSync(tempPath, { force: true })
    throw error
  }
}
