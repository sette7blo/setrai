import {
  mapProgramExercise
} from './mapper.js'

function normalizeProgramExercise(input, position) {
  return {
    exercise_id: input.exerciseId,
    exercise_slug: input.exerciseSlug,
    position: input.position ?? position,
    sets: input.sets ?? 3,
    reps: input.reps ?? '8-12',
    rest_sec: input.restSeconds ?? input.rest_sec ?? 90,
    weight: input.targetWeight ?? input.weight ?? null,
    notes: input.notes ?? ''
  }
}

export function readProgramExercises(db, programId) {
  return db
    .prepare(`
      SELECT
        program_exercises.*,
        exercises.name AS exercise_name
      FROM program_exercises
      LEFT JOIN exercises
        ON exercises.id = program_exercises.exercise_id
      WHERE program_exercises.program_id = ?
      ORDER BY program_exercises.position ASC
    `)
    .all(programId)
    .map(mapProgramExercise)
}

export function replaceProgramExercises(
  db,
  programId,
  exercises
) {
  db.prepare(`
    DELETE FROM program_exercises
    WHERE program_id = ?
  `).run(programId)

  const insert = db.prepare(`
    INSERT INTO program_exercises (
      program_id,
      exercise_id,
      exercise_slug,
      position,
      sets,
      reps,
      rest_sec,
      weight,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  exercises
    .map(normalizeProgramExercise)
    .sort((a, b) => a.position - b.position)
    .forEach((exercise, index) => {
      insert.run(
        programId,
        exercise.exercise_id,
        exercise.exercise_slug,
        exercise.position ?? index,
        exercise.sets,
        exercise.reps,
        exercise.rest_sec,
        exercise.weight,
        exercise.notes
      )
    })

  return readProgramExercises(db, programId)
}
