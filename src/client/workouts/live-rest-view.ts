import { action, countdown, glyph, labeledAction, node, paintCountdown } from './live-components.js'
import { nextSet, setCount } from './live-plan.js'
import type { LiveActions, LiveModel } from './live-model.js'

export function renderRest(model: LiveModel, controls: LiveActions): HTMLElement {
  const runtime = model.session.runtime ?? {}
  const rest = node('section', 'live-rest')
  rest.setAttribute('role', 'dialog')
  rest.setAttribute('aria-modal', 'true')
  rest.setAttribute('aria-label', 'Rest countdown')
  const heading = node('div', 'live-rest-heading')
  heading.append(glyph('rest'), node('h2', '', 'Take a breather'), node('p', '', 'A little recovery. Then back to it.'))
  const ring = countdown()
  ring.setAttribute('role', 'timer')
  ring.setAttribute('aria-label', 'Rest seconds remaining')
  paintCountdown(ring, Math.ceil(((runtime.restEndsAt ?? Date.now()) - Date.now()) / 1000),
    ((runtime.restEndsAt ?? Date.now()) - Date.now()) / (1000 * (runtime.restDurationSec || 1)))
  const next = model.exercises[runtime.restNextIndex ?? runtime.exerciseIndex ?? 0]
  const upcoming = node('div', 'live-next-up')
  const number = next ? nextSet(model.session, next) : 0
  const complete = !next || number > setCount(model.session, next)
  upcoming.append(node('small', '', 'Up next'),
    node('strong', '', complete ? model.intervals.length ? 'EMOM section' : 'Finish session' : next.exerciseName))
  if (!complete) upcoming.append(node('span', '', `Set ${number} of ${setCount(model.session, next)}`))
  const buttons = node('div', 'live-rest-actions')
  const minus = labeledAction('minus', '15s', () => controls.rest(-15))
  minus.setAttribute('aria-label', 'Rest 15 seconds less')
  const plus = labeledAction('plus', '15s', () => controls.rest(15))
  plus.setAttribute('aria-label', 'Rest 15 seconds more')
  const skip = labeledAction('arrowRight', 'Skip rest', () => controls.rest(null), 'live-finish', 'end')
  buttons.append(minus, skip, plus)
  rest.append(heading, ring, upcoming, buttons)
  rest.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); controls.rest(null) }
    if (event.key !== 'Tab') return
    if (event.shiftKey && document.activeElement === minus) { event.preventDefault(); plus.focus() }
    else if (!event.shiftKey && document.activeElement === plus) { event.preventDefault(); minus.focus() }
  })
  return rest
}
