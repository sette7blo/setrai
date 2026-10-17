import {
  createBodyRepository
} from '../db/repositories/body.js'

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function clientError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function normalizeId(id) {
  const number = Number(id)

  if (!Number.isInteger(number) || number <= 0) {
    throw clientError('Invalid body-weight entry ID')
  }

  return number
}

function normalizeDate(date) {
  if (typeof date !== 'string' || !DATE_ONLY_PATTERN.test(date)) {
    throw clientError('Invalid body-weight date')
  }

  const parsed = new Date(`${date}T00:00:00.000Z`)

  if (Number.isNaN(parsed.getTime())) {
    throw clientError('Invalid body-weight date')
  }

  const normalized = parsed.toISOString().slice(0, 10)

  if (normalized !== date) {
    throw clientError('Invalid body-weight date')
  }

  return date
}

function normalizeWeight(weightKg) {
  const weight = Number(weightKg)

  if (!Number.isFinite(weight)) {
    throw clientError('Weight must be numeric')
  }

  if (weight <= 0) {
    throw clientError('Weight must be greater than zero')
  }

  return weight
}

function normalizeBodyInput(input, { partial = false } = {}) {
  const result = {}

  if (!partial || 'date' in input) {
    result.date = normalizeDate(input.date)
  }

  if (!partial || 'weightKg' in input) {
    if (!('weightKg' in input)) {
      throw clientError('Weight is required')
    }

    result.weightKg = normalizeWeight(input.weightKg)
  }

  if ('notes' in input || !partial) {
    result.notes = input.notes ?? ''
  }

  return result
}

export function createBodyService(db) {
  const repository = createBodyRepository(db)

  function listBodyWeight(filters = {}) {
    return repository.list(normalizeFilters(filters))
  }

  function getBodyWeight(id) {
    return repository.getById(normalizeId(id))
  }

  function getBodyWeightByDate(date) {
    return repository.getByDate(normalizeDate(date))
  }

  function getLatestBodyWeight() {
    return repository.getLatest()
  }

  function saveBodyWeight(input) {
    return repository.upsertByDate(
      normalizeBodyInput(input)
    )
  }

  function updateBodyWeight(id, input) {
    const entryId = normalizeId(id)
    const normalized = normalizeBodyInput(
      input,
      { partial: true }
    )

    const updated = repository.update(
      entryId,
      normalized
    )

    if (!updated) {
      throw clientError('Body-weight entry not found', 404)
    }

    return updated
  }

  function deleteBodyWeight(id) {
    const removed = repository.remove(normalizeId(id))

    if (!removed) {
      throw clientError('Body-weight entry not found', 404)
    }

    return true
  }

  function normalizeFilters(filters) {
    return {
      from: filters.from
        ? normalizeDate(filters.from)
        : null,
      to: filters.to
        ? normalizeDate(filters.to)
        : null
    }
  }

  return {
    listBodyWeight,
    getBodyWeight,
    getBodyWeightByDate,
    getLatestBodyWeight,
    saveBodyWeight,
    updateBodyWeight,
    deleteBodyWeight
  }
}
