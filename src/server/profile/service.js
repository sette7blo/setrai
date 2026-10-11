// src/server/profile/service.js

import {
  createSettingsRepository
} from '../db/repositories/settings.js'

const PROFILE_KEYS = {
  displayName: 'profile.displayName',
  avatarUrl: 'profile.avatarUrl',
  weightUnit: 'profile.weightUnit',
  trainingGoal: 'profile.trainingGoal',
  equipment: 'profile.equipment',
  heightCm: 'profile.heightCm',
  targetWeightKg: 'profile.targetWeightKg'
}

const DEFAULT_PROFILE = {
  displayName: '',
  avatarUrl: '',
  weightUnit: 'kg',
  trainingGoal: '',
  equipment: [],
  heightCm: null,
  targetWeightKg: null
}

const ALLOWED_FIELDS = new Set(
  Object.keys(DEFAULT_PROFILE)
)

function clientError(message) {
  const error = new Error(message)
  error.statusCode = 400
  return error
}

function trimString(value, field, maxLength) {
  if (value === undefined || value === null) {
    return ''
  }

  if (typeof value !== 'string') {
    throw clientError(`${field} must be a string`)
  }

  const trimmed = value.trim()

  if (trimmed.length > maxLength) {
    throw clientError(`${field} is too long`)
  }

  return trimmed
}

function normalizeEquipment(equipment) {
  if (!Array.isArray(equipment)) {
    throw clientError('equipment must be an array')
  }

  if (equipment.some((item) => typeof item !== 'string')) {
    throw clientError('equipment values must be strings')
  }

  return [...new Set(
    equipment
      .map((item) => item.trim().toLowerCase())
      .map((item) => item.replace(/\s+/g, '-'))
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b))
}

function normalizeOptionalNumber(value, field, { min, max }) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const number = Number(value)

  if (!Number.isFinite(number)) {
    throw clientError(`${field} must be numeric`)
  }

  if (number < min || number > max) {
    throw clientError(`${field} is out of range`)
  }

  return Math.round(number * 10) / 10
}

function normalizeField(field, value) {
  if (field === 'displayName') {
    return trimString(value, 'displayName', 80)
  }

  if (field === 'avatarUrl') {
    return trimString(value, 'avatarUrl', 500)
  }

  if (field === 'weightUnit') {
    const weightUnit = trimString(value, 'weightUnit', 8)

    if (!['kg', 'lb'].includes(weightUnit)) {
      throw clientError('Invalid weight unit')
    }

    return weightUnit
  }

  if (field === 'trainingGoal') {
    return trimString(value, 'trainingGoal', 80)
      .toLowerCase()
      .replace(/\s+/g, '-')
  }

  if (field === 'equipment') {
    return normalizeEquipment(value)
  }

  if (field === 'heightCm') {
    return normalizeOptionalNumber(value, 'heightCm', {
      min: 100,
      max: 250
    })
  }

  if (field === 'targetWeightKg') {
    return normalizeOptionalNumber(value, 'targetWeightKg', {
      min: 1,
      max: 500
    })
  }

  throw clientError(`Unknown profile field: ${field}`)
}

export function createProfileService(db) {
  const repository = createSettingsRepository(db)

  function getProfile() {
    const stored = repository.getMany(
      Object.values(PROFILE_KEYS)
    )

    return Object.fromEntries(
      Object.entries(PROFILE_KEYS).map(([field, key]) => [
        field,
        stored[key] ?? DEFAULT_PROFILE[field]
      ])
    )
  }

  function updateProfile(input) {
    validateKnownFields(input)

    for (const [field, value] of Object.entries(input)) {
      repository.set(
        PROFILE_KEYS[field],
        normalizeField(field, value)
      )
    }

    return getProfile()
  }

  function getEquipment() {
    return getProfile().equipment
  }

  function getWeightUnit() {
    return getProfile().weightUnit
  }

  function getTrainingGoal() {
    return getProfile().trainingGoal
  }

  function validateKnownFields(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw clientError('Profile update must be an object')
    }

    for (const field of Object.keys(input)) {
      if (!ALLOWED_FIELDS.has(field)) {
        throw clientError(`Unknown profile field: ${field}`)
      }
    }
  }

  return {
    getProfile,
    updateProfile,
    getEquipment,
    getWeightUnit,
    getTrainingGoal
  }
}
