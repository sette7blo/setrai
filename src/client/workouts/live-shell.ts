import { renderRest } from './live-rest-view.js'
import { action, node, paintCountdown, glyph } from './live-components.js'
import { clockValue, intervalPhase, nextSet, setCount, strengthSets, timeLabel } from './live-plan.js'
import { renderStrength } from './live-strength-view.js'
import { renderEmom } from './live-emom-view.js'
import type { LiveModel, LiveActions } from './live-model.js'

export function renderLiveShell(model: LiveModel, controls: LiveActions): HTMLElement {
  const runtime = model.session.runtime ?? {}
  const emom = runtime.mode === 'emom'
  const index = runtime.exerciseIndex ?? 0
  const position = clockValue(runtime).position
  const slot = model.intervals.find((item) => item.endsAt > position)
  const phase = slot ? intervalPhase(slot, position) : null
  const step = slot?.steps[phase?.stepIndex ?? 0]
  const current = emom ? model.session.plannedExercises.find((item) => item.exerciseSlug === step?.exerciseSlug) : model.exercises[index]
  const overlay = node('article', 'live-overlay')
  overlay.setAttribute('aria-label', 'Live training session')
  const header = node('header', 'live-header')
  const main = node('div', 'live-heading')
  const title = node('h1', '', emom && !runtime.emomStartedAt ? model.session.programName : current?.exerciseName || (emom ? 'EMOM' : model.session.programName))
  const meta = node('p', 'live-meta', emom ? `EMOM · Interval ${(slot?.index ?? 0) + 1}/${model.intervals.length}` : `${model.session.programName} · Exercise ${index + 1}/${model.exercises.length}`)
  const elapsed = node('span', 'live-elapsed', '00:00')
  elapsed.dataset.elapsed = ''
  elapsed.setAttribute('aria-label', 'Session elapsed time')
  main.append(title, meta, elapsed)
  const end = action('', controls.discard, 'live-end')
  end.append(glyph('close'))
  end.setAttribute('aria-label', 'End session')
  header.append(main, end)
  const progress = node('div', 'live-progress')
  progress.setAttribute('role', 'progressbar')
  progress.setAttribute('aria-label', 'Session progress')
  progress.setAttribute('aria-valuemin', '0')
  progress.setAttribute('aria-valuemax', '100')
  progress.append(node('div', 'live-progress-fill'))
  const rail = node('nav', 'live-rail')
  rail.setAttribute('aria-label', emom ? 'EMOM intervals' : 'Exercise sequence')
  if (emom) rail.classList.add('live-rail--emom')
  if (emom && runtime.emomStartedAt) {
    const start = model.intervalPage * 5
    const page = (delta: number) => { model.intervalPage += delta; controls.render() }
    if (start > 0) rail.append(action('‹', () => page(-1), 'live-pip'))
    for (const item of model.intervals.slice(start, start + 5)) {
      const button = action(String(item.index + 1), () => controls.seek(item.index), `live-pip ${slot?.index === item.index ? 'is-current' : position >= item.endsAt ? 'is-done' : ''}`)
      button.setAttribute('aria-label', `Go to interval ${item.index + 1}`)
      if (slot?.index === item.index) button.setAttribute('aria-current', 'step')
      rail.append(button)
    }
    if (start + 5 < model.intervals.length) rail.append(action('›', () => page(1), 'live-pip'))
  } else if (!emom) model.exercises.forEach((exercise, i) => {
    const done = nextSet(model.session, exercise) > setCount(model.session, exercise)
    const button = action(done ? '✓' : String(i + 1), () => controls.jump(i), `live-pip ${i === index ? 'is-current' : done ? 'is-done' : ''}`)
    button.setAttribute('aria-label', `Exercise ${i + 1}: ${exercise.exerciseName}`)
    if (i === index) button.setAttribute('aria-current', 'step')
    rail.append(button)
  })
  for (const button of rail.querySelectorAll('button')) {
    const mark = node('span', 'live-pip-mark', button.textContent ?? '')
    if (button.classList.contains('is-done')) { mark.textContent = ''; mark.append(glyph('check')) }
    button.replaceChildren(mark)
  }
  const body = node('div', 'live-body')
  const footer = node('footer', 'live-footer')
  if (emom) renderEmom(model, controls, body, footer)
  else renderStrength(model, controls, body, footer)
  if (model.error) {
    const error = node('p', 'live-error', model.error)
    error.setAttribute('role', 'alert')
    body.prepend(error)
  }
  if (model.busy) for (const button of footer.querySelectorAll('button')) button.disabled = true
  overlay.append(header, progress, rail, body, footer)
  if (runtime.restEndsAt && runtime.restEndsAt > Date.now()) {
    const rest = renderRest(model, controls)
    overlay.append(rest)
    for (const section of [header, rail, body, footer]) section.inert = true
  }
  return overlay
}

export function updateLiveClocks(overlay: HTMLElement, model: LiveModel, now = Date.now()): void {
  const runtime = model.session.runtime ?? {}
  const clock = clockValue(runtime, now)
  const parsed = new Date(model.session.startedAt.includes('T') ? model.session.startedAt : `${model.session.startedAt.replace(' ', 'T')}Z`).getTime()
  const strengthTime = runtime.emomStartedAt ? (model.exercises.length ? Math.max(0, (runtime.emomStartedAt - parsed) / 1000) : 0) : Math.max(0, (now - parsed) / 1000)
  const elapsed = overlay.querySelector<HTMLElement>('[data-elapsed]')
  if (elapsed) elapsed.textContent = `${timeLabel(strengthTime + (runtime.emomStartedAt ? clock.active : 0))}`
  const strengthTotal = model.exercises.reduce((sum, exercise) => sum + setCount(model.session, exercise), 0)
  const strengthDone = model.exercises.reduce((sum, exercise) => sum + Math.min(strengthSets(model.session, exercise).length, setCount(model.session, exercise)), 0)
  const intervalDone = model.intervals.filter((slot) => slot.endsAt <= clock.position).length
  const percent = (strengthTotal + model.intervals.length) ? (strengthDone + intervalDone) / (strengthTotal + model.intervals.length) * 100 : 0
  const fill = overlay.querySelector<HTMLElement>('.live-progress-fill')
  if (fill) fill.style.width = `${percent}%`
  overlay.querySelector('[role="progressbar"]')?.setAttribute('aria-valuenow', String(Math.round(percent)))
  const rest = overlay.querySelector<HTMLElement>('.live-rest')
  if (rest && runtime.restEndsAt) paintCountdown(rest, Math.ceil((runtime.restEndsAt - now) / 1000), (runtime.restEndsAt - now) / (1000 * (runtime.restDurationSec || 1)))
  const ring = overlay.querySelector<HTMLElement>('[data-emom-clock]')
  const slot = model.intervals.find((item) => item.endsAt > clock.position)
  if (ring && slot) {
    const phase = intervalPhase(slot, clock.position)
    paintCountdown(ring, phase.remaining, (slot.endsAt - clock.position) / slot.duration)
    const work = ring.querySelector<SVGCircleElement>('.live-work-ring')
    const workDuration = phase.stepIndex == null ? slot.duration - slot.steps.reduce((sum, step) => sum + (step.targetDurationSec ?? 0), 0) : slot.steps[phase.stepIndex].targetDurationSec ?? slot.duration
    if (work) work.style.strokeDashoffset = String(263.9 * (1 - Math.min(1, phase.remaining / Math.max(1, workDuration))))
    const left = overlay.querySelector<HTMLElement>('.live-emom-meta p:last-child')
    if (left) left.textContent = `${Math.ceil(slot.endsAt - clock.position)}s left · ${slot.index + 1}/${model.intervals.length}`
  }
}
