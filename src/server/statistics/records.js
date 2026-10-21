import {
  estimateOneRepMax,
  roundMetric
} from './one-rep-max.js'

function candidateTime(item) {
  return item.session.finishedAt || item.set.loggedAt || ''
}

export function calculatePersonalRecords(volumeSets) {
  const grouped = new Map()

  for (const item of volumeSets) {
    const estimated = estimateOneRepMax(
      Number(item.set.weight),
      Number(item.set.reps)
    )
    if (estimated === null) continue

    const key = item.set.exerciseSlug || `exercise-${item.set.exerciseId}`
    const group = grouped.get(key) ?? {
      exerciseSlug: item.set.exerciseSlug,
      exerciseName: item.set.exerciseName,
      candidates: []
    }
    group.candidates.push({
      sessionId: item.session.id,
      achievedAt: candidateTime(item),
      weight: Number(item.set.weight),
      reps: Number(item.set.reps),
      estimated1RM: roundMetric(estimated)
    })
    grouped.set(key, group)
  }

  const records = [...grouped.values()].map((group) => {
    const candidates = [...group.candidates].sort((a, b) =>
      a.achievedAt.localeCompare(b.achievedAt) ||
      a.sessionId - b.sessionId
    )
    const best = candidates.reduce((record, candidate) =>
      candidate.estimated1RM > record.estimated1RM ? candidate : record
    )
    const previous = candidates
      .filter(candidate => candidate.sessionId !== best.sessionId && candidate.achievedAt <= best.achievedAt)
      .reduce((record, candidate) => !record || candidate.estimated1RM > record.estimated1RM ? candidate : record, null)

    return {
      exerciseSlug: group.exerciseSlug,
      exerciseName: group.exerciseName,
      maxWeight: Math.max(...candidates.map(candidate => candidate.weight)),
      estimated1RM: best.estimated1RM,
      recordWeight: best.weight,
      recordReps: best.reps,
      achievedAt: best.achievedAt,
      previousEstimated1RM: previous?.estimated1RM ?? null,
      improvement: previous ? roundMetric(best.estimated1RM - previous.estimated1RM) : null
    }
  })

  return records.sort((a, b) =>
    a.exerciseName.localeCompare(b.exerciseName) ||
    a.exerciseSlug.localeCompare(b.exerciseSlug)
  )
}
