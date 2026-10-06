// src/server/statistics/one-rep-max.js

export function estimateOneRepMax(weight, reps) {
  if (
    !Number.isFinite(weight) ||
    !Number.isFinite(reps) ||
    weight <= 0 ||
    reps <= 0
  ) {
    return null
  }

  return weight * (1 + reps / 30)
}

export function roundMetric(value) {
  return Number(value.toFixed(2))
}
