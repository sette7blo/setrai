import { inputWeightToKg } from '../profile/weight-units.js'
import { action, node, exerciseHero, instructions, numberInput, loadLabel, countdown, paintCountdown, glyph, labeledAction } from './live-components.js'
import { clockValue, intervalPhase, timeLabel } from './live-plan.js'
import type { LiveModel, LiveActions } from './live-model.js'

export function renderEmom(model: LiveModel, controls: LiveActions, body: HTMLElement, footer: HTMLElement): void {
  const runtime = model.session.runtime ?? {}
  const position = clockValue(runtime).position
  const slot = model.intervals.find((item) => item.endsAt > position)
  const total = model.intervals.at(-1)?.endsAt ?? 0
  const phase = slot ? intervalPhase(slot, position) : null
  const firstStep = slot?.steps[phase?.stepIndex ?? 0] ?? model.intervals[0]?.steps[0]
  const exercise = model.session.plannedExercises.find((item) => item.exerciseSlug === firstStep?.exerciseSlug)
  body.append(exerciseHero(exercise))
  if (!runtime.emomStartedAt || !slot) {
    const card = node('section', 'live-transition')
    const eyebrow = node('p', 'live-eyebrow', runtime.emomStartedAt ? 'EMOM complete' : 'EMOM next')
    if (runtime.emomStartedAt) eyebrow.prepend(glyph('check'))
    card.append(
      eyebrow,
      node('h2', '', `${timeLabel(total)} · ${model.intervals.length} intervals`),
      node('p', '', runtime.emomStartedAt ? 'Review your logged work, then finish your session.' : 'Start the clock when you’re ready. Log actual reps separately from timed targets.'),
    )
    body.append(card)
    footer.append(
      runtime.emomStartedAt
        ? labeledAction('check', 'Finish session', controls.finish, 'live-primary')
        : labeledAction('play', 'Start EMOM', controls.startEmom, 'live-primary'),
    )
    return
  }
  const status = node('section', 'live-emom-status')
  status.append(node('p', 'live-eyebrow', runtime.emomRunningSince == null ? 'Paused' : phase!.label))
  const ring = countdown()
  ring.setAttribute('role', 'timer')
  ring.setAttribute('aria-label', 'Seconds remaining')
  ring.dataset.emomClock = ''
  if (slot.steps.every((step) => (step.targetDurationSec ?? 0) > 0)) {
    ring.querySelector('svg')!.insertAdjacentHTML('beforeend', '<circle class="live-work-ring-bg" cx="60" cy="60" r="42"/><circle class="live-work-ring" cx="60" cy="60" r="42" stroke-dasharray="263.9"/>')
  }
  paintCountdown(ring, phase!.remaining, (slot.endsAt - position) / slot.duration)
  const meta = node('div', 'live-emom-meta')
  meta.append(node('p', '', `${firstStep?.targetDurationSec ? `${firstStep.targetDurationSec}s` : `${firstStep?.targetReps || 'Open'} reps`} target · every ${slot.duration}s`),
    node('p', '', `${Math.ceil(slot.endsAt - position)}s left · ${slot.index + 1}/${model.intervals.length}`))
  status.append(ring, meta)
  body.append(status)
  const panel = node('section', 'live-interval-logs')
  slot.steps.forEach((step, stepIndex) => {
    const entry = model.session.plannedExercises.find((item) => item.exerciseSlug === step.exerciseSlug)
    const saved = model.session.sets.find((set) => set.blockIndex === slot.blockIndex && set.roundIndex === slot.roundIndex && set.intervalIndex === slot.intervalIndex && set.stepIndex === stepIndex)
    const row = node('div', 'live-interval-row')
    if (saved) {
      const heading = node('h3', '', 'Logged')
      heading.prepend(glyph('check'))
      row.append(heading)
    } else {
      row.append(node('h3', '', 'Log this interval'))
    }
    if (slot.steps.length > 1) row.append(node('p', 'live-muted', entry?.exerciseName || step.exerciseName || step.exerciseSlug))
    if (saved) {
      const done = node('p', 'live-interval-done', `Logged · ${saved.reps || '—'} reps · ${loadLabel(saved.weight, model.unit)} ${model.unit}${saved.durationSec ? ` · ${saved.durationSec}s` : ''}`)
      done.prepend(glyph('check'))
      row.append(done)
    } else if (phase!.stepIndex === null || phase!.stepIndex === stepIndex) {
      const key = `interval:${slot.index}:${stepIndex}`
      if (!model.drafts.has(key)) model.drafts.set(key, { reps: '', weight: '' })
      const draft = model.drafts.get(key)!
      const inputs = node('div', 'live-interval-inputs')
      const reps = numberInput('Actual reps', draft.reps, 'reps', (value) => { draft.reps = value })
      reps.placeholder = 'Actual reps'
      const weight = numberInput(`Load in ${model.unit}`, draft.weight, 'weight', (value) => { draft.weight = value })
      weight.placeholder = `Load ${model.unit}`
      const repsLabel = node('label', '')
      repsLabel.append(node('span', '', 'Actual reps'), reps)
      const loadField = node('label', '')
      loadField.append(node('span', '', `Load ${model.unit}`), weight)
      inputs.append(repsLabel, loadField)
      row.append(inputs, labeledAction('check', 'Log interval', () => {
        const value = draft.reps.trim() ? Number(draft.reps) : 0
        const load = draft.weight.trim() ? inputWeightToKg(Number(draft.weight), model.unit) : null
        if (!Number.isInteger(value) || value < 0 || (!value && !step.targetDurationSec) || (load !== null && (!Number.isFinite(load) || load < 0))) {
          model.error = 'Enter actual reps, or log the timed work, with a valid load.'
          controls.render()
          return
        }
        controls.log({ exerciseId: entry?.exerciseId ?? 0, setNumber: slot.roundIndex + 1, reps: value,
          weight: load, done: true, blockIndex: slot.blockIndex, roundIndex: slot.roundIndex,
          intervalIndex: slot.intervalIndex, stepIndex, ...(step.targetDurationSec ? { durationSec: step.targetDurationSec } : {}) })
      }, 'live-primary'))
    } else row.append(node('p', 'live-muted', 'Coming up in this interval'))
    panel.append(row)
  })
  body.append(panel)
  const next = model.intervals[slot.index + 1]
  body.append(node('p', 'live-next-up', next ? `Next up · ${next.steps.map((step) => model.session.plannedExercises.find((item) => item.exerciseSlug === step.exerciseSlug)?.exerciseName || step.exerciseName || step.exerciseSlug).join(' + ')}` : 'Next up · Finish session'), instructions(exercise, model.openInstructions))
  footer.append(
    labeledAction(runtime.emomRunningSince == null ? 'play' : 'pause', runtime.emomRunningSince == null ? 'Resume' : 'Pause', controls.pause, 'live-primary'),
    action('Finish early', controls.finish, 'live-early'),
  )
}
