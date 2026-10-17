function parseJson(value, fallback = []) {
  if (!value) {
    return fallback
  }

  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function serializeJson(value) {
  return JSON.stringify(value ?? [])
}

export function mapProgramRow(row, exercises = []) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    difficulty: row.difficulty,
    tags: parseJson(row.tags),
    blocks: parseJson(row.blocks),
    isTemporary: Boolean(row.is_temporary),
    exercises,
    seedKey: row.seed_key ?? null,
    seedRevision: Number(row.seed_revision ?? 0),
    seedBaseline: parseJson(row.seed_baseline, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function mapProgramExercise(row) {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    exerciseSlug: row.exercise_slug,
    exerciseName: row.exercise_name ?? '',
    position: row.position,
    sets: row.sets,
    reps: row.reps,
    restSeconds: row.rest_sec,
    targetWeight: row.weight,
    notes: row.notes
  }
}

export function normalizeProgramInput(input) {
  return {
    name: input.name?.trim(),
    slug: input.slug,
    description: input.description ?? '',
    difficulty: input.difficulty ?? '',
    tags: serializeJson(input.tags ?? []),
    blocks: serializeJson(input.blocks ?? []),
    is_temporary: input.isTemporary ? 1 : 0,
    seed_key: input.seedKey ?? null,
    seed_revision: input.seedRevision ?? 0,
    seed_baseline: input.seedBaseline ? JSON.stringify(input.seedBaseline) : null
  }
}
