// src/server/statistics/records.js

import {
  estimateOneRepMax,
  roundMetric
} from './one-rep-max.js'

function emptyRecord(set) {
  return {
    exerciseSlug: set.exerciseSlug,
    exerciseName: set.exerciseName,
    maxWeight: 0,
    estimated1RM: 0
  }
}

export function calculatePersonalRecords(volumeSets) {
  const records = new Map()

  for (const { set } of volumeSets) {
    const estimated = estimateOneRepMax(
      Number(set.weight),
      Number(set.reps)
    )

    if (estimated === null) {
      continue
    }

    const key = set.exerciseSlug || `exercise-${set.exerciseId}`
    const record = records.get(key) ?? emptyRecord(set)
    record.maxWeight = Math.max(
      record.maxWeight,
      Number(set.weight)
    )
    record.estimated1RM = Math.max(
      record.estimated1RM,
      roundMetric(estimated)
    )
    records.set(key, record)
  }

  return [...records.values()].sort((a, b) =>
    a.exerciseName.localeCompare(b.exerciseName) ||
    a.exerciseSlug.localeCompare(b.exerciseSlug)
  )
}
