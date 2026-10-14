// src/server/exercises/service.js
import { catalogBaseline, catalogUpdate } from './catalog-update.js'
import { normalizeExerciseWrite } from './write.js'
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
    const values = normalizeExerciseWrite(input, { partial: false })
    // Allow validated discovery/import callers to attach provenance on create.
    for (const key of [
      'slug',
      'source_type',
      'status',
      'nostr_event_id',
      'nostr_pubkey',
      'nostr_address',
      'nostr_published_at',
      'catalog_baseline'
    ]) {
      if (input?.[key] !== undefined && input?.[key] !== null && input?.[key] !== '') {
        values[key] = input[key]
      }
    }
    return repository.create(values)
  }

  // Accepts validated server-side discovery data; repeat imports preserve local edits.
  function importDiscoveredExercise(input) {
    if (!input.nostr_address || !input.nostr_event_id) throw new Error('Missing discovery provenance')
    const existing = repository.list({ status: null }).find(item => item.nostr_address === input.nostr_address)
    if (existing) return { exercise: existing, created: false }
    const exercise = repository.create(input)
    return { exercise: repository.update(exercise.id, { catalog_baseline: catalogBaseline(input) }), created: true }
  }

  function updateDiscoveredExercise(input, options = {}) {
    const existing = repository.list({ status: null }).find(item => item.nostr_address === input.nostr_address)
    if (!existing) return importDiscoveredExercise(input)
    if (existing.nostr_event_id === input.nostr_event_id && !options.replaceImage) return { exercise: existing, created: false }
    return { exercise: repository.update(existing.id, catalogUpdate(existing, input, options)), created: false }
  }

  function updateExercise(id, input) {
    return repository.update(id, normalizeExerciseWrite(input, { partial: true }))
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
    importDiscoveredExercise,
    updateDiscoveredExercise,
    updateExercise,
    setFavourite,
    deleteExercise,
    getExerciseCount,
    getPublishableExercise
  }
}
