// src/server/exercises/service.js
import { normalizeExerciseWrite } from './write.js'
import {
  createExerciseRepository
} from '../db/repositories/exercises/index.js'

export function createExerciseService(db) {
  const repository = createExerciseRepository(db)
  function publicExercise(exercise) {
    if (!exercise) return null
    const local = { ...exercise }
    const image = local.image_url || ''
    local.image_url = /^\/(?:images|media\/exercises)\/[a-zA-Z0-9_./-]+$/.test(image)
      && !image.split('/').includes('..') ? image : ''
    return local
  }

  function listExercises(filters = {}) {
    return repository.list(filters).map(publicExercise)
  }

  function getExercise(id) {
    return publicExercise(repository.getById(id))
  }

  function getExerciseBySlug(slug) {
    return publicExercise(repository.getBySlug(slug))
  }

  function createExercise(input, options = {}) {
    const values = normalizeExerciseWrite(input, {
      partial: false,
      requireMovementType: options.requireMovementType === true
    })
    for (const key of [
      'slug',
      'source_type',
      'status'
    ]) {
      if (input?.[key] !== undefined && input?.[key] !== null && input?.[key] !== '') {
        values[key] = input[key]
      }
    }
    return publicExercise(repository.create(values))
  }


  function updateExercise(id, input) {
    return publicExercise(repository.update(id, normalizeExerciseWrite(input, { partial: true })))
  }

  function setFavourite(id, favourite) {
    return publicExercise(repository.setFavourite(id, favourite))
  }

  function deleteExercise(id) {
    return repository.remove(id)
  }

  function getExerciseCount() {
    return repository.count()
  }


  return {
    listExercises,
    getExercise,
    getExerciseBySlug,
    createExercise,

    updateExercise,
    setFavourite,
    deleteExercise,
    getExerciseCount
  }
}
