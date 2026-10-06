import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { openDatabase } from '../src/server/db/connection.js'
import { createBodyService } from '../src/server/body/service.js'

function createTestDatabase() {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'setrai-test-')
  )
  const db = openDatabase(
    path.join(directory, 'test.db')
  )

  return { db, directory }
}

function cleanupDatabase(db, directory) {
  db.close()
  fs.rmSync(directory, {
    recursive: true,
    force: true
  })
}

test('creates a body-weight entry', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createBodyService(db)
    const entry = service.saveBodyWeight({
      date: '2026-10-05',
      weightKg: 82.4,
      notes: 'Morning'
    })

    assert.equal(entry.date, '2026-10-05')
    assert.equal(entry.weightKg, 82.4)
    assert.equal(entry.notes, 'Morning')
    assert.ok(entry.createdAt)
    assert.ok(entry.updatedAt)
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('retrieves an entry by ID', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createBodyService(db)
    const entry = service.saveBodyWeight({
      date: '2026-10-05',
      weightKg: 82.4
    })

    assert.deepEqual(
      service.getBodyWeight(entry.id),
      entry
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('retrieves an entry by date', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createBodyService(db)
    const entry = service.saveBodyWeight({
      date: '2026-10-05',
      weightKg: 82.4
    })

    assert.equal(
      service.getBodyWeightByDate('2026-10-05').id,
      entry.id
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('returns the latest entry by date', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createBodyService(db)
    service.saveBodyWeight({
      date: '2026-10-04',
      weightKg: 83
    })
    const latest = service.saveBodyWeight({
      date: '2026-10-05',
      weightKg: 82.4
    })

    assert.equal(service.getLatestBodyWeight().id, latest.id)
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('lists history by date descending', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createBodyService(db)
    service.saveBodyWeight({
      date: '2026-10-03',
      weightKg: 83.1
    })
    service.saveBodyWeight({
      date: '2026-10-05',
      weightKg: 82.4
    })
    service.saveBodyWeight({
      date: '2026-10-04',
      weightKg: 82.9
    })

    assert.deepEqual(
      service.listBodyWeight().map((entry) => entry.date),
      ['2026-10-05', '2026-10-04', '2026-10-03']
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('updates weight and notes', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createBodyService(db)
    const entry = service.saveBodyWeight({
      date: '2026-10-05',
      weightKg: 82.4,
      notes: ''
    })

    const updated = service.updateBodyWeight(
      entry.id,
      {
        weightKg: 82.1,
        notes: 'After deload'
      }
    )

    assert.equal(updated.weightKg, 82.1)
    assert.equal(updated.notes, 'After deload')
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('upserts an existing date instead of duplicating', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createBodyService(db)
    const first = service.saveBodyWeight({
      date: '2026-10-05',
      weightKg: 82.4
    })
    const second = service.saveBodyWeight({
      date: '2026-10-05',
      weightKg: 82.0,
      notes: 'Updated'
    })

    assert.equal(second.id, first.id)
    assert.equal(second.weightKg, 82.0)
    assert.equal(second.notes, 'Updated')
    assert.equal(service.listBodyWeight().length, 1)
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('deletes an entry', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createBodyService(db)
    const entry = service.saveBodyWeight({
      date: '2026-10-05',
      weightKg: 82.4
    })

    assert.equal(service.deleteBodyWeight(entry.id), true)
    assert.equal(service.getBodyWeight(entry.id), null)
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('rejects invalid dates', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createBodyService(db)

    assert.throws(
      () => service.saveBodyWeight({
        date: '2026-13-40',
        weightKg: 82.4
      }),
      /Invalid body-weight date/
    )

    assert.throws(
      () => service.saveBodyWeight({
        date: '10/05/2026',
        weightKg: 82.4
      }),
      /Invalid body-weight date/
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('rejects zero and negative weights', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createBodyService(db)

    assert.throws(
      () => service.saveBodyWeight({
        date: '2026-10-05',
        weightKg: 0
      }),
      /greater than zero/
    )

    assert.throws(
      () => service.saveBodyWeight({
        date: '2026-10-05',
        weightKg: -1
      }),
      /greater than zero/
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('rejects malformed weights', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createBodyService(db)

    assert.throws(
      () => service.saveBodyWeight({
        date: '2026-10-05',
        weightKg: 'not-a-number'
      }),
      /Weight must be numeric/
    )

    assert.throws(
      () => service.saveBodyWeight({
        date: '2026-10-05',
        weightKg: Infinity
      }),
      /Weight must be numeric/
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('filters history by date range', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createBodyService(db)
    service.saveBodyWeight({ date: '2026-10-03', weightKg: 83.1 })
    service.saveBodyWeight({ date: '2026-10-04', weightKg: 82.9 })
    service.saveBodyWeight({ date: '2026-10-05', weightKg: 82.4 })

    assert.deepEqual(
      service.listBodyWeight({
        from: '2026-10-04',
        to: '2026-10-05'
      }).map((entry) => entry.date),
      ['2026-10-05', '2026-10-04']
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})
