const OFFICIAL_EXERCISE = /^33401:ef24246321e47dd16cec960d4d374703af78505d0e59c532b054b5060e372bd6:workstr:exercise:/

import { programSnapshot, programUpdateReview } from './catalog-update.js'

export function createProgramImporter(repository, exerciseService) {
  return function importDiscoveredProgram(input, catalog, update = false) {
    if (!input.address || !input.eventId) throw new Error('Missing program provenance')
    const existing = repository.list().find(program => program.nostrAddress === input.address)
    if (existing && (!update || existing.nostrEventId === input.eventId)) return { program: existing, created: false }
    const review = existing ? programUpdateReview(existing, input) : null
    const applyPlan = !existing || review.fields.find(field => field.field === 'plan').apply
    // Program and any missing exercises are committed together. No relay work occurs here.
    const program = repository.importWithExercises(() => {
      const exercises = applyPlan ? input.exercises.map((member, position) => {
        const slug = member.address.split(':').at(-1)
        const official = member.address.startsWith('workstr:exercise:') || OFFICIAL_EXERCISE.test(member.address)
        const local = exerciseService.listExercises({ status: null })
        const source = catalog.find(item => item.nostr_address === member.address || (official && item.slug === slug))
          || (official && member.name ? catalog.find(item => item.name.toLowerCase() === member.name.toLowerCase()) : null)
        const reference = `program-reference:${input.address}:${member.address}`
        let exercise = local.find(item => item.nostr_address === member.address || item.nostr_address === reference)
        // Official references can reuse local seed exercises; foreign addresses cannot.
        if (!exercise && official) exercise = local.find(item => item.slug === slug)
        if (!exercise && source) exercise = exerciseService.importDiscoveredExercise(source).exercise
        if (!exercise) {
          const name = member.name || slug.replace(/-/g, ' ')
          exercise = exerciseService.importDiscoveredExercise({
            name, slug, muscle_group: member.muscleGroup, muscles: member.muscleGroup ? [member.muscleGroup] : [],
            image_url: member.imageUrl, description: member.notes, instructions: [], equipment: [],
            default_sets: member.sets, default_reps: member.reps, default_rest: member.restSec,
            source_type: 'imported', nostr_address: reference, nostr_event_id: input.eventId,
            nostr_pubkey: input.pubkey, nostr_published_at: new Date(input.createdAt * 1000).toISOString()
          }).exercise
        }
        return {
          exerciseId: exercise.id, exerciseSlug: exercise.slug, position,
          sets: member.sets, reps: member.reps, restSeconds: member.restSec,
          targetWeight: member.weight, notes: member.notes
        }
      }) : existing.exercises
      // Remap block references if an imported exercise needed a collision-safe local slug.
      const slugs = new Map(applyPlan ? input.exercises.map((member, index) => [member.address.split(':').at(-1), exercises[index].exerciseSlug]) : [])
      const blocks = applyPlan ? input.blocks.map(block => {
        const remap = steps => steps.map(step => ({ ...step, exerciseSlug: slugs.get(step.exerciseSlug) || step.exerciseSlug }))
        return block.type === 'emom'
          ? { ...block, intervals: block.intervals.map(interval => ({ ...interval, steps: remap(interval.steps) })) }
          : { ...block, steps: remap(block.steps) }
      }) : existing.blocks
      const values = {
        name: input.name, slug: input.slug, description: input.description, difficulty: input.difficulty,
        tags: input.tags, blocks, exercises, nostrAddress: input.address, nostrEventId: input.eventId,
        nostrPubkey: input.pubkey, nostrPublishedAt: new Date(input.createdAt * 1000).toISOString()
      }
      if (!existing) return { ...values, catalogBaseline: programSnapshot(values) }
      const patch = { nostrEventId: values.nostrEventId, nostrPublishedAt: values.nostrPublishedAt,
        catalogBaseline: programSnapshot(applyPlan ? values : input) }
      for (const field of review.fields) {
        if (!field.apply) continue
        if (field.field === 'plan') { patch.exercises = exercises; patch.blocks = blocks }
        else patch[field.field] = values[field.field]
      }
      return patch
    }, existing?.id ?? null)
    return { program, created: !existing }
  }
}

