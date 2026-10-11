import { EXERCISE_KIND, WORKSTR_AUTHOR, selectExercises } from './exercise-event.js'
import { queryRelay } from './relay-query.js'

export function createDiscoveryService(config, exerciseService, query = queryRelay) {
  let cache = null
  let pending = null
  async function refresh() {
    const results = await Promise.allSettled(config.relays.map(relay => query(relay, {
      kinds: [EXERCISE_KIND], authors: [WORKSTR_AUTHOR], limit: 500
    })))
    if (results.every(result => result.status === 'rejected')) {
      const error = new Error('Unable to reach the exercise catalog. Please try again.')
      error.statusCode = 503
      throw error
    }
    cache = {
      fetchedAt: Date.now(),
      exercises: selectExercises(results.flatMap(result => result.status === 'fulfilled' ? result.value : [])),
      unavailableRelays: results.filter(result => result.status === 'rejected').length
    }
    return cache
  }
  async function listExercises({ force = false } = {}) {
    if (pending) await pending
    else if (force || !cache || Date.now() - cache.fetchedAt > 300000) {
      pending = refresh()
      try { await pending } finally { pending = null }
    }
    const local = exerciseService.listExercises()
    return {
      ...cache,
      exercises: cache.exercises.map(exercise => {
        const saved = local.find(item => item.nostr_address === exercise.nostr_address)
        return { ...exercise, localId: saved?.id ?? null,
          updateAvailable: Boolean(saved && saved.nostr_event_id !== exercise.nostr_event_id) }
      })
    }
  }
  async function importExercise(eventId, update = false, options = {}) {
    const catalog = await listExercises()
    const exercise = catalog.exercises.find(item => item.nostr_event_id === eventId)
    if (!exercise) {
      const error = new Error('Exercise is no longer in the catalog. Refresh Discover and try again.')
      error.statusCode = 404
      throw error
    }
    return update ? exerciseService.updateDiscoveredExercise(exercise, options) : exerciseService.importDiscoveredExercise(exercise)
  }
  return { listExercises, importExercise, updateExercise: (eventId, options) => importExercise(eventId, true, options) }
}
