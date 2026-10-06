// src/server/exercises/service.js

import {
  createExerciseRepository
} from '../db/repositories/exercises/index.js'

export function createExerciseService(db) {
  const repository = createExerciseRepository(db)

  function listExercises(filters = {}) {
    return repository.list(filters)
  }

  function getExercise(id) {
    return repository.getById(id)
  }

  function getExerciseBySlug(slug) {
    return repository.getBySlug(slug)
  }

  function createExercise(input) {
    return repository.create(input)
  }

  function updateExercise(id, input) {
    return repository.update(id, input)
  }

  function setFavourite(id, favourite) {
    return repository.setFavourite(id, favourite)
  }

  function deleteExercise(id) {
    return repository.remove(id)
  }

  function getExerciseCount() {
    return repository.count()
  }

  function getPublishableExercise(id) {
    const exercise = repository.getById(id)

    if (!exercise) {
      return null
    }

    return {
      slug: exercise.slug,
      name: exercise.name,
      description: exercise.description,
      category: exercise.category,
      muscleGroup: exercise.muscle_group,
      muscles: exercise.muscles,
      equipment: exercise.equipment,
      difficulty: exercise.difficulty,
      tags: exercise.tags,
      instructions: exercise.instructions,
      imageUrl:
        exercise.image_publish_url ||
        exercise.image_url
    }
  }

  return {
    listExercises,
    getExercise,
    getExerciseBySlug,
    createExercise,
    updateExercise,
    setFavourite,
    deleteExercise,
    getExerciseCount,
    getPublishableExercise
  }
}
