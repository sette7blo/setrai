import { PROGRAM_KIND, selectPrograms } from './program-event.js'
import { WORKSTR_AUTHOR } from './exercise-event.js'
import { queryRelay } from './relay-query.js'

export function createProgramDiscovery(config, programService, exerciseDiscovery, query = queryRelay) {
  let cache = null
  let pending = null
  async function refresh() {
    const filters = [
      { kinds: [PROGRAM_KIND], authors: [WORKSTR_AUTHOR], limit: 200 },
      { kinds: [PROGRAM_KIND], '#t': ['beastmode', 'workstr-program'], limit: 200 }
    ]
    const results = await Promise.allSettled(config.relays.flatMap(relay => filters.map(filter => query(relay, filter))))
    if (results.every(result => result.status === 'rejected')) {
      const error = new Error('Unable to reach workout Discover. Please try again.')
      error.statusCode = 503
      throw error
    }
    cache = {
      fetchedAt: Date.now(), programs: selectPrograms(results.flatMap(result => result.status === 'fulfilled' ? result.value : [])),
      unavailableRelays: results.filter(result => result.status === 'rejected').length
    }
  }
  async function listPrograms({ force = false } = {}) {
    if (pending) await pending
    else if (force || !cache || Date.now() - cache.fetchedAt > 300000) {
      pending = refresh()
      try { await pending } finally { pending = null }
    }
    // Exercise catalog failures do not hide available programs.
    const catalog = await exerciseDiscovery.listExercises().catch(() => ({ exercises: [] }))
    const local = programService.listPrograms()
    return {
      ...cache, programs: cache.programs.map(program => ({
        ...program, localId: local.find(item => item.nostrAddress === program.address)?.id ?? null,
        updateAvailable: local.some(item => item.nostrAddress === program.address && item.nostrEventId !== program.eventId
          && (!item.nostrPublishedAt || Date.parse(item.nostrPublishedAt) <= program.createdAt * 1000)),
        exercises: program.exercises.map(member => {
          const official = member.address.startsWith('workstr:exercise:') || member.address.startsWith(`33401:${WORKSTR_AUTHOR}:workstr:exercise:`)
          const exercise = catalog.exercises.find(item => item.nostr_address === member.address || (official && item.slug === member.address.split(':').at(-1)))
            || (official && member.name ? catalog.exercises.find(item => item.name.toLowerCase() === member.name.toLowerCase()) : null)
          return { ...member, name: member.name || exercise?.name || member.address.split(':').at(-1).replace(/-/g, ' '),
            muscleGroup: member.muscleGroup || exercise?.muscle_group || '', imageUrl: member.imageUrl || exercise?.image_url || '',
            equipment: exercise?.equipment ?? [], muscles: exercise?.muscles ?? [] }
        })
      }))
    }
  }
  async function catalogProgram(eventId) {
    const catalog = await listPrograms()
    const program = catalog.programs.find(item => item.eventId === eventId)
    if (!program) {
      const error = new Error('Program is no longer in Discover. Refresh and try again.')
      error.statusCode = 404
      throw error
    }
    return program
  }
  async function importProgram(eventId, update = false) {
    const program = await catalogProgram(eventId)
    const existing = programService.listPrograms().find(item => item.nostrAddress === program.address)
    if (update && (!existing || Date.parse(existing.nostrPublishedAt) > program.createdAt * 1000)) {
      const error = new Error('This update is no longer available. Refresh workouts.')
      error.statusCode = 409
      throw error
    }
    const exercises = await exerciseDiscovery.listExercises().catch(() => ({ exercises: [] }))
    return update ? programService.updateDiscoveredProgram(program, exercises.exercises) : programService.importDiscoveredProgram(program, exercises.exercises)
  }
  return { listPrograms, importProgram, updateProgram: eventId => importProgram(eventId, true),
    reviewProgram: async eventId => programService.reviewDiscoveredProgram(await catalogProgram(eventId)) }
}
