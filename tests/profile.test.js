import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { openDatabase } from '../src/server/db/connection.js'
import { createProfileService } from '../src/server/profile/service.js'

function createTestDatabase() {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'setrai-test-')
  )
  const dbPath = path.join(directory, 'test.db')
  const db = openDatabase(dbPath)

  return { db, dbPath, directory }
}

function cleanupDatabase(db, directory) {
  db.close()
  fs.rmSync(directory, {
    recursive: true,
    force: true
  })
}

const DEFAULT_PROFILE = {
  displayName: '',
  avatarUrl: '',
  weightUnit: 'kg',
  trainingGoal: 'general-fitness',
  equipment: [],
  heightCm: null,
  targetWeightKg: null
}

test('returns default profile on a fresh database', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createProfileService(db)
    assert.deepEqual(service.getProfile(), DEFAULT_PROFILE)
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('updates display name', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createProfileService(db)
    const profile = service.updateProfile({
      displayName: ' Alex '
    })

    assert.equal(profile.displayName, 'Alex')
    assert.equal(profile.weightUnit, 'kg')
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('updates avatar URL', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createProfileService(db)
    const profile = service.updateProfile({
      avatarUrl: ' https://example.com/avatar.png '
    })

    assert.equal(
      profile.avatarUrl,
      'https://example.com/avatar.png'
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('updates weight unit', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createProfileService(db)
    const profile = service.updateProfile({
      weightUnit: 'lb'
    })

    assert.equal(profile.weightUnit, 'lb')
    assert.equal(service.getWeightUnit(), 'lb')
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('rejects invalid weight unit', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createProfileService(db)

    assert.throws(
      () => service.updateProfile({ weightUnit: 'stone' }),
      /Invalid weight unit/
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('updates body metrics for statistics body tab', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createProfileService(db)
    const profile = service.updateProfile({
      heightCm: 180,
      targetWeightKg: 74.25
    })

    assert.equal(profile.heightCm, 180)
    assert.equal(profile.targetWeightKg, 74.3)
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('clears and validates body metrics', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createProfileService(db)
    service.updateProfile({ heightCm: 180, targetWeightKg: 80 })
    assert.deepEqual(
      service.updateProfile({ heightCm: null, targetWeightKg: null }),
      DEFAULT_PROFILE
    )
    assert.throws(
      () => service.updateProfile({ heightCm: 90 }),
      /heightCm is out of range/
    )
    assert.throws(
      () => service.updateProfile({ targetWeightKg: 'heavy' }),
      /targetWeightKg must be numeric/
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('updates training goal as a normalized string', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createProfileService(db)
    const profile = service.updateProfile({
      trainingGoal: 'General Fitness'
    })

    assert.equal(profile.trainingGoal, 'general-fitness')
    assert.equal(
      service.getTrainingGoal(),
      'general-fitness'
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('rejects empty and unknown training goals', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createProfileService(db)
    assert.throws(() => service.updateProfile({ trainingGoal: '' }), /Invalid training goal/)
    assert.throws(() => service.updateProfile({ trainingGoal: 'powerlifting' }), /Invalid training goal/)
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('updates and normalizes equipment', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createProfileService(db)
    const profile = service.updateProfile({
      equipment: [
        ' Dumbbells ',
        'bench',
        'dumbbells',
        '',
        'Cable Machine'
      ]
    })

    assert.deepEqual(
      profile.equipment,
      ['bench', 'cable-machine', 'dumbbells']
    )
    assert.deepEqual(
      service.getEquipment(),
      ['bench', 'cable-machine', 'dumbbells']
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('partial updates preserve existing profile values', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createProfileService(db)
    service.updateProfile({
      displayName: 'Alex',
      weightUnit: 'lb',
      equipment: ['bench']
    })

    const profile = service.updateProfile({
      trainingGoal: 'strength'
    })

    assert.equal(profile.displayName, 'Alex')
    assert.equal(profile.weightUnit, 'lb')
    assert.deepEqual(profile.equipment, ['bench'])
    assert.equal(profile.trainingGoal, 'strength')
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('values persist after recreating the service', () => {
  const { db, dbPath, directory } = createTestDatabase()

  try {
    const firstService = createProfileService(db)
    firstService.updateProfile({
      displayName: 'Alex',
      weightUnit: 'lb',
      equipment: ['barbell']
    })

    db.close()
    const reopenedDb = openDatabase(dbPath)

    try {
      const secondService = createProfileService(reopenedDb)
      const profile = secondService.getProfile()

      assert.equal(profile.displayName, 'Alex')
      assert.equal(profile.weightUnit, 'lb')
      assert.deepEqual(profile.equipment, ['barbell'])
    } finally {
      reopenedDb.close()
    }
  } finally {
    fs.rmSync(directory, {
      recursive: true,
      force: true
    })
  }
})

test('rejects unknown and invalid fields', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createProfileService(db)

    assert.throws(
      () => service.updateProfile({ unsupportedField: 'value' }),
      /Unknown profile field/
    )
    assert.throws(
      () => service.updateProfile({ displayName: {} }),
      /displayName must be a string/
    )
    assert.throws(
      () => service.updateProfile({ avatarUrl: [] }),
      /avatarUrl must be a string/
    )
    assert.throws(
      () => service.updateProfile({ equipment: 'bench' }),
      /equipment must be an array/
    )
    assert.throws(
      () => service.updateProfile({ equipment: ['bench', 1] }),
      /equipment values must be strings/
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('profile does not expose raw settings storage format', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createProfileService(db)
    service.updateProfile({
      displayName: 'Alex',
      equipment: ['bench']
    })

    const profile = service.getProfile()

    assert.equal('profile.displayName' in profile, false)
    assert.equal('value' in profile, false)
    assert.deepEqual(Object.keys(profile).sort(), [
      'avatarUrl',
      'displayName',
      'equipment',
      'heightCm',
      'targetWeightKg',
      'trainingGoal',
      'weightUnit'
    ])
  } finally {
    cleanupDatabase(db, directory)
  }
})
