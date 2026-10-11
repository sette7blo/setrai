import { displayWeightFromKg, inputWeightToKg } from '../profile/weight-units.js'
import { action, node, exerciseHero, instructions, numberInput, loadLabel, glyph } from './live-components.js'
import { nextSet, setCount, strengthSets, supersetNext } from './live-plan.js'
import type { LiveModel, LiveActions } from './live-model.js'

export function renderStrength(model: LiveModel, controls: LiveActions, body: HTMLElement, footer: HTMLElement): void {
  const index = model.session.runtime?.exerciseIndex ?? 0
  const exercise = model.exercises[index]
  if (!exercise) {
    body.append(node('h2', '', 'No planned exercises available'))
    footer.append(action('Finish session', controls.finish, 'live-primary'))
    return
  }
  body.append(exerciseHero(exercise))
  const count = setCount(model.session, exercise)
  const number = nextSet(model.session, exercise)
  const timed = /\d\s*(s|sec|second)/i.test(exercise.reps)
  const targets = node('div', 'live-targets')
  for (const [tileIndex, [value, label]] of [[String(count), count === 1 ? 'set' : 'sets'], [exercise.reps, timed ? 'time' : 'reps'], [`${exercise.restSec}s`, 'rest']].entries()) {
    const tile = node('div', 'live-target')
    const icon = node('span', 'live-target-icon')
    icon.append(glyph(tileIndex === 0 ? 'sets' : tileIndex === 1 ? 'reps' : 'rest'))
    const copy = node('div', '')
    copy.append(node('strong', '', value), node('span', '', label))
    tile.append(icon, copy)
    targets.append(tile)
  }
  body.append(targets)
  if (exercise.notes) body.append(node('p', 'live-note', exercise.notes))
  const plan = node('section', 'live-set-plan')
  const heading = node('h2', '', 'Sets')
  heading.prepend(glyph('list'))
  plan.append(heading)
  const headings = node('div', 'live-set-row live-set-head')
  headings.append(node('span', ''), node('span', '', timed ? 'Time sec' : 'Reps'), node('span', '', `Load ${model.unit}`), node('span', ''))
  plan.append(headings)
  const sets = strengthSets(model.session, exercise)
  const draftKey = `strength:${exercise.exerciseSlug}:${number}`
  const previous = sets.at(-1)
  if (!model.drafts.has(draftKey)) model.drafts.set(draftKey, {
    reps: String(previous?.durationSec ?? previous?.reps ?? exercise.reps.match(/\d+/)?.[0] ?? 8),
    weight: (previous?.weight ?? exercise.weight) == null ? '' : String(displayWeightFromKg(previous?.weight ?? exercise.weight!, model.unit))
  })
  const draft = model.drafts.get(draftKey)!
  for (let i = 1; i <= count; i++) {
    const saved = sets.find((set) => set.setNumber === i)
    const current = !saved && i === number
    const row = node('div', `live-set-row ${saved ? 'is-done' : current ? 'is-current' : 'is-upcoming'}`)
    row.append(node('span', 'live-set-number', String(i)))
    if (current) {
      row.append(numberInput(`${timed ? 'Seconds' : 'Reps'} for set ${i}`, draft.reps, 'reps', (value) => { draft.reps = value }),
        numberInput(`Load in ${model.unit} for set ${i}`, draft.weight, 'weight', (value) => { draft.weight = value }))
      const status = node('span', 'live-set-status', 'Current')
      status.prepend(glyph('target'))
      row.append(status)
    } else {
      row.append(node('strong', 'live-set-value', saved ? String(saved.durationSec ?? saved.reps) : exercise.reps),
        node('strong', 'live-set-value', loadLabel(saved?.weight ?? exercise.weight, model.unit)))
      const status = saved ? action('Done', () => controls.edit(saved.id), 'live-set-status') : node('span', 'live-set-status', 'Next')
      if (saved) {
        status.prepend(glyph('check'))
        status.setAttribute('aria-label', `Edit set ${i}`)
      }
      row.append(status)
    }
    plan.append(row)
  }
  const add = action('Add set', () => controls.addSet(exercise), 'live-add')
  add.prepend(glyph('plus'))
  plan.append(add)
  body.append(plan, instructions(exercise, model.openInstructions))
  if (index === model.exercises.length - 1 && number > count) {
    const notes = node('label', 'live-session-notes')
    const input = node('textarea', '')
    input.rows = 2
    input.value = model.session.notes
    input.placeholder = 'Optional workout notes'
    input.addEventListener('input', () => { model.session.notes = input.value })
    notes.append(node('span', '', 'Workout notes'), input)
    body.append(notes)
  }
  if (index > 0) {
    const previous = action('‹', () => controls.jump(index - 1), 'live-prev')
    previous.setAttribute('aria-label', 'Previous exercise')
    footer.append(previous)
  }
  if (number <= count) {
    const button = action(`Log set ${number}`, () => {
      const reps = Number(draft.reps)
      const weight = draft.weight.trim() ? inputWeightToKg(Number(draft.weight), model.unit) : null
      if (!Number.isInteger(reps) || reps < 1 || (weight !== null && (!Number.isFinite(weight) || weight < 0))) {
        model.error = 'Enter a positive whole number and a valid load.'
        controls.render()
        return
      }
      const transition = supersetNext(model.session, exercise, number)
      controls.log({ exerciseId: exercise.exerciseId, setNumber: number, reps: timed ? 0 : reps,
        weight, done: true, ...(timed ? { durationSec: reps } : {}),
        ...(transition ? { blockIndex: transition.blockIndex, roundIndex: transition.roundIndex, stepIndex: transition.stepIndex } : {}) }, exercise)
    }, 'live-primary')
    button.prepend(glyph('check'))
    button.disabled = model.busy
    footer.append(button)
  } else if (index < model.exercises.length - 1) {
    footer.append(action('Next exercise →', () => controls.jump(index + 1), 'live-primary'))
  } else if (model.intervals.length) {
    footer.append(action('Start EMOM →', controls.startEmom, 'live-primary'), action('Finish early', controls.finish))
  } else footer.append(action('Finish session', controls.finish, 'live-primary live-finish'))
}
