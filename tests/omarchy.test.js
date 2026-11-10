import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { loadConfig } from '../src/server/config/config.js'
import { openDatabase } from '../src/server/db/connection.js'
import { createBodyService } from '../src/server/body/service.js'
import { createExerciseService } from '../src/server/exercises/service.js'
import { createProgramService } from '../src/server/programs/service.js'
import { createRecoveryService, workoutReadiness } from '../src/server/recovery/service.js'
import { createSessionService } from '../src/server/sessions/service.js'
import { changesSnapshot, createOmarchyRoutes } from '../src/server/omarchy/routes.js'
import { createOmarchyService } from '../src/server/omarchy/service.js'
import { buildSnapshot, writeSnapshotFile } from '../src/server/omarchy/snapshot.js'

function withDatabase(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'setrai-test-'))
  const db = openDatabase(path.join(directory, 'test.db'))
  const recoveryService = createRecoveryService(db)

  try {
    return run({
      directory,
      exerciseService: createExerciseService(db),
      sessionService: createSessionService(db),
      programService: createProgramService(db),
      bodyService: createBodyService(db),
      getGroupReadiness: (now) =>
        workoutReadiness(recoveryService.getRecovery({ now }))
    })
  } finally {
    db.close()
    fs.rmSync(directory, { recursive: true, force: true })
  }
}

function sqliteTime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

function withEnv(values, run) {
  const previous = {}

  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }

  try {
    return run()
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

test('empty database produces a valid snapshot with null sections', () => {
  withDatabase((services) => {
    const now = new Date('2026-11-10T12:00:00.000Z')
    const snapshot = buildSnapshot(services, now)

    assert.deepEqual(snapshot, {
      schemaVersion: 1,
      generatedAt: '2026-11-10T12:00:00.000Z',
      activeProgram: null,
      resumeWorkout: null,
      today: { volumeKg: 0, sessionsCompleted: 0 },
      week: { volumeKg: 0, sessions: 0, readiness: 1 },
      lastWorkout: null,
      body: null
    })
  })
})

test('snapshot reflects sessions, programs, and body weight', () => {
  withDatabase((services) => {
    const now = new Date()
    const bench = services.exerciseService.createExercise({
      name: 'Bench Press',
      muscle_group: 'chest'
    })
    const program = services.programService.createProgram({
      name: 'Upper Body A',
      exercises: [{ exerciseId: bench.id, position: 1 }]
    })

    const finished = services.sessionService.startSession({ programId: program.id })
    services.sessionService.logSet(finished.id, {
      exerciseId: bench.id, setNumber: 1, reps: 5, weight: 100
    })
    services.sessionService.logSet(finished.id, {
      exerciseId: bench.id, setNumber: 2, reps: 5, weight: 80.5
    })
    services.sessionService.finishSession(finished.id, {
      finishedAt: sqliteTime(now)
    })

    const open = services.sessionService.startSession({ name: 'Ad-hoc' })
    services.bodyService.saveBodyWeight({ date: '2026-11-09', weightKg: 82.4 })

    const snapshot = buildSnapshot(services, now)

    assert.deepEqual(snapshot.activeProgram, {
      id: program.id, name: 'Upper Body A', weekIndex: null
    })
    assert.deepEqual(snapshot.resumeWorkout, {
      sessionId: open.id, url: `/sessions/${open.id}`
    })
    assert.deepEqual(snapshot.today, { volumeKg: 902.5, sessionsCompleted: 1 })
    assert.equal(snapshot.week.volumeKg, 902.5)
    assert.equal(snapshot.week.sessions, 1)
    // One freshly trained group out of ten leaves the rest fully ready.
    assert.ok(snapshot.week.readiness >= 0.9 && snapshot.week.readiness < 1)
    assert.equal(snapshot.lastWorkout.name, 'Upper Body A')
    assert.equal(snapshot.lastWorkout.finishedAt, `${now.toISOString().slice(0, 19)}.000Z`)
    assert.ok(snapshot.lastWorkout.durationMin >= 0)
    assert.deepEqual(snapshot.body, { weightKg: 82.4, measuredAt: '2026-11-09' })
  })
})

test('sessions finished on earlier days and weeks stay out of today and week', () => {
  withDatabase((services) => {
    const now = new Date('2026-11-12T12:00:00.000Z')
    const bench = services.exerciseService.createExercise({ name: 'Bench Press' })

    for (const finishedAt of ['2026-11-12 08:00:00', '2026-11-10 08:00:00', '2026-11-08 08:00:00']) {
      const session = services.sessionService.startSession({ name: 'Lift' })
      services.sessionService.logSet(session.id, {
        exerciseId: bench.id, setNumber: 1, reps: 10, weight: 50
      })
      services.sessionService.finishSession(session.id, { finishedAt })
    }

    const snapshot = buildSnapshot(services, now)

    assert.deepEqual(snapshot.today, { volumeKg: 500, sessionsCompleted: 1 })
    assert.equal(snapshot.week.volumeKg, 1000)
    assert.equal(snapshot.week.sessions, 2)
    assert.equal(snapshot.lastWorkout.finishedAt, '2026-11-12T08:00:00.000Z')
  })
})

test('temporary programs are not reported as the active program', () => {
  withDatabase((services) => {
    const bench = services.exerciseService.createExercise({ name: 'Bench Press' })
    const temporary = services.programService.createProgram({
      name: 'Quick Workout',
      isTemporary: true,
      exercises: [{ exerciseId: bench.id, position: 1 }]
    })
    services.sessionService.startSession({ programId: temporary.id })

    assert.equal(buildSnapshot(services).activeProgram, null)
  })
})

test('a failing service nulls only its own section', () => {
  withDatabase((services) => {
    const snapshot = buildSnapshot({
      ...services,
      bodyService: { getLatestBodyWeight() { throw new Error('boom') } },
      getGroupReadiness() { throw new Error('boom') }
    })

    assert.equal(snapshot.body, null)
    assert.equal(snapshot.week.readiness, null)
    assert.equal(snapshot.week.sessions, 0)
  })
})

test('snapshot file is written atomically and leaves no temp file', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'setrai-snapshot-'))

  try {
    const filePath = path.join(directory, 'nested', 'snapshot.json')
    writeSnapshotFile(filePath, { schemaVersion: 1, value: 'first' })
    writeSnapshotFile(filePath, { schemaVersion: 1, value: 'second' })

    assert.equal(JSON.parse(fs.readFileSync(filePath, 'utf8')).value, 'second')
    assert.deepEqual(fs.readdirSync(path.dirname(filePath)), ['snapshot.json'])
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test('disabled service never writes', () => {
  withDatabase((services) => {
    const snapshotPath = path.join(services.directory, 'out', 'snapshot.json')
    const service = createOmarchyService(
      { snapshotEnabled: false, snapshotPath, snapshotIntervalMs: 1000 },
      services
    )

    service.start()
    service.requestWrite()
    assert.equal(service.writeNow(), false)
    service.stop()

    assert.equal(fs.existsSync(path.dirname(snapshotPath)), false)
  })
})

test('enabled service writes on start and reports write failures without throwing', () => {
  withDatabase((services) => {
    const snapshotPath = path.join(services.directory, 'out', 'snapshot.json')
    const service = createOmarchyService(
      { snapshotEnabled: true, snapshotPath, snapshotIntervalMs: 60000 },
      services
    )

    service.start()
    service.stop()
    assert.equal(JSON.parse(fs.readFileSync(snapshotPath, 'utf8')).schemaVersion, 1)

    const blocker = path.join(services.directory, 'blocker')
    fs.writeFileSync(blocker, '')
    const warnings = []
    const broken = createOmarchyService(
      {
        snapshotEnabled: true,
        snapshotPath: path.join(blocker, 'snapshot.json'),
        snapshotIntervalMs: 60000
      },
      services,
      { log: { warn: (message) => warnings.push(message) } }
    )

    assert.equal(broken.writeNow(), false)
    assert.equal(broken.writeNow(), false)
    assert.equal(warnings.length, 1)
  })
})

test('requestWrite debounces bursts into one write', async () => {
  await withDatabase(async (services) => {
    const snapshotPath = path.join(services.directory, 'snapshot.json')
    let calls = 0
    const service = createOmarchyService(
      { snapshotEnabled: true, snapshotPath, snapshotIntervalMs: 60000 },
      services,
      { debounceMs: 10, now: () => { calls += 1; return new Date() } }
    )

    service.requestWrite()
    service.requestWrite()
    service.requestWrite()
    assert.equal(fs.existsSync(snapshotPath), false)

    await new Promise((resolve) => setTimeout(resolve, 60))
    service.stop()

    assert.equal(calls, 1)
    assert.equal(fs.existsSync(snapshotPath), true)
  })
})

test('only successful snapshot-relevant mutations request a write', () => {
  assert.equal(changesSnapshot('POST', '/api/sessions'), true)
  assert.equal(changesSnapshot('POST', '/api/sessions/4/finish'), true)
  assert.equal(changesSnapshot('DELETE', '/api/sessions/4'), true)
  assert.equal(changesSnapshot('PATCH', '/api/sessions/4/sets/9'), true)
  assert.equal(changesSnapshot('POST', '/api/quick-workout/start'), true)
  assert.equal(changesSnapshot('POST', '/api/body-weight'), true)
  assert.equal(changesSnapshot('DELETE', '/api/body-weight/3'), true)
  assert.equal(changesSnapshot('PATCH', '/api/programs/2'), true)
  assert.equal(changesSnapshot('POST', '/api/backup/database'), true)

  assert.equal(changesSnapshot('GET', '/api/sessions'), false)
  assert.equal(changesSnapshot('PATCH', '/api/sessions/4'), false)
  assert.equal(changesSnapshot('POST', '/api/sessions/4/sets'), false)
  assert.equal(changesSnapshot('GET', '/api/backup/database'), false)
  assert.equal(changesSnapshot('PATCH', '/api/profile'), false)

  let requested = 0
  const routes = createOmarchyRoutes({ requestWrite: () => { requested += 1 } })
  const respond = (method, pathname, statusCode) => {
    const res = Object.assign(new EventEmitter(), { statusCode })
    routes.observe({ method }, res, { pathname })
    res.emit('finish')
  }

  respond('POST', '/api/sessions/4/finish', 200)
  respond('POST', '/api/sessions/4/finish', 404)
  respond('GET', '/api/sessions', 200)

  assert.equal(requested, 1)
})

test('snapshot configuration is off by default and validates the interval', () => {
  withEnv({
    SETRAI_OMARCHY_SNAPSHOT_ENABLED: undefined,
    SETRAI_OMARCHY_SNAPSHOT_PATH: undefined,
    SETRAI_OMARCHY_SNAPSHOT_INTERVAL_MS: undefined,
    XDG_DATA_HOME: '/tmp/xdg-data'
  }, () => {
    assert.deepEqual(loadConfig().omarchy, {
      snapshotEnabled: false,
      snapshotPath: '/tmp/xdg-data/setrai/snapshot.json',
      snapshotIntervalMs: 300000
    })
  })

  withEnv({
    SETRAI_OMARCHY_SNAPSHOT_ENABLED: 'true',
    SETRAI_OMARCHY_SNAPSHOT_PATH: '/snapshot/snapshot.json',
    SETRAI_OMARCHY_SNAPSHOT_INTERVAL_MS: '60000'
  }, () => {
    assert.deepEqual(loadConfig().omarchy, {
      snapshotEnabled: true,
      snapshotPath: '/snapshot/snapshot.json',
      snapshotIntervalMs: 60000
    })
  })

  withEnv({ SETRAI_OMARCHY_SNAPSHOT_INTERVAL_MS: '50' }, () => {
    assert.throws(() => loadConfig(), /SETRAI_OMARCHY_SNAPSHOT_INTERVAL_MS/)
  })
})
